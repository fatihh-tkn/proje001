"""
nodes/supervisor.py
────────────────────────────────────────────────────────────────────
Plan üretici (orkestratör). Kullanıcı mesajını + komutu + dosya
bilgisini analiz eder, intent + paralel çalışacak specialist
listesini üretir.

LG.2 — LLM-tabanlı intent classifier:
  • `command` set ise (hızlı aksiyon) deterministik kural çalışır.
  • Aksi halde küçük JSON-response LLM çağrısı yapılır.
  • LLM erişilemezse rule-based fallback devreye girer.

Çıktı (state'e merge edilir):
    {
      "intent": "general" | "hata_cozumu" | "rapor_arama" | "n8n" | "dosya_qa",
      "plan":   [{"node": "rag_search", "mode": "parallel", ...}, ...],
      "plan_reasoning": "...",
      "needs_polish": bool,
    }

Plan içindeki "node" değerleri graph.py'deki conditional dispatcher
tarafından okunup `Send` API ile paralel yayılır.
"""

from __future__ import annotations

import json
import time
import re

from core.logger import get_logger
from core.db_bridge import get_assigned_agent
from ..state import AgentState
from ..llm_adapter import call_llm, build_messages

logger = get_logger("agent_graph.supervisor")


# Geçerli intent değerleri
_VALID_INTENTS = {"general", "hata_cozumu", "rapor_arama", "n8n", "dosya_qa"}

# Komut → intent (deterministik)
_COMMAND_INTENT_MAP = {
    "error_solve":       "hata_cozumu",
    "zli_report_query":  "rapor_arama",
    "summarize":         "general",
    "bpmn_analyze":      "general",
    "extract_tables":    "general",
    "gen_questions":     "general",
    "action_items":      "general",
}

# Intent → varsayılan specialist plan (paralel)
# 'rag_search' her durumda dahil edilir (genel bilgi tabanı bağlamı için).
_INTENT_PLAN = {
    "general":     [("rag_search", True)],
    "hata_cozumu": [("rag_search", True), ("error_solver", False)],
    "rapor_arama": [("zli_finder", False)],
    "n8n":         [("n8n_trigger", False), ("rag_search", True)],
    "dosya_qa":    [("rag_search", False)],
}


_CLASSIFIER_SYSTEM_FALLBACK = (
    "Sen bir intent sınıflandırıcısın. Kullanıcının mesajını okur ve şu "
    "kategorilerden birini seçersin:\n"
    "- general: genel sohbet, tanımlama, açık uçlu soru\n"
    "- hata_cozumu: SAP/sistem hata kodu (ör. ME083, FB60, dump), 'şu hata "
    "veriyor', 'çalışmıyor şu adımda kaldım' tarzı arıza/destek mesajı\n"
    "- rapor_arama: Z'li rapor (ZMM_, ZSD_), 'rapor bulamıyorum', 'şu işi "
    "yapan transaction var mı' tarzı rapor/transaction arama\n"
    "- n8n: net bir otomasyon tetikleme isteği (toplantı kaydet, rapor "
    "gönder, görev oluştur, bildirim gönder)\n"
    "- dosya_qa: belirli bir dosya hakkında soru (kullanıcı dosya adını "
    "anar veya 'şu dosyada ne yazıyor' der)\n\n"
    "SADECE şu JSON formatında cevap ver, başka HİÇBİR şey yazma:\n"
    '{"intent": "<kategori>", "needs_polish": <bool>, "reasoning": '
    '"<1-cümle-gerekçe>"}\n\n'
    "needs_polish: cevabın tonunun resmi/uzun olması gerekiyorsa true, "
    "kısa/teknik/JSON cevap için false."
)


def _resolve_system_prompt(agent_config: dict | None) -> str:
    """DB'den prompt çek; yoksa kod fallback'ine düş."""
    if agent_config:
        prompt = (agent_config.get("prompt") or "").strip()
        if prompt:
            return prompt
    return _CLASSIFIER_SYSTEM_FALLBACK


def _strip_json_fence(text: str) -> str:
    """LLM'in ```json ... ``` ile sardığı çıktıdan saf JSON çıkarır."""
    t = (text or "").strip()
    m = re.search(r"\{[\s\S]*\}", t)
    return m.group(0) if m else t


async def _classify_with_llm(user_message: str) -> dict | None:
    """
    Küçük LLM çağrısı ile intent sınıflandırması. Hata olursa None döner;
    çağıran rule-based fallback'e düşer.
    """
    try:
        # Sınıflandırıcı için supervisor rolüne atanmış ajanı kullan
        # (varsayılan: sys_node_supervisor). T=0.0 ile çağrılır.
        agent_config = None
        try:
            agent_config = get_assigned_agent("supervisor")
        except Exception:
            pass

        # node_config: rule-only çalıştırmak isterse use_llm_classifier=false
        node_cfg = (agent_config or {}).get("node_config") or {}
        if node_cfg.get("use_llm_classifier") is False:
            return None

        messages = build_messages(
            system=_resolve_system_prompt(agent_config),
            history=None,
            user=user_message,
        )
        result = await call_llm(
            agent_config,
            messages,
            temperature=0.0,
            response_format="json_object",
            timeout=20.0,
        )
        raw = result.get("text") or ""
        parsed = json.loads(_strip_json_fence(raw))
        intent = (parsed.get("intent") or "").strip()
        if intent not in _VALID_INTENTS:
            return None
        return {
            "intent": intent,
            "needs_polish": bool(parsed.get("needs_polish", False)),
            "reasoning": (parsed.get("reasoning") or "").strip(),
            "tokens": {
                "p": result.get("prompt_tokens", 0),
                "c": result.get("completion_tokens", 0),
            },
        }
    except Exception as e:
        logger.warning("[supervisor] LLM intent classification başarısız: %s", e)
        return None


def _rule_based_intent(user_message: str, has_file: bool) -> tuple[str, str]:
    """LLM yoksa basit kelime/regex eşleştirmesi."""
    msg = (user_message or "").lower()

    if has_file:
        return "dosya_qa", "Dosya bağlamı verilmiş → dosya QA modu."

    # SAP hata kodu paterni
    if re.search(r"\b[a-z]{1,3}\d{2,4}\b", msg) or any(
        kw in msg for kw in ("hata", "error", "dump", "abap", "şu hata")
    ):
        return "hata_cozumu", "Hata anahtar kelimesi/kodu tespit edildi."

    # Z'li rapor paterni
    if "z'li" in msg or re.search(r"\bz[a-z]{1,3}_", msg) or any(
        kw in msg for kw in ("rapor", "transaction", "tcode")
    ):
        return "rapor_arama", "Rapor/transaction anahtar kelimesi tespit edildi."

    # n8n otomasyon paterni (kaba)
    if any(kw in msg for kw in ("toplantı kaydet", "rapor gönder",
                                 "görev oluştur", "bildirim gönder")):
        return "n8n", "Bilinen otomasyon ifadesi tespit edildi."

    return "general", "Belirgin bir sinyal yok → genel sohbet."


def _plan_for_intent(intent: str) -> list[dict]:
    """Intent'e göre specialist listesini plan formatına çevirir."""
    nodes = _INTENT_PLAN.get(intent, _INTENT_PLAN["general"])
    return [
        {"node": name, "mode": "parallel", "optional": optional}
        for name, optional in nodes
    ]


async def supervisor_node(state: AgentState) -> dict:
    t0 = time.time()
    cmd = state.get("command")
    user_msg = state.get("user_message") or state.get("original_message") or ""
    has_file = bool(state.get("file_name"))
    tokens = {"p": 0, "c": 0}

    # 1) Hızlı aksiyon komutu varsa deterministik
    if cmd in _COMMAND_INTENT_MAP:
        intent = _COMMAND_INTENT_MAP[cmd]
        reasoning = f"Hızlı aksiyon '{cmd}' → intent='{intent}'."
        needs_polish = False  # JSON cevap, polish istemez
    elif has_file:
        intent = "dosya_qa"
        reasoning = f"file_name='{state['file_name']}' → dosya QA modu."
        needs_polish = True
    else:
        # 2) LLM tabanlı sınıflandırma (sıcak yol)
        llm_result = await _classify_with_llm(user_msg)
        if llm_result:
            intent = llm_result["intent"]
            reasoning = f"LLM: {llm_result['reasoning']}"
            needs_polish = llm_result["needs_polish"]
            tokens = llm_result["tokens"]
        else:
            # 3) Rule-based fallback (node_config.fallback_to_rules ile devre dışı bırakılabilir)
            try:
                _agent = get_assigned_agent("supervisor") or {}
                _cfg = _agent.get("node_config") or {}
            except Exception:
                _cfg = {}
            if _cfg.get("fallback_to_rules", True):
                intent, reasoning = _rule_based_intent(user_msg, has_file)
                needs_polish = (intent == "general")
            else:
                intent = "general"
                reasoning = "LLM erişilemedi; rule-based fallback kapalı → general."
                needs_polish = True

    plan = _plan_for_intent(intent)
    elapsed_ms = int((time.time() - t0) * 1000)

    logger.info(
        "[supervisor] intent=%s plan=%s polish=%s (%d ms)",
        intent,
        [p["node"] for p in plan],
        needs_polish,
        elapsed_ms,
    )

    return {
        "intent": intent,
        "plan": plan,
        "plan_reasoning": reasoning,
        "needs_polish": needs_polish,
        "nodes_executed": ["supervisor"],
        "node_timings": {"supervisor": elapsed_ms},
        "total_tokens": {"supervisor": tokens},
    }
