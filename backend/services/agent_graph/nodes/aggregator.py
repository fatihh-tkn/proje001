"""
nodes/aggregator.py
────────────────────────────────────────────────────────────────────
Specialist çıktılarını birleştirip son cevabı üretir.

Davranış intent'e ve hangi specialist'lerin draft ürettiğine göre değişir:

  • error_solver veya zli_finder zaten JSON `chat_draft` ürettiyse →
    onu doğrudan `final_reply` olarak kullan. (Frontend ham JSON'u
    parse edip rich UI render ediyor.)

  • Aksi halde (general / dosya_qa / n8n trigger sonrası sohbet) →
    chatbot ajanının sistem prompt'u + RAG context + history ile
    LLM çağrısı yap, sohbetsel cevap üret.

  • n8n_trigger workflow'u tetiklemişse cevabın başına kısa onay
    cümlesi eklenir.

Çıktı:
    {
      "chat_draft":   str,
      "final_reply":  str,
      "ui_action":    dict | None,   # n8n öncelikli; yoksa rag_search'inki
      "nodes_executed": ["aggregator"],
      "node_timings":   {"aggregator": ms},
      "total_tokens":   {"aggregator": {p, c}}  # sadece LLM çağrısı yapıldıysa
    }
"""

from __future__ import annotations

import time

from fastapi.concurrency import run_in_threadpool

from core.logger import get_logger
from core.db_bridge import get_assigned_agent, check_cost_cap
from core.prompts import (
    attach_chat_memory,
    get_general_rag_prompt,
    get_file_qa_prompt,
)
from ..state import AgentState
from ..llm_adapter import call_llm, stream_llm, build_messages

try:
    from langgraph.config import get_stream_writer
except ImportError:  # pragma: no cover
    get_stream_writer = None  # type: ignore

logger = get_logger("agent_graph.aggregator")


def _try_get_writer():
    """
    Streaming context dışında `get_stream_writer()` RuntimeError fırlatır.
    None döndürerek non-streaming yola düşmemizi sağlıyoruz.
    """
    if get_stream_writer is None:
        return None
    try:
        return get_stream_writer()
    except Exception:
        return None


_DEFAULT_SYSTEM = (
    "Sen şirket içi yapay zeka asistanısın. Kullanıcının sorusuna açık, "
    "kısa ve doğru cevap ver. Türkçe yaz. Bilgi tabanı bağlamı (RAG) "
    "varsa onu temel al."
)


# Agent ayarları (output_format, read_mode) → sistem prompt suffix'leri.
_OUTPUT_FORMAT_HINTS = {
    "markdown": "[ÇIKTI BİÇİMİ] Cevabını standart Markdown ile yapılandır (başlıklar, listeler, kod blokları gerektikçe). Sade ve okunabilir tut.",
    "plain":    "[ÇIKTI BİÇİMİ] Cevabını sade düz metin olarak ver. Markdown sembolleri (#, *, _, `) kullanma.",
    "table":    "[ÇIKTI BİÇİMİ] Cevabı uygun yerlerde Markdown tablo formatında ver. Karşılaştırma, sayısal veri veya birden fazla nitelik için tablo kullan.",
    # 'json' formatı `response_format='json_object'` ile ayrıca uygulanır.
}

_READ_MODE_HINTS = {
    "structured": "[BAĞLAM OKUMA MODU] Aşağıdaki RAG bağlamı yapısal markdown başlıkları içeriyor; başlık hiyerarşisini koruyarak referans ver.",
    "chunked":    "[BAĞLAM OKUMA MODU] Aşağıdaki RAG bağlamı bağımsız parçalardan oluşuyor; her parçayı ayrı bir kaynak olarak değerlendir, parça sınırlarını karıştırma.",
    # 'raw': default davranış, ek hint yok.
}

# strict_fact_check açıkken eklenen kurallar
_STRICT_FACT_WITH_RAG = (
    "[KESİN OLGU KONTROLÜ] Cevabını YALNIZCA aşağıdaki [BİLGİ TABANI BAĞLAMI] "
    "içindeki bilgilere dayandır. Bağlamda olmayan bir bilgi varsa kesinlikle "
    "tahmin yapma; 'Bu konu hakkında kaynak belgelerde bilgi bulunmuyor' diye "
    "açık şekilde belirt. Genel bilgini, eğitim verini veya sezgilerini kullanma."
)
_STRICT_FACT_NO_RAG = (
    "[KESİN OLGU KONTROLÜ] Bu turda kullanıcının sorusuna eşleşen kaynak belge "
    "bulunamadı. Genel bilgini kullanmadan 'Sorunuza ilişkin kaynak belgelerde "
    "bilgi bulunamadı' diye yanıtla; tahmin yapma."
)


def _build_chat_system(state: AgentState, agent_config: dict | None) -> str:
    """
    Sistem prompt'unu klasik akışla aynı katmanlamayla kurar:
        agent_config.prompt   (chatbot ajanının prompt'u)
        + intent'e göre core.prompts şablonu
            - dosya_qa  → get_file_qa_prompt(file_name)
            - diğerleri → get_general_rag_prompt()
        + agent_config.negative_prompt
        + RAG bağlamı (varsa)
    """
    parts: list[str] = []

    if agent_config and agent_config.get("prompt"):
        parts.append(agent_config["prompt"])
    else:
        parts.append(_DEFAULT_SYSTEM)

    # Prompt Templates sekmesinden gelen şablon (SistemAyari'de saklı)
    intent = state.get("intent") or "general"
    file_name = state.get("file_name")
    try:
        if intent == "dosya_qa" and file_name:
            parts.append(get_file_qa_prompt(file_name))
        else:
            parts.append(get_general_rag_prompt())
    except Exception as e:
        logger.warning("[aggregator] prompt template çekilemedi: %s", e)

    if agent_config and agent_config.get("negative_prompt"):
        parts.append(
            f"\n[KESİNLİKLE YAPMAMAN GEREKENLER]\n{agent_config['negative_prompt']}"
        )

    # Çıktı biçimi ipucu (markdown/plain/table) — 'json' ayrıca response_format ile
    output_format = (agent_config or {}).get("output_format")
    fmt_hint = _OUTPUT_FORMAT_HINTS.get(output_format)
    if fmt_hint:
        parts.append(fmt_hint)

    rag_ctx = state.get("rag_context")
    strict = bool((agent_config or {}).get("strict_fact_check"))

    if rag_ctx:
        # RAG okuma modu (raw/structured/chunked) — read_mode'a göre ipucu
        read_mode = (agent_config or {}).get("read_mode")
        mode_hint = _READ_MODE_HINTS.get(read_mode)
        if mode_hint:
            parts.append(mode_hint)
        if strict:
            parts.append(_STRICT_FACT_WITH_RAG)
        parts.append(f"\n[BİLGİ TABANI BAĞLAMI]\n{rag_ctx}")
    elif strict:
        parts.append(_STRICT_FACT_NO_RAG)

    return "\n\n".join(parts)


async def _fetch_memory_safe(session_id: str, user_msg: str) -> str:
    """`_fetch_chat_memory` ai_service.py'de sync ve vektör DB çağırıyor —
    threadpool'a koy. Hata olursa boş döndür ki aggregator akmaya devam etsin."""
    if not session_id or not user_msg.strip():
        return ""
    try:
        from services.ai_service import _fetch_chat_memory
        return await run_in_threadpool(_fetch_chat_memory, session_id, user_msg) or ""
    except Exception as e:
        logger.warning("[aggregator] chat_memory çekilemedi: %s", e)
        return ""


def _n8n_confirmation_line(action: dict) -> str:
    wf = action.get("workflow") or "(bilinmeyen)"
    status = action.get("status") or "tetiklendi"
    if status == "ok":
        return f"✅ '{wf}' otomasyonu tetiklendi."
    if status == "error":
        detail = action.get("detail") or ""
        return f"⚠️ '{wf}' otomasyonu çalıştırılamadı. {detail}".strip()
    return f"ℹ️ '{wf}' otomasyonu çağrıldı (durum: {status})."


async def aggregator_node(state: AgentState) -> dict:
    t0 = time.time()
    intent = state.get("intent") or "general"
    structured_draft = state.get("chat_draft") or ""

    # ── 1) Yapılandırılmış specialist çıktıları (error_solver / zli_finder)
    #    JSON cevap ise direkt kullan.
    if intent in ("hata_cozumu", "rapor_arama") and structured_draft.strip():
        elapsed_ms = int((time.time() - t0) * 1000)
        logger.info("[aggregator] intent=%s — JSON pass-through (%d ms)",
                    intent, elapsed_ms)
        # Streaming context'te frontend'in ham metni anında alabilmesi için
        # 'replace' event'i yayınla (chunk yerine; çünkü JSON'u parça parça
        # yazmak yerine bütün halinde göndermek daha güvenli).
        writer = _try_get_writer()
        if writer:
            try:
                writer({"type": "replace", "text": structured_draft})
            except Exception as e:
                logger.warning("[aggregator] writer hatası (pass-through): %s", e)
        return {
            "final_reply": structured_draft,
            "nodes_executed": ["aggregator"],
            "node_timings": {"aggregator": elapsed_ms},
        }

    # ── 2) Sohbetsel sentez (general / dosya_qa / n8n sonrası açıklama)
    # Bütçe kontrolü — günlük/aylık cap aşıldıysa LLM çağrısı yapma,
    # kullanıcıya nazik uyarı dön.
    try:
        capped, cap_msg = await run_in_threadpool(check_cost_cap)
        if capped:
            elapsed_ms = int((time.time() - t0) * 1000)
            logger.warning("[aggregator] cost cap aşıldı, LLM çağrısı atlandı")
            writer = _try_get_writer()
            if writer:
                try:
                    writer({"type": "replace", "text": cap_msg})
                except Exception:
                    pass
            return {
                "chat_draft": cap_msg,
                "final_reply": cap_msg,
                "nodes_executed": ["aggregator"],
                "node_timings": {"aggregator": elapsed_ms},
                "node_errors": {"aggregator": "cost_cap_exceeded"},
            }
    except Exception as e:
        logger.warning("[aggregator] cost cap kontrolü atlandı: %s", e)

    try:
        agent_config = None
        try:
            agent_config = get_assigned_agent("aggregator")
        except Exception as e:
            logger.warning("[aggregator] atanmış ajan çekilemedi: %s", e)

        system = _build_chat_system(state, agent_config)
        history = state.get("history") or []
        user_msg = state.get("user_message") or state.get("original_message") or ""

        # Semantik sohbet hafızası — önceki sohbetlerden alakalı kesitleri
        # sistem prompt'una ekle (klasik akıştaki davranışla bire bir).
        chat_memory_text = await _fetch_memory_safe(
            state.get("session_id") or "", user_msg,
        )
        if chat_memory_text:
            system = attach_chat_memory(system, chat_memory_text)

        # n8n tetiklendiyse onay cümlesini sistem prompt'una ekle
        n8n_action = state.get("n8n_action")
        if n8n_action:
            confirm = _n8n_confirmation_line(n8n_action)
            system += (
                "\n\n[OTOMASYON DURUMU]\n"
                f"{confirm}\n"
                "Cevabını bu durumla tutarlı şekilde, kısa bir onay cümlesi "
                "veya açıklama ile başlat."
            )

        messages = build_messages(system=system, history=history, user=user_msg)
        temperature = (agent_config or {}).get("temperature", 0.7)
        max_tokens = (agent_config or {}).get("max_tokens") or None
        # Agent JSON çıktı isterse response_format'ı zorla
        output_format = (agent_config or {}).get("output_format")
        response_format = "json_object" if output_format == "json" else None

        writer = _try_get_writer()

        # Streaming yalnız serbest metinde anlamlı — JSON için non-stream'e düş
        # (tek atımda bütün JSON gerekiyor, parça parça yarım JSON gelmesin).
        if writer and response_format != "json_object":
            # Token-level streaming yolu — frontend baloncuğa karakter karakter yazar
            collected: list[str] = []
            done_meta: dict = {}
            async for chunk in stream_llm(
                agent_config, messages,
                temperature=temperature,
                max_tokens=max_tokens,
                timeout=120.0,
            ):
                if chunk.get("type") == "token":
                    txt = chunk.get("text", "")
                    if txt:
                        collected.append(txt)
                        try:
                            writer({"type": "chunk", "text": txt})
                        except Exception as e:
                            logger.warning("[aggregator] writer hatası: %s", e)
                elif chunk.get("type") == "done":
                    done_meta = chunk
            text = (done_meta.get("full_text") or "".join(collected)).strip()
            elapsed_ms = int((time.time() - t0) * 1000)
            logger.info(
                "[aggregator] (stream) intent=%s → %d karakter, %d/%d token, %d ms",
                intent, len(text),
                done_meta.get("prompt_tokens", 0),
                done_meta.get("completion_tokens", 0),
                elapsed_ms,
            )
            return {
                "chat_draft": text,
                "final_reply": text,
                "model_used": done_meta.get("model", ""),
                "provider_used": done_meta.get("provider", ""),
                "nodes_executed": ["aggregator"],
                "node_timings": {"aggregator": elapsed_ms},
                "total_tokens": {"aggregator": {
                    "p": done_meta.get("prompt_tokens", 0),
                    "c": done_meta.get("completion_tokens", 0),
                }},
            }

        # Non-streaming yol (test/SDK invoke veya JSON çıktı zorlaması)
        result = await call_llm(
            agent_config, messages,
            temperature=temperature,
            response_format=response_format,
            max_tokens=max_tokens,
            timeout=60.0,
        )
        text = (result.get("text") or "").strip()
        elapsed_ms = int((time.time() - t0) * 1000)
        logger.info(
            "[aggregator] intent=%s → %d karakter, %d/%d token, %d ms",
            intent, len(text),
            result.get("prompt_tokens", 0),
            result.get("completion_tokens", 0),
            elapsed_ms,
        )
        return {
            "chat_draft": text,
            "final_reply": text,
            "model_used": result.get("model", ""),
            "provider_used": result.get("provider", ""),
            "nodes_executed": ["aggregator"],
            "node_timings": {"aggregator": elapsed_ms},
            "total_tokens": {"aggregator": {
                "p": result.get("prompt_tokens", 0),
                "c": result.get("completion_tokens", 0),
            }},
        }

    except Exception as e:
        elapsed_ms = int((time.time() - t0) * 1000)
        logger.error("[aggregator] hata: %s", e, exc_info=True)
        # Specialist draft varsa onu fallback olarak kullan, yoksa hata mesajı
        fallback = structured_draft or f"❌ Cevap üretilemedi: {e}"
        return {
            "chat_draft": fallback,
            "final_reply": fallback,
            "nodes_executed": ["aggregator"],
            "node_timings": {"aggregator": elapsed_ms},
            "node_errors": {"aggregator": str(e)},
        }
