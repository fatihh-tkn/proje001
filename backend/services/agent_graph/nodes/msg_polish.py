"""
nodes/msg_polish.py
────────────────────────────────────────────────────────────────────
Mesaj Revize Botu — kullanıcıya gösterilmeden önce final_reply'ın
üslubunu/formatını profesyonelleştirir.

Yanıtı KİMİN ürettiğine göre revize bağlamı farklılaşır:
  • aggregator  → genel iyileştirme (akıcılık, imla)
  • rag_search  → teknik terimler ve kaynak referansları korunur
  • error_solver → teknik detaylar / hata adımları korunur
  • zli_finder  → rapor adları ve SQL terimleri korunur
  • n8n_trigger → kısa ve net otomasyon bildirimi

Sadece şu durumlarda çalışır:
  • state["needs_polish"] == True
  • final_reply boş değil ve JSON değil
  • msg_polish ajanının prompt'u dolu

Çıktı:
    {
      "final_reply":    str,
      "nodes_executed": ["msg_polish"],
      "node_timings":   {"msg_polish": ms},
    }
"""

from __future__ import annotations

import time

from fastapi.concurrency import run_in_threadpool

from core.logger import get_logger
from core.prompts import _get_prompt_template
from core.db_bridge import get_ai_agent, get_assigned_agent, get_agent_assignments
from ..state import AgentState, get_agent_config
from ..llm_adapter import call_llm, build_messages

try:
    from langgraph.config import get_stream_writer
except ImportError:  # pragma: no cover
    get_stream_writer = None  # type: ignore

logger = get_logger("agent_graph.msg_polish")


# ── Intent'e göre ek bağlam ipuçları ────────────────────────────────────────

_INTENT_HINTS: dict[str, str] = {
    "general":     (
        "Bu yanıt, SAP veya kurumsal süreçler hakkında bilgi içeren bir cevaptır. "
        "SAP işlem kodlarını (örn. VA01, FB60), modül adlarını ve teknik terimleri aynen koru."
    ),
    "serbest":     (
        "Bu yanıt, genel bir bilgi sorusuna verilen cevaptır. "
        "Akıcı ve anlaşılır kalsın; teknik olmayan okuyucuya uygun."
    ),
    "dosya_qa":    (
        "Bu yanıt, belirli bir belge üzerinde yapılan soru-cevabın çıktısıdır. "
        "Belgeden yapılan alıntıları ve referansları kesinlikle değiştirme."
    ),
    "n8n":         (
        "Bu yanıt, bir otomasyon işleminin sonucunu bildiren kısa mesajdır. "
        "Özlü ve net tut; gereksiz süsleme yapma."
    ),
    "hata_cozumu": (
        "Bu yanıt, bir sistem hatası veya arızayla ilgili açıklayıcı metindir. "
        "Hata kodlarını, adımları ve teknik detayları koru."
    ),
    "rapor_arama": (
        "Bu yanıt, Z'li ABAP raporu arama sonucunu açıklayan metindir. "
        "Rapor adlarını, transaction kodlarını ve teknik bilgileri koru."
    ),
}

# Kaynak node'a göre ek talimatlar
_SOURCE_NODE_HINTS: dict[str, str] = {
    "rag_search":   "Bilgi tabanından çekilen kaynak bilgilerini ve dosya referanslarını koru.",
    "error_solver": "Hata teşhis adımlarını, öneri listelerini ve teknik terimleri koru.",
    "zli_finder":   "Rapor adlarını, Z kodu formatlarını ve SQL/ABAP referanslarını koru.",
    "n8n_trigger":  "Otomasyon durumunu belirten ifadeleri değiştirme.",
    "aggregator":   "",  # Genel: ek kısıt yok
}


def _detect_source_node(nodes_executed: list[str]) -> str:
    """nodes_executed listesinden asıl yanıtı üreten specialist'i tahmin eder."""
    priority = ["error_solver", "zli_finder", "n8n_trigger", "rag_search", "aggregator"]
    executed_set = set(nodes_executed or [])
    for node in priority:
        if node in executed_set:
            return node
    return "aggregator"


def _build_polish_system(agent_config: dict | None, intent: str, source_node: str) -> str:
    """
    Kaynak node ve intent'e göre bağlamsal revize sistem prompt'u oluşturur.
    DB'deki prompt temel talimat; intent + source_node bilgisi bağlam olarak eklenir.
    """
    _DEFAULT_MSG_POLISH_BASE = (
        "Sana verilen metni imla, akıcılık ve okunabilirlik açısından hafifçe iyileştir. "
        "Bilgileri, anlamı ve yapıyı değiştirme. Yeni soru veya içerik ekleme. "
        "Sadece revize edilmiş metni döndür, başka hiçbir şey yazma."
    )
    base = ((agent_config or {}).get("prompt") or "").strip()
    if not base:
        base = _get_prompt_template("msg_polish_base", _DEFAULT_MSG_POLISH_BASE)

    hints: list[str] = []

    intent_hint = _INTENT_HINTS.get(intent, "")
    if intent_hint:
        hints.append(intent_hint)

    source_hint = _SOURCE_NODE_HINTS.get(source_node, "")
    if source_hint:
        hints.append(source_hint)

    if hints:
        base += "\n\n[REVİZE BAĞLAMI]\n" + "\n".join(f"• {h}" for h in hints)

    return base


def _try_get_writer():
    if get_stream_writer is None:
        return None
    try:
        return get_stream_writer()
    except Exception:
        return None


def _looks_like_json_payload(text: str) -> bool:
    t = (text or "").lstrip()
    return t.startswith("{") or t.startswith("```json")


async def msg_polish_node(state: AgentState) -> dict:
    t0 = time.time()
    final_reply = state.get("final_reply") or ""

    # ── No-op kontrolleri ────────────────────────────────────────────────────
    if not final_reply.strip():
        return {"nodes_executed": ["msg_polish"], "node_timings": {"msg_polish": 0}}

    if _looks_like_json_payload(final_reply):
        logger.info("[msg_polish] JSON payload → atlandı")
        return {"nodes_executed": ["msg_polish"], "node_timings": {"msg_polish": int((time.time() - t0) * 1000)}}

    # ── Aktiflik kontrolü ────────────────────────────────────────────────────
    # get_assigned_agent/get_agent_config fallback zinciri, asıl msg_polish ajanı
    # pasif olsa bile graph_node kind'ından başka bir ajanı getirebilir.
    # Burada sadece msg_polish'e atanan spesifik ajanın aktif mi olduğu kontrol edilir.
    try:
        _assignments = await run_in_threadpool(get_agent_assignments)
        _target_id = (_assignments or {}).get("msg_polish") or "sys_node_msg_polish"
        _active_check = await run_in_threadpool(lambda: get_ai_agent(agent_id=_target_id))
        if not _active_check:
            logger.info("[msg_polish] ajan pasif (aktif_mi=False, id=%s) → atlandı", _target_id)
            return {"nodes_executed": ["msg_polish"], "node_timings": {"msg_polish": int((time.time() - t0) * 1000)}}
    except Exception as e:
        logger.warning("[msg_polish] aktiflik kontrolü hatası: %s — devam", e)

    # ── Ajan yapılandırması ───────────────────────────────────────────────────
    msg_bot = get_agent_config(state, "msg_polish")
    if not msg_bot:
        try:
            msg_bot = await run_in_threadpool(get_assigned_agent, "msg_polish")
        except Exception as e:
            logger.warning("[msg_polish] msg_bot çekilemedi: %s", e)

    if not msg_bot or not (msg_bot.get("prompt") or "").strip():
        logger.info("[msg_polish] msg_bot pasif (prompt yok) → atlandı")
        return {"nodes_executed": ["msg_polish"], "node_timings": {"msg_polish": int((time.time() - t0) * 1000)}}

    node_cfg = msg_bot.get("node_config") or {}
    min_chars = int(node_cfg.get("min_chars_to_revise", 0) or 0)
    if min_chars > 0 and len(final_reply.strip()) < min_chars:
        logger.info("[msg_polish] mesaj %d kar. (< %d) → atlandı", len(final_reply.strip()), min_chars)
        return {"nodes_executed": ["msg_polish"], "node_timings": {"msg_polish": int((time.time() - t0) * 1000)}}

    # ── Kaynak node + intent tespiti ─────────────────────────────────────────
    intent = state.get("intent") or "general"
    nodes_executed: list[str] = list(state.get("nodes_executed") or [])
    source_node = _detect_source_node(nodes_executed)
    system = _build_polish_system(msg_bot, intent, source_node)

    logger.info(
        "[msg_polish] revize başlıyor — intent=%s source=%s model=%s",
        intent, source_node, msg_bot.get("model", "?"),
    )

    # ── LLM çağrısı ──────────────────────────────────────────────────────────
    try:
        messages = build_messages(system=system, user=final_reply)
        result = await call_llm(
            msg_bot,
            messages,
            temperature=msg_bot.get("temperature", 0.3),
            timeout=60.0,
        )
        revised = (result.get("text") or "").strip()
        elapsed_ms = int((time.time() - t0) * 1000)

        # Güvenlik: orijinalden 1.8x uzunsa içeriği tamamen yeniden yazmış —
        # msg_polish prompt'u yanlışsa saçma cevap üretmesini engeller.
        orig_len = len(final_reply.strip())
        rev_len = len(revised)
        if orig_len > 80 and rev_len > orig_len * 1.8:
            logger.warning(
                "[msg_polish] revize reddedildi: %d → %d kar. (>1.8x) — orijinal korunuyor",
                orig_len, rev_len,
            )
            return {"nodes_executed": ["msg_polish"], "node_timings": {"msg_polish": elapsed_ms}}

        if revised and revised != final_reply.strip():
            logger.info("[msg_polish] revize edildi: %d → %d kar. (%d ms)", orig_len, rev_len, elapsed_ms)
            writer = _try_get_writer()
            if writer:
                try:
                    writer({"type": "replace", "text": revised})
                except Exception as e:
                    logger.warning("[msg_polish] stream writer hatası: %s", e)
            return {
                "final_reply": revised,
                "nodes_executed": ["msg_polish"],
                "node_timings": {"msg_polish": elapsed_ms},
            }

        logger.info("[msg_polish] revize değişiklik üretmedi (%d ms)", elapsed_ms)
        return {"nodes_executed": ["msg_polish"], "node_timings": {"msg_polish": elapsed_ms}}

    except Exception as e:
        elapsed_ms = int((time.time() - t0) * 1000)
        logger.warning("[msg_polish] revize hatası, orijinal korunuyor: %s", e)
        return {
            "nodes_executed": ["msg_polish"],
            "node_timings": {"msg_polish": elapsed_ms},
            "node_errors": {"msg_polish": str(e)},
        }
