"""
ai_service.py — Ana AI koordinatör servisi.

Bu dosya AIService sınıfını barındırır ve dışarıya açık public interface'i sağlar.
Düşük seviyeli HTTP retry, RAG pipeline ve ZLI arama mantığı ayrı modüllere
taşınmıştır:

  services/llm_client.py  — _post_with_retry, resolve_model_name, call_llm
  services/rag_search.py  — _build_semantic_context, _build_file_context,
                             _fetch_zli_report_matches, AppSettings / SETTINGS

Geriye dönük uyumluluk için bu dosyadan da import edilebilirler.
"""
import json
import logging
import time
import uuid
from datetime import datetime
from typing import AsyncGenerator

import httpx
from fastapi.concurrency import run_in_threadpool

from core.db_bridge import add_log_to_db, get_ai_agent, get_user_models
from core.logger import get_logger
from services import provider_registry

# ── Alt modüllerden yeniden export (geriye dönük uyumluluk) ──────────────────
from services.llm_client import _post_with_retry, resolve_model_name          # noqa: F401
from services.rag_search import (                                              # noqa: F401
    SETTINGS,
    AppSettings,
    _build_file_context,
    _build_semantic_context,
    _fetch_zli_report_matches,
    _truncate,
)

logger = get_logger("ai_service")

from core.prompts import (
    attach_chat_memory,
    build_full_prompt,
    build_gemini_contents,
    build_openai_messages,
    get_file_qa_prompt,
    get_general_rag_prompt,
)


# ── Yardımcı: Kullanıcı bazlı belge dışlama ──────────────────────────────────

def _get_user_excluded_files(user_id: str | None) -> list[str]:
    """Kullanıcının meta verisinden erişimi kapalı dosyaların SQL ID'lerini döner."""
    if not user_id:
        return []
    try:
        from database.sql.session import get_session
        from database.sql.models import Belge, Kullanici
        from sqlalchemy import select
        with get_session() as db:
            user = db.scalar(select(Kullanici).where(Kullanici.kimlik == user_id))
            if not user or not user.meta:
                return []
            meta = user.meta
            # archive_file_<belge_kimlik> = false olan dosyaların kimliklerini topla
            excluded_ids = [
                key[len("archive_file_"):]
                for key, val in meta.items()
                if key.startswith("archive_file_") and val is False
            ]
            return excluded_ids
    except Exception:
        return []


# ── Sohbet hafızası (SQL + pgvector) ─────────────────────────────────────────

def _get_history(session_id: str, max_turns: int | None = None) -> list[dict]:
    """
    Sohbet geçmişini son `max_turns` tur ile döner.
    `max_turns=None` ise sistem ayarı `MAX_HISTORY_TURNS` kullanılır.
    Bir tur = 1 user + 1 assistant mesajı.
    Oturumda 'ozet' mesajı varsa ilk eleman {"role": "compact_summary", ...} döner;
    _build_initial_state bunu state["compact_summary"]'a aktarır.
    """
    from database.sql.session import get_session
    from database.sql.repositories.chat_repo import ChatRepository
    turns = max_turns if (max_turns and max_turns > 0) else SETTINGS.MAX_HISTORY_TURNS
    with get_session() as db:
        repo = ChatRepository(db)
        ozet_text, messages = repo.get_messages_for_context(session_id, turns)
        out = []
        if ozet_text:
            out.append({"role": "compact_summary", "text": ozet_text})
        for msg in messages:
            out.append({"role": msg.rol, "text": msg.icerik})
        return out


def _save_to_history(
    session_id: str,
    user_text: str,
    ai_text: str,
    model: str = None,
    rag_sources: list = None,
) -> None:
    from database.sql.session import get_session
    from database.sql.repositories.chat_repo import ChatRepository
    with get_session() as db:
        repo = ChatRepository(db)
        if not repo.get_session(session_id):
            repo.create_session(session_id=session_id)

        repo.add_message(session_id, "user", user_text)
        repo.add_message(
            session_id, "assistant", ai_text,
            model=model,
            rag_sources=rag_sources,
        )

    try:
        from database.vector.pgvector_db import vector_db
        safe_col_name = f"chat_mem_{session_id}".replace("-", "_")
        doc_text = f"Kullanıcı dedi ki: {user_text}\nAI Cevap Verdi: {ai_text}"
        vector_db.add_documents(
            collection_name=safe_col_name,
            documents=[doc_text],
            metadatas=[{"type": "chat_log", "time": time.time()}],
            ids=[f"msg_{uuid.uuid4().hex[:8]}"]
        )
    except Exception as e:
        logger.warning("[CHAT-RAG SAVE] Sohbet hafızası kaydedilemedi: %s", e)


def clear_session_history(session_id: str) -> None:
    from database.sql.session import get_session
    from database.sql.repositories.chat_repo import ChatRepository
    with get_session() as db:
        repo = ChatRepository(db)
        repo.delete_session(session_id)

    try:
        from database.vector.pgvector_db import vector_db
        safe_col_name = f"chat_mem_{session_id}".replace("-", "_")
        vector_db.delete_collection(safe_col_name)
    except Exception as _e:
        logger.warning("Sohbet vektör koleksiyonu silinemedi [%s]: %s", session_id, _e)


def _fetch_chat_memory(session_id: str, query: str) -> str:
    try:
        from database.vector.pgvector_db import vector_db
        safe_col_name = f"chat_mem_{session_id}".replace("-", "_")
        if safe_col_name in vector_db.list_collections():
            results = vector_db.query(collection_name=safe_col_name, query_texts=[query], n_results=2)
            docs = results.get("documents", [[]])[0]
            dists = results.get("distances", [[]])[0]
            valid_docs = []
            for doc, dist in zip(docs, dists):
                if dist <= SETTINGS.LLM_PRE_FILTER_DISTANCE_THRESHOLD:
                    valid_docs.append(doc)
            if valid_docs:
                return "\n\n".join(valid_docs)
    except Exception as e:
        logger.warning("[CHAT-RAG QUERY] Sohbet hafızası sorgulanamadı: %s", e)
    return ""


# ── n8n Aksiyon Routing ───────────────────────────────────────────────────────

async def _trigger_n8n_by_name(workflow_name: str, payload: dict) -> dict:
    """Workflow adına göre DB cache'den ID bulur, n8n execute API'sini çağırır."""
    try:
        import os as _os
        from database.sql.session import get_session as _gs
        from database.sql.models import N8nWorkflowCache

        workflow_id = None
        with _gs() as _db:
            wf = _db.query(N8nWorkflowCache).filter(N8nWorkflowCache.name == workflow_name).first()
            if wf:
                workflow_id = wf.id

        if not workflow_id:
            return {"status": "error", "detail": f"'{workflow_name}' adlı workflow bulunamadı"}

        api_key = _os.getenv("N8N_API_KEY", "")
        headers = {"accept": "application/json", "Content-Type": "application/json"}
        if api_key:
            headers["X-N8N-API-KEY"] = api_key

        async with httpx.AsyncClient(timeout=10.0) as client:
            url = f"http://localhost:5678/api/v1/workflows/{workflow_id}/run"
            resp = await client.post(url, headers=headers, json={"startNodes": [], "destinationNode": "", "runData": payload})
            if resp.status_code in (200, 201):
                return {"status": "ok", "detail": "Workflow başarıyla tetiklendi"}
            else:
                return {"status": "error", "detail": f"n8n yanıtı: {resp.status_code}"}
    except Exception as e:
        return {"status": "error", "detail": str(e)}


async def _try_route_and_trigger(user_message: str, action_agent: dict | None = None) -> dict | None:
    """
    İşlem Botunu çalıştırır; n8n aksiyonu varsa workflow'u tetikler.
    Dönüş: {"command": "N8N_TRIGGERED", "workflow": ..., "status": ...} veya None.

    `action_agent` opsiyonel: çağıran (graph node) state cache'inden config
    geçirebilir. None ise eski davranışla DB'den çekilir.
    """
    import re as _re
    try:
        if action_agent is None:
            # LG.7: Önce yeni graph node ajanını dene (sys_node_n8n_trigger),
            # bulunamazsa legacy sys_agent_action_001'e düş.
            from core.db_bridge import get_assigned_agent
            action_agent = await run_in_threadpool(get_assigned_agent, "n8n_trigger")
            if not action_agent:
                action_agent = await run_in_threadpool(get_ai_agent, agent_id="sys_agent_action_001")
        if not action_agent:
            return None

        allowed_workflows: list[str] = action_agent.get("allowed_workflows") or []
        if not allowed_workflows:
            return None  # Hiç workflow atanmamışsa çalıştırma

        # Prompt'a güncel workflow listesini enjekte et
        raw_prompt = action_agent.get("prompt", "")
        webhook_line = f"Mevcut n8n webhook'ları: {', '.join(allowed_workflows)}"
        if _re.search(r"Mevcut n8n webhook'ları:", raw_prompt):
            injected_prompt = _re.sub(r"Mevcut n8n webhook'ları:.*$", webhook_line, raw_prompt, flags=_re.MULTILINE)
        else:
            injected_prompt = raw_prompt + f"\n\n{webhook_line}"

        # Geçici olarak prompt'u override et
        action_agent["prompt"] = injected_prompt

        # LLM karar al (döngüsel import olmadan doğrudan çağır)
        result = await AIService.route_action(user_message, agent_config_override=action_agent)

        if result.get("action") != "n8n":
            return None

        webhook_name = result.get("webhook", "").strip()
        if not webhook_name or webhook_name not in allowed_workflows:
            return None

        # n8n'de bu isimle workflow bul ve tetikle
        trigger_result = await _trigger_n8n_by_name(webhook_name, result.get("payload") or {})
        return {
            "command": "N8N_TRIGGERED",
            "workflow": webhook_name,
            "status": trigger_result.get("status", "triggered"),
            "detail": trigger_result.get("detail", ""),
        }
    except Exception as e:
        logger.warning("[ACTION-BOT] route_and_trigger hatası: %s", e)
        return None


# ── Yardımcı: Gemini model adı normalizasyonu (geriye dönük) ─────────────────

def _resolve_model_name(model_name: str, is_gemini: bool) -> str:
    """Kullanıcının girdiği model adını gerçek API adına çevirir."""
    return resolve_model_name(model_name, is_gemini)


# ── Ana AIService Sınıfı ──────────────────────────────────────────────────────

class AIService:

    @staticmethod
    async def get_reply(
        user_message: str,
        file_name: str | None = None,
        collection_name: str | None = None,
        session_id: str = "default_chat",
        ip: str = "127.0.0.1",
        mac: str = "00:00:00:00",
        user_id: str | None = None,
        command: str | None = None,
    ) -> tuple[str, bool, list[dict], dict | None]:
        """
        Döner: (yanıt_metni, rag_kullanıldı_mı, kaynak_listesi, ui_action)
        """
        models = await run_in_threadpool(get_user_models, include_secret=True)
        if not models:
            return (
                "❌ Hata: Kayıtlı hiçbir yapay zeka modeli bulunamadı. "
                "Lütfen önce 'Ayarlar -> Yapay Zeka Modelleri' kısmından bir model ve API anahtarı ekleyin.",
                False,
                [],
                None,
            )

        # Ajan Ayarlarını SQL'den Çek
        agent_config = await run_in_threadpool(get_ai_agent, "chatbot")
        temperature = 0.7
        excluded_files = []
        allowed_pools = []
        selected_model_name = None
        if agent_config:
            allowed_rags = agent_config.get("allowed_rags") or []
            excluded_files = [str(r)[1:] for r in allowed_rags if str(r).startswith("!")]
            allowed_pools = [str(r) for r in allowed_rags if not str(r).startswith("!")]
            temperature = agent_config.get("temperature", 0.7)
            selected_model_name = agent_config.get("model")

        active_model = models[0]
        if selected_model_name:
            active_model = next((m for m in models if m["name"] == selected_model_name), models[0])

        model_name        = active_model["name"]
        api_key           = active_model["api_key"]
        start_time        = time.time()
        ui_action         = None

        # Kullanıcı bazlı belge kısıtlaması
        user_excluded = await run_in_threadpool(_get_user_excluded_files, user_id)
        if user_excluded:
            excluded_files = list(set(excluded_files) | set(user_excluded))

        # ── RAG bağlamı ──────────────────────────────────────────────────────
        if file_name:
            rag_context, rag_sources, ui_action = await run_in_threadpool(
                _build_file_context, user_message, file_name, collection_name,
                excluded_file_ids=excluded_files, allowed_pools=allowed_pools, user_id=user_id,
            )
            system_intro = get_file_qa_prompt(file_name)
        else:
            rag_context, rag_sources, ui_action = await run_in_threadpool(
                _build_semantic_context, user_message, collection_name=collection_name,
                excluded_file_ids=excluded_files, allowed_pools=allowed_pools, user_id=user_id,
            )
            system_intro = get_general_rag_prompt()

        if agent_config:
            if agent_config.get("prompt"):
                system_intro = f"{agent_config['prompt']}\n\n{system_intro}"
            if agent_config.get("negative_prompt"):
                system_intro += f"\n\n[KESİNLİKLE YAPMAMAN GEREKENLER (KISITLAMALAR)]\n{agent_config['negative_prompt']}"

        # ── Hızlı Aksiyon: Hata Çözümü ───────────────────────────────────────
        if command == "error_solve":
            system_intro += (
                "\n\n[HATA ÇÖZÜMÜ MODU]\n"
                "Kullanıcının mesajı bir SAP/sistem hatası hakkında. "
                "Cevabını AŞAĞIDAKİ tek bir JSON kod bloğu olarak ver. "
                "JSON dışında HİÇBİR metin yazma. Eksik bilgi varsa ilgili alanı boş bırak veya tahmin etmeden makul varsayılan kullan.\n\n"
                "```json\n"
                "{\n"
                '  "type": "error_solution",\n'
                '  "id": "<hata_kodu_ör_ME083>",\n'
                '  "title": "<kısa_başlık>",\n'
                '  "module": "<SAP_modülü_ör_MM/PP/SD>",\n'
                '  "severity": "low|medium|high|critical",\n'
                '  "frequency": <int_geçmişte_kaç_kez_görüldü_bilinmiyorsa_0>,\n'
                '  "summary": "<1-2_cümle_genel_özet>",\n'
                '  "cause": "<hatanın_tespit_edilen_nedeni>",\n'
                '  "steps": [\n'
                '    {"title": "<adım_başlığı>", "tcode": "<varsa_T-kod>", "detail": "<detay>"}\n'
                "  ],\n"
                '  "docs": [{"name": "<dosya_adı>", "page": <int|null>}],\n'
                '  "similar": [{"code": "<hata_kodu>", "title": "<başlık>", "count": <int>}]\n'
                "}\n"
                "```"
            )

        # ── Hızlı Aksiyon: Z'li Rapor Sorgusu ────────────────────────────────
        if command == "zli_report_query":
            zli_matches = await run_in_threadpool(_fetch_zli_report_matches, user_message, 5)
            matches_block = "(eşleşme yok)"
            if zli_matches:
                lines = []
                for m in zli_matches:
                    parca = f"- {m['kod']}: {m['ad']}"
                    if m.get("modul"):
                        parca += f" [{m['modul']}]"
                    parca += f"\n    Açıklama: {m['aciklama']}"
                    if m.get("kullanim_alani"):
                        parca += f"\n    Kullanım: {m['kullanim_alani']}"
                    lines.append(parca)
                matches_block = "\n".join(lines)

            system_intro += (
                "\n\n[Z'Lİ RAPOR SORGUSU MODU]\n"
                "Kullanıcı sistemde yüklü Z'li raporlardan birini arıyor. "
                "Aşağıda SQL'den gelen aday raporlar var; en uygun olanı ve "
                "alternatifleri seç. Eşleşme yoksa best_match=null ver.\n\n"
                f"ADAY RAPORLAR:\n{matches_block}\n\n"
                "Cevabını AŞAĞIDAKİ tek bir JSON kod bloğu olarak ver. "
                "JSON dışında HİÇBİR metin yazma.\n\n"
                "```json\n"
                "{\n"
                '  "type": "zli_report_query",\n'
                '  "query": "<kullanıcının_isteğinin_kısa_özeti>",\n'
                '  "best_match": {"kod": "...", "ad": "...", "aciklama": "...", "modul": "...", "kullanim_alani": "...", "neden": "<neden_uygun>"} | null,\n'
                '  "alternatives": [{"kod": "...", "ad": "...", "aciklama": "..."}],\n'
                '  "no_match_reason": "<eşleşme_yoksa_kısa_açıklama_yoksa_boş>"\n'
                "}\n"
                "```"
            )

        # ── Chat-RAG ─────────────────────────────────────────────────────────
        chat_memory_text = await run_in_threadpool(_fetch_chat_memory, session_id, user_message)
        system_intro = attach_chat_memory(system_intro, chat_memory_text)

        full_prompt = build_full_prompt(system_intro, rag_context, user_message)

        is_gemini = active_model.get("protocol") == "google_gemini"
        base_url = active_model.get("base_url") or ""
        extra_headers = active_model.get("extra_headers") or {}
        actual_model_name = resolve_model_name(model_name, is_gemini)

        # ── Konuşma geçmişi — chat_history_length ajan config'inden okunur ──
        _hist_turns: int | None = None
        if agent_config:
            _hl = agent_config.get("chat_history_length")
            if _hl and int(_hl) > 0:
                _hist_turns = int(_hl)
        history = await run_in_threadpool(_get_history, session_id, max_turns=_hist_turns)

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                if is_gemini:
                    url = f"{base_url}/models/{actual_model_name}:generateContent?key={api_key}"
                    payload = {
                        "systemInstruction": {"parts": [{"text": system_intro}]},
                        "contents": build_gemini_contents(history, full_prompt),
                        "generationConfig": {
                            "temperature": temperature
                        }
                    }
                    response = await _post_with_retry(
                        client, url,
                        headers={"Content-Type": "application/json"},
                        json=payload,
                    )
                    data = response.json()

                    try:
                        reply_text = data["candidates"][0]["content"]["parts"][0]["text"]
                    except (KeyError, IndexError):
                        reply_text = "Google Gemini API boş veya anlamsız bir yanıt döndürdü."

                    usage          = data.get("usageMetadata", {})
                    prompt_tokens  = usage.get("promptTokenCount", 0)
                    comp_tokens    = usage.get("candidatesTokenCount", 0)
                    total_tokens   = usage.get("totalTokenCount", 0)
                    provider_label = active_model.get("provider_label") or "Google Gemini"

                else:
                    response = await _post_with_retry(
                        client,
                        provider_registry.openai_chat_url(base_url),
                        headers=provider_registry.openai_headers(api_key, extra_headers),
                        json={
                            "model": actual_model_name,
                            "messages": build_openai_messages(history, system_intro, full_prompt),
                            "temperature": temperature
                        },
                    )
                    data = response.json()

                    reply_text     = data["choices"][0]["message"]["content"]
                    usage          = data.get("usage", {})
                    prompt_tokens  = usage.get("prompt_tokens", 0)
                    comp_tokens    = usage.get("completion_tokens", 0)
                    total_tokens   = usage.get("total_tokens", 0)
                    provider_label = active_model.get("provider_label") or "OpenAI (Custom)"

                end_time    = time.time()
                duration_ms = int((end_time - start_time) * 1000)
                cost        = (prompt_tokens * 0.000005) + (comp_tokens * 0.000015)

                log_entry = {
                    "id":               f"log_{uuid.uuid4().hex[:8]}",
                    "timestamp":        datetime.utcnow().isoformat() + "Z",
                    "provider":         provider_label,
                    "model":            actual_model_name,
                    "promptTokens":     prompt_tokens,
                    "completionTokens": comp_tokens,
                    "totalTokens":      total_tokens,
                    "duration":         duration_ms,
                    "status":           "success",
                    "cost":             cost,
                    "projectId":        "chat_ui",
                    "sessionId":        session_id,
                    "role":             "user",
                    "error":            None,
                    "request":          user_message,
                    "response":         reply_text,
                    "ip":               ip,
                    "mac":              mac,
                    "rag_used":         bool(rag_context),
                    "rag_file":         file_name or "",
                }
                # Sadece sohbetsel veriyi (History DB) kaydet! Token/Maliyet artık ApiCagrisi'na emanet (Issue 5 - Normalization)
                await run_in_threadpool(
                    _save_to_history,
                    session_id, user_message, reply_text,
                    actual_model_name,
                    rag_sources,
                )

                await run_in_threadpool(add_log_to_db, log_entry)

                return reply_text, bool(rag_context), rag_sources, ui_action

        except httpx.HTTPStatusError as e:
            end_time    = time.time()
            duration_ms = int((end_time - start_time) * 1000)
            error_code  = str(e.response.status_code)
            error_msg   = str(e)
            try:
                error_data = e.response.json()
                error_msg  = error_data.get("error", {}).get("message", str(e))
                if not is_gemini:
                    error_code = error_data.get("error", {}).get("code", error_code)
            except Exception:
                pass

            log_entry = {
                "id":               f"log_{uuid.uuid4().hex[:8]}",
                "timestamp":        datetime.utcnow().isoformat() + "Z",
                "provider":         active_model.get("provider_label") or ("Google Gemini" if is_gemini else "OpenAI (Custom)"),
                "model":            actual_model_name,
                "promptTokens":     0, "completionTokens": 0, "totalTokens": 0,
                "duration":         duration_ms,
                "status":           "error",
                "cost":             0,
                "projectId":        "chat_ui",
                "sessionId":        session_id,
                "role":             "user",
                "error":            error_code,
                "request":          user_message,
                "response":         f"API Hatası: {error_msg}",
                "ip":               ip,
                "mac":              mac,
                "rag_used":         False,
            }
            await run_in_threadpool(add_log_to_db, log_entry)
            return f"❌ API Hatası: {error_msg}", False, [], None

        except Exception as e:
            logger.error("AI yanıt hatası [session=%s]: %s", session_id, e, exc_info=True)
            return f"❌ Sistemsel hata oluştu: {str(e)}", False, [], None

    # ── STREAMING ─────────────────────────────────────────────────────────────
    @staticmethod
    async def get_reply_stream(
        user_message: str,
        file_name: str | None = None,
        collection_name: str | None = None,
        session_id: str = "default_chat",
        ip: str = "127.0.0.1",
        mac: str = "00:00:00:00",
        user_id: str | None = None,
        command: str | None = None,
    ) -> AsyncGenerator[str, None]:
        """
        SSE formatında text chunk'ları yield eder.
        Her chunk: 'data: <json>\n\n'  (type: 'chunk' | 'done' | 'error')
        """
        models = await run_in_threadpool(get_user_models, include_secret=True)
        if not models:
            yield f"data: {json.dumps({'type': 'error', 'text': '❌ Kayıtlı model bulunamadı. Ayarlar → Yapay Zeka Modelleri kısmından ekleyin.'})}\n\n"
            return

        # Ajan Ayarlarını SQL'den Çek
        agent_config = await run_in_threadpool(get_ai_agent, "chatbot")
        temperature = 0.7
        excluded_files = []
        allowed_pools = []
        selected_model_name = None
        if agent_config:
            allowed_rags = agent_config.get("allowed_rags") or []
            excluded_files = [str(r)[1:] for r in allowed_rags if str(r).startswith("!")]
            allowed_pools = [str(r) for r in allowed_rags if not str(r).startswith("!")]
            temperature = agent_config.get("temperature", 0.7)
            selected_model_name = agent_config.get("model")

        active_model = models[0]
        if selected_model_name:
            active_model = next((m for m in models if m["name"] == selected_model_name), models[0])

        model_name   = active_model["name"]
        api_key      = active_model["api_key"]
        start_time   = time.time()

        # Kullanıcı bazlı belge kısıtlaması
        user_excluded = await run_in_threadpool(_get_user_excluded_files, user_id)
        if user_excluded:
            excluded_files = list(set(excluded_files) | set(user_excluded))

        # ── İşlem Botu: Önce aksiyon kararı al ──────────────────────────
        n8n_ui_action = await _try_route_and_trigger(user_message)

        # ── İstem Revize Botu (aktif ise) — kullanıcı mesajını LLM'e
        # göndermeden önce profesyonelleştirir / detaylandırır.
        prompt_bot = await run_in_threadpool(get_ai_agent, agent_id="sys_agent_prompt_001")
        if prompt_bot and (prompt_bot.get("prompt") or "").strip() and len((user_message or "").strip()) >= 3:
            try:
                revised = await AIService.revise_prompt(user_message)
                if revised and revised.strip() and revised.strip() != user_message.strip():
                    logger.info("[PROMPT-BOT] Mesaj revize edildi (orig=%d → revised=%d karakter)",
                                len(user_message), len(revised))
                    user_message = revised.strip()
            except Exception as _e:
                logger.warning("[PROMPT-BOT] Revize hatası, orijinal mesaj kullanılıyor: %s", _e)

        # RAG bağlamı
        ui_action = None
        if file_name:
            rag_context, rag_sources, ui_action = await run_in_threadpool(
                _build_file_context, user_message, file_name, collection_name,
                excluded_file_ids=excluded_files, allowed_pools=allowed_pools, user_id=user_id,
            )
            system_intro = get_file_qa_prompt(file_name)
        else:
            rag_context, rag_sources, ui_action = await run_in_threadpool(
                _build_semantic_context, user_message, collection_name=collection_name,
                excluded_file_ids=excluded_files, allowed_pools=allowed_pools, user_id=user_id,
            )
            system_intro = get_general_rag_prompt()

        if agent_config:
            if agent_config.get("prompt"):
                system_intro = f"{agent_config['prompt']}\n\n{system_intro}"
            if agent_config.get("negative_prompt"):
                system_intro += f"\n\n[KESİNLİKLE YAPMAMAN GEREKENLER (KISITLAMALAR)]\n{agent_config['negative_prompt']}"

        # ── Hızlı Aksiyon: Hata Çözümü ───────────────────────────────────────
        if command == "error_solve":
            system_intro += (
                "\n\n[HATA ÇÖZÜMÜ MODU]\n"
                "Kullanıcının mesajı bir SAP/sistem hatası hakkında. "
                "Cevabını AŞAĞIDAKİ tek bir JSON kod bloğu olarak ver. "
                "JSON dışında HİÇBİR metin yazma. Eksik bilgi varsa ilgili alanı boş bırak veya tahmin etmeden makul varsayılan kullan.\n\n"
                "```json\n"
                "{\n"
                '  "type": "error_solution",\n'
                '  "id": "<hata_kodu_ör_ME083>",\n'
                '  "title": "<kısa_başlık>",\n'
                '  "module": "<SAP_modülü_ör_MM/PP/SD>",\n'
                '  "severity": "low|medium|high|critical",\n'
                '  "frequency": <int_geçmişte_kaç_kez_görüldü_bilinmiyorsa_0>,\n'
                '  "summary": "<1-2_cümle_genel_özet>",\n'
                '  "cause": "<hatanın_tespit_edilen_nedeni>",\n'
                '  "steps": [\n'
                '    {"title": "<adım_başlığı>", "tcode": "<varsa_T-kod>", "detail": "<detay>"}\n'
                "  ],\n"
                '  "docs": [{"name": "<dosya_adı>", "page": <int|null>}],\n'
                '  "similar": [{"code": "<hata_kodu>", "title": "<başlık>", "count": <int>}]\n'
                "}\n"
                "```"
            )

        # ── Hızlı Aksiyon: Z'li Rapor Sorgusu ────────────────────────────────
        if command == "zli_report_query":
            zli_matches = await run_in_threadpool(_fetch_zli_report_matches, user_message, 5)
            matches_block = "(eşleşme yok)"
            if zli_matches:
                lines = []
                for m in zli_matches:
                    parca = f"- {m['kod']}: {m['ad']}"
                    if m.get("modul"):
                        parca += f" [{m['modul']}]"
                    parca += f"\n    Açıklama: {m['aciklama']}"
                    if m.get("kullanim_alani"):
                        parca += f"\n    Kullanım: {m['kullanim_alani']}"
                    lines.append(parca)
                matches_block = "\n".join(lines)

            system_intro += (
                "\n\n[Z'Lİ RAPOR SORGUSU MODU]\n"
                "Kullanıcı sistemde yüklü Z'li raporlardan birini arıyor. "
                "Aşağıda SQL'den gelen aday raporlar var; en uygun olanı ve "
                "alternatifleri seç. Eşleşme yoksa best_match=null ver.\n\n"
                f"ADAY RAPORLAR:\n{matches_block}\n\n"
                "Cevabını AŞAĞIDAKİ tek bir JSON kod bloğu olarak ver. "
                "JSON dışında HİÇBİR metin yazma.\n\n"
                "```json\n"
                "{\n"
                '  "type": "zli_report_query",\n'
                '  "query": "<kullanıcının_isteğinin_kısa_özeti>",\n'
                '  "best_match": {"kod": "...", "ad": "...", "aciklama": "...", "modul": "...", "kullanim_alani": "...", "neden": "<neden_uygun>"} | null,\n'
                '  "alternatives": [{"kod": "...", "ad": "...", "aciklama": "..."}],\n'
                '  "no_match_reason": "<eşleşme_yoksa_kısa_açıklama_yoksa_boş>"\n'
                "}\n"
                "```"
            )

        # ── Chat-RAG ─────────────────────────────────────────────────────────
        chat_memory_text = await run_in_threadpool(_fetch_chat_memory, session_id, user_message)
        system_intro = attach_chat_memory(system_intro, chat_memory_text)

        full_prompt = build_full_prompt(system_intro, rag_context, user_message)

        is_gemini = active_model.get("protocol") == "google_gemini"
        base_url = active_model.get("base_url") or ""
        extra_headers = active_model.get("extra_headers") or {}
        actual_model_name = resolve_model_name(model_name, is_gemini)

        # ── Konuşma geçmişi — chat_history_length ajan config'inden okunur ──
        _hist_turns_s: int | None = None
        if agent_config:
            _hl_s = agent_config.get("chat_history_length")
            if _hl_s and int(_hl_s) > 0:
                _hist_turns_s = int(_hl_s)
        history = await run_in_threadpool(_get_history, session_id, max_turns=_hist_turns_s)

        full_reply = ""
        prompt_tokens = 0
        comp_tokens   = 0
        total_tokens  = 0

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                if is_gemini:
                    # Gemini streaming endpoint
                    url = f"{base_url}/models/{actual_model_name}:streamGenerateContent?alt=sse&key={api_key}"
                    payload = {
                        "systemInstruction": {"parts": [{"text": system_intro}]},
                        "contents": build_gemini_contents(history, full_prompt),
                        "generationConfig": {
                            "temperature": temperature
                        }
                    }

                    async with client.stream(
                        "POST", url,
                        headers={"Content-Type": "application/json"},
                        json=payload,
                    ) as response:
                        response.raise_for_status()
                        async for line in response.aiter_lines():
                            if not line.startswith("data:"):
                                continue
                            raw = line[5:].strip()
                            if not raw or raw == "[DONE]":
                                continue
                            try:
                                chunk_data = json.loads(raw)
                                usage  = chunk_data.get("usageMetadata", {})
                                if usage:
                                    prompt_tokens = usage.get("promptTokenCount", prompt_tokens)
                                    comp_tokens   = usage.get("candidatesTokenCount", comp_tokens)
                                    total_tokens  = usage.get("totalTokenCount", total_tokens)
                                parts = (
                                    chunk_data.get("candidates", [{}])[0]
                                    .get("content", {})
                                    .get("parts", [])
                                )
                                for part in parts:
                                    text = part.get("text", "")
                                    if text:
                                        full_reply += text
                                        yield f"data: {json.dumps({'type': 'chunk', 'text': text})}\n\n"
                            except (json.JSONDecodeError, IndexError, KeyError):
                                continue
                    provider_label = active_model.get("provider_label") or "Google Gemini"

                else:
                    # OpenAI-uyumlu streaming endpoint
                    async with client.stream(
                        "POST",
                        provider_registry.openai_chat_url(base_url),
                        headers=provider_registry.openai_headers(api_key, extra_headers),
                        json={
                            "model": actual_model_name,
                            "messages": build_openai_messages(history, system_intro, full_prompt),
                            "stream": True,
                            "temperature": temperature
                        },
                    ) as response:
                        response.raise_for_status()
                        async for line in response.aiter_lines():
                            if not line.startswith("data:"):
                                continue
                            raw = line[5:].strip()
                            if not raw or raw == "[DONE]":
                                continue
                            try:
                                chunk_data = json.loads(raw)
                                delta = (
                                    chunk_data.get("choices", [{}])[0]
                                    .get("delta", {})
                                    .get("content", "")
                                )
                                if delta:
                                    full_reply += delta
                                    yield f"data: {json.dumps({'type': 'chunk', 'text': delta})}\n\n"
                                usage = chunk_data.get("usage")
                                if usage:
                                    prompt_tokens = usage.get("prompt_tokens", 0)
                                    comp_tokens   = usage.get("completion_tokens", 0)
                                    total_tokens  = usage.get("total_tokens", 0)
                            except (json.JSONDecodeError, IndexError, KeyError):
                                continue
                    provider_label = active_model.get("provider_label") or "OpenAI (Custom)"

            # Tüm stream bitti — log yaz
            end_time    = time.time()
            duration_ms = int((end_time - start_time) * 1000)
            cost        = (prompt_tokens * 0.000005) + (comp_tokens * 0.000015)

            log_entry = {
                "id":               f"log_{uuid.uuid4().hex[:8]}",
                "timestamp":        datetime.utcnow().isoformat() + "Z",
                "provider":         provider_label,
                "model":            actual_model_name,
                "promptTokens":     prompt_tokens,
                "completionTokens": comp_tokens,
                "totalTokens":      total_tokens,
                "duration":         duration_ms,
                "status":           "success",
                "cost":             cost,
                "projectId":        "chat_ui",
                "sessionId":        session_id,
                "role":             "user",
                "error":            None,
                "request":          user_message,
                "response":         full_reply,
                "ip":               ip,
                "mac":              mac,
                "rag_used":         bool(rag_context),
                "rag_file":         file_name or "",
            }
            # Sadece sohbetsel veriyi (History DB) kaydet! (Issue 5 - Normalization)
            await run_in_threadpool(
                _save_to_history,
                session_id, user_message, full_reply,
                actual_model_name,
                rag_sources,
            )

            await run_in_threadpool(add_log_to_db, log_entry)

            # ── Mesaj Revize Botu (aktif ise) — AI cevabını kullanıcıya
            # göstermeden önce üslup/format açısından profesyonelleştir.
            # Frontend 'replace' event'i alınca baloncuğun metnini değiştirir.
            # LG.7: Önce yeni graph node ajanı (sys_node_msg_polish), sonra legacy
            from core.db_bridge import get_assigned_agent as _ga
            msg_bot = await run_in_threadpool(_ga, "msg_polish")
            if not msg_bot:
                msg_bot = await run_in_threadpool(get_ai_agent, agent_id="sys_agent_msg_001")
            if msg_bot and (msg_bot.get("prompt") or "").strip() and full_reply.strip():
                try:
                    revised = await AIService.revise_message(full_reply)
                    if revised and revised.strip() and revised.strip() != full_reply.strip():
                        logger.info("[MSG-BOT] Cevap revize edildi (orig=%d → revised=%d karakter)",
                                    len(full_reply), len(revised))
                        yield f"data: {json.dumps({'type': 'replace', 'text': revised})}\n\n"
                except Exception as _e:
                    logger.warning("[MSG-BOT] Revize hatası, orijinal cevap kullanılıyor: %s", _e)

            # done sinyali — n8n aksiyonu varsa onu önceliklendir
            final_ui_action = n8n_ui_action if n8n_ui_action else ui_action
            yield f"data: {json.dumps({'type': 'done', 'rag_used': bool(rag_context), 'rag_sources': rag_sources, 'ui_action': final_ui_action, 'model': actual_model_name, 'provider': provider_label, 'prompt_tokens': prompt_tokens, 'completion_tokens': comp_tokens, 'duration_ms': duration_ms})}\n\n"

        except httpx.HTTPStatusError as e:
            end_time    = time.time()
            duration_ms = int((end_time - start_time) * 1000)
            error_code  = str(e.response.status_code)
            error_msg   = str(e)
            try:
                error_data = e.response.json()
                error_msg  = error_data.get("error", {}).get("message", str(e))
            except Exception:
                pass

            log_entry = {
                "id":               f"log_{uuid.uuid4().hex[:8]}",
                "timestamp":        datetime.utcnow().isoformat() + "Z",
                "provider":         active_model.get("provider_label") or ("Google Gemini" if is_gemini else "OpenAI (Custom)"),
                "model":            actual_model_name,
                "promptTokens":     0, "completionTokens": 0, "totalTokens": 0,
                "duration":         duration_ms,
                "status":           "error",
                "cost":             0,
                "projectId":        "chat_ui",
                "sessionId":        session_id,
                "role":             "user",
                "error":            error_code,
                "request":          user_message,
                "response":         f"API Hatası: {error_msg}",
                "ip":               ip,
                "mac":              mac,
                "rag_used":         False,
            }
            await run_in_threadpool(add_log_to_db, log_entry)
            yield f"data: {json.dumps({'type': 'error', 'text': f'❌ API Hatası: {error_msg}'})}\n\n"

        except Exception as e:
            logger.error("AI stream hatası [session=%s]: %s", session_id, e, exc_info=True)
            yield f"data: {json.dumps({'type': 'error', 'text': f'❌ Sistemsel hata: {str(e)}'})}\n\n"
    # ──────────────────────────────────────────────────────────────────────────

    @staticmethod
    async def revise_prompt(user_prompt: str) -> str:
        """İstem Revize Botu'nu kullanarak prompt'u iyileştirir."""
        _REVISE_GUARD = (
            "\n\n[KESİN KURAL] Sana verilen metni sadece yeniden yaz. "
            "Soruyu yanıtlama, açıklama yapma, ek bilgi ekleme. "
            "Yalnızca revize edilmiş metni döndür, başka hiçbir şey yazma."
        )
        agent_config = await run_in_threadpool(get_ai_agent, agent_id="sys_agent_prompt_001")
        if not agent_config:
            base = "Kullanıcının girdiği istemi yapay zeka tarafından daha iyi anlaşılabilecek, net ve profesyonel bir talimata dönüştür."
            temperature = 0.3
        else:
            base = agent_config.get("prompt") or "Kullanıcının girdiği istemi profesyonelleştir."
            temperature = agent_config.get("temperature", 0.3)
        system_prompt = base.rstrip() + _REVISE_GUARD

        models = await run_in_threadpool(get_user_models, include_secret=True)
        if not models:
            raise ValueError("Kayıtlı hiçbir yapay zeka modeli bulunamadı.")

        active_model = models[0]
        if agent_config and agent_config.get("model"):
            active_model = next((m for m in models if m["name"] == agent_config["model"]), models[0])

        model_name = active_model["name"]
        api_key = active_model["api_key"]

        is_gemini = active_model.get("protocol") == "google_gemini"
        base_url = active_model.get("base_url") or ""
        extra_headers = active_model.get("extra_headers") or {}
        actual_model_name = resolve_model_name(model_name, is_gemini)

        async with httpx.AsyncClient(timeout=60.0) as client:
            if is_gemini:
                url = f"{base_url}/models/{actual_model_name}:generateContent?key={api_key}"
                payload = {
                    "systemInstruction": {"parts": [{"text": system_prompt}]},
                    "contents": [{"parts": [{"text": user_prompt}]}],
                    "generationConfig": {"temperature": temperature}
                }
                response = await _post_with_retry(
                    client, url,
                    headers={"Content-Type": "application/json"},
                    json=payload,
                )
                data = response.json()
                try:
                    return data["candidates"][0]["content"]["parts"][0]["text"].strip()
                except (KeyError, IndexError):
                    return user_prompt
            else:
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ]
                response = await _post_with_retry(
                    client,
                    provider_registry.openai_chat_url(base_url),
                    headers=provider_registry.openai_headers(api_key, extra_headers),
                    json={"model": actual_model_name, "messages": messages, "temperature": temperature},
                )
                data = response.json()
                return data["choices"][0]["message"]["content"].strip()

    @staticmethod
    async def revise_message(bot_reply: str) -> str:
        """Mesaj Revize Botu'nu kullanarak nihai yanıtı kullanıcıya gösterilmeden önce iyileştirir."""
        # LG.7: Önce yeni graph node ajanı (sys_node_msg_polish), sonra legacy
        from core.db_bridge import get_assigned_agent
        agent_config = await run_in_threadpool(get_assigned_agent, "msg_polish")
        if not agent_config:
            agent_config = await run_in_threadpool(get_ai_agent, agent_id="sys_agent_msg_001")
        if not agent_config:
            system_prompt = "Sana gelen metni imla, üslup ve profesyonellik açısından daha iyi bir hale getir. Eğer liste falan varsa daha okunabilir yap. Sadece revize edilmiş metni döndür, kendi yorumunu ekleme."
            temperature = 0.4
        else:
            system_prompt = agent_config.get("prompt", "Gelen metni profesyonelleştir.")
            temperature = agent_config.get("temperature", 0.4)

        models = await run_in_threadpool(get_user_models, include_secret=True)
        if not models:
            raise ValueError("Kayıtlı hiçbir yapay zeka modeli bulunamadı.")

        active_model = models[0]
        if agent_config and agent_config.get("model"):
            active_model = next((m for m in models if m["name"] == agent_config["model"]), models[0])

        model_name = active_model["name"]
        api_key = active_model["api_key"]

        is_gemini = active_model.get("protocol") == "google_gemini"
        base_url = active_model.get("base_url") or ""
        extra_headers = active_model.get("extra_headers") or {}
        actual_model_name = resolve_model_name(model_name, is_gemini)

        async with httpx.AsyncClient(timeout=60.0) as client:
            if is_gemini:
                url = f"{base_url}/models/{actual_model_name}:generateContent?key={api_key}"
                payload = {
                    "systemInstruction": {"parts": [{"text": system_prompt}]},
                    "contents": [{"parts": [{"text": bot_reply}]}],
                    "generationConfig": {"temperature": temperature}
                }
                response = await _post_with_retry(
                    client, url,
                    headers={"Content-Type": "application/json"},
                    json=payload,
                )
                data = response.json()
                try:
                    return data["candidates"][0]["content"]["parts"][0]["text"].strip()
                except (KeyError, IndexError):
                    return bot_reply
            else:
                messages = [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": bot_reply}
                ]
                response = await _post_with_retry(
                    client,
                    provider_registry.openai_chat_url(base_url),
                    headers=provider_registry.openai_headers(api_key, extra_headers),
                    json={"model": actual_model_name, "messages": messages, "temperature": temperature},
                )
                data = response.json()
                return data["choices"][0]["message"]["content"].strip()

    @staticmethod
    async def route_action(user_message: str, agent_config_override: dict | None = None) -> dict:
        """
        İşlem Botu: Kullanıcı mesajını analiz eder ve hangi aksiyonun alınması
        gerektiğine karar vererek JSON döndürür.
        Örnek çıktı: {"action": "n8n", "webhook": "rapor_gonder", "payload": {}}
        """
        import re as _re
        import json as _json

        agent_config = agent_config_override or await run_in_threadpool(get_ai_agent, agent_id="sys_agent_action_001")
        if not agent_config:
            fallback_prompt = """Sen bir aksiyon karar motorusun. Kullanıcının mesajını analiz ederek aşağıdaki kararlardan birini ver ve SADECE JSON döndür:
1. n8n otomasyonu için: {"action": "n8n", "webhook": "<webhook_adi>", "payload": {}}
2. UI navigasyon için: {"action": "ui_navigate", "target": "<sekme_kimlik>"}
3. Aksiyon yoksa: {"action": "none"}
Mevcut webhook'lar: toplanti_kaydet, rapor_gonder, gorev_olustur, bildirim_gonder
Mevcut UI sekmeleri: archive, database, meetings, ai_center, n8n, monitor"""
            temperature = 0.0
        else:
            # {{user_message}} yer tutucusunu gerçek mesajla değiştir
            raw_prompt = agent_config.get("prompt", "")
            fallback_prompt = raw_prompt.replace("{{user_message}}", user_message)
            temperature = agent_config.get("temperature", 0.0)

        # Son mesajda user_message zaten var, system prompt'a da ekleyelim
        full_system = fallback_prompt
        user_input = f"Kullanıcı mesajı: {user_message}"

        models = await run_in_threadpool(get_user_models, include_secret=True)
        if not models:
            raise ValueError("Kayıtlı hiçbir yapay zeka modeli bulunamadı.")

        active_model = models[0]
        if agent_config and agent_config.get("model"):
            active_model = next((m for m in models if m["name"] == agent_config["model"]), models[0])

        model_name = active_model["name"]
        api_key = active_model["api_key"]

        is_gemini = active_model.get("protocol") == "google_gemini"
        base_url = active_model.get("base_url") or ""
        extra_headers = active_model.get("extra_headers") or {}
        actual_model_name = resolve_model_name(model_name, is_gemini)

        raw_text = ""
        async with httpx.AsyncClient(timeout=30.0) as client:
            if is_gemini:
                url = f"{base_url}/models/{actual_model_name}:generateContent?key={api_key}"
                payload = {
                    "systemInstruction": {"parts": [{"text": full_system}]},
                    "contents": [{"parts": [{"text": user_input}]}],
                    "generationConfig": {"temperature": temperature}
                }
                response = await _post_with_retry(
                    client, url,
                    headers={"Content-Type": "application/json"},
                    json=payload,
                )
                data = response.json()
                try:
                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                except (KeyError, IndexError):
                    raw_text = '{"action": "none"}'
            else:
                messages = [
                    {"role": "system", "content": full_system},
                    {"role": "user", "content": user_input}
                ]
                response = await _post_with_retry(
                    client,
                    provider_registry.openai_chat_url(base_url),
                    headers=provider_registry.openai_headers(api_key, extra_headers),
                    json={"model": actual_model_name, "messages": messages, "temperature": temperature,
                          "response_format": {"type": "json_object"}},
                )
                data = response.json()
                raw_text = data["choices"][0]["message"]["content"].strip()

        # JSON temizle — bazen ```json ... ``` sarmalı gelir
        json_match = _re.search(r'\{.*\}', raw_text, _re.DOTALL)
        if json_match:
            raw_text = json_match.group(0)

        try:
            return _json.loads(raw_text)
        except Exception as _e:
            logger.debug("JSON aksiyon ayrıştırma başarısız, 'none' döndürülüyor: %s | raw=%s", _e, raw_text[:100])
            return {"action": "none", "raw": raw_text}

    @staticmethod
    async def suggest_followups(user_message: str, bot_reply: str, max_count: int = 2) -> list[str]:
        """
        Kullanıcı + bot mesajı çiftine bakarak konuşmayı doğal şekilde devam
        ettirebilecek 1-3 kısa Türkçe takip sorusu döner. Chatbot ajanında
        can_ask_follow_up = false ise sessizce boş liste döndürür.
        Hata olursa boş liste — frontend chip göstermez.
        """
        import re as _re
        import json as _json

        if not bot_reply or len(bot_reply.strip()) < 20:
            return []

        # Ajan ayarına saygı: kapatılmışsa öneri üretme
        agent_config = await run_in_threadpool(get_ai_agent, "chatbot")
        if agent_config and not agent_config.get("can_ask_follow_up", True):
            return []

        models = await run_in_threadpool(get_user_models, include_secret=True)
        if not models:
            return []

        active_model = models[0]
        if agent_config and agent_config.get("model"):
            active_model = next((m for m in models if m["name"] == agent_config["model"]), models[0])
        model_name = active_model["name"]
        api_key    = active_model["api_key"]

        is_gemini = active_model.get("protocol") == "google_gemini"
        base_url = active_model.get("base_url") or ""
        extra_headers = active_model.get("extra_headers") or {}
        actual_model_name = resolve_model_name(model_name, is_gemini)

        system_prompt = (
            "Sen bir konuşma asistanısın. Kullanıcının son sorusunu ve botun cevabını okuyup "
            f"onun bir sonraki adımda sorabileceği {max_count} kısa, doğal Türkçe takip sorusu üret. "
            "Sorular cevap içeriğine bağlı olmalı, klişe/jenerik olmamalı; her biri tek satır, soru işaretiyle bitsin. "
            'Sadece şu JSON formatında dön: {"questions": ["...", "..."]} — başka açıklama yazma.'
        )
        user_input = f"KULLANICI: {user_message}\n\nBOT CEVABI:\n{bot_reply[:3000]}"
        temperature = 0.5

        raw_text = ""
        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                if is_gemini:
                    url = f"{base_url}/models/{actual_model_name}:generateContent?key={api_key}"
                    payload = {
                        "systemInstruction": {"parts": [{"text": system_prompt}]},
                        "contents": [{"parts": [{"text": user_input}]}],
                        "generationConfig": {"temperature": temperature, "responseMimeType": "application/json"},
                    }
                    response = await _post_with_retry(
                        client, url,
                        headers={"Content-Type": "application/json"},
                        json=payload,
                    )
                    data = response.json()
                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                else:
                    messages = [
                        {"role": "system", "content": system_prompt},
                        {"role": "user",   "content": user_input},
                    ]
                    response = await _post_with_retry(
                        client,
                        provider_registry.openai_chat_url(base_url),
                        headers=provider_registry.openai_headers(api_key, extra_headers),
                        json={
                            "model": actual_model_name, "messages": messages,
                            "temperature": temperature,
                            "response_format": {"type": "json_object"},
                        },
                    )
                    data = response.json()
                    raw_text = data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            logger.debug("Takip sorusu üretimi başarısız: %s", e)
            return []

        m = _re.search(r'\{.*\}', raw_text, _re.DOTALL)
        if m:
            raw_text = m.group(0)
        try:
            parsed = _json.loads(raw_text)
            qs = parsed.get("questions") if isinstance(parsed, dict) else None
            if isinstance(qs, list):
                return [str(q).strip() for q in qs if str(q).strip()][:max_count]
        except Exception as e:
            logger.debug("Takip sorusu JSON ayrıştırılamadı: %s | raw=%s", e, raw_text[:120])
        return []


ai_service = AIService()
