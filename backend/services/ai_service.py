import httpx
import uuid
import time
import json
from datetime import datetime
from typing import AsyncGenerator
from fastapi.concurrency import run_in_threadpool
from core.db_bridge import get_user_models, add_log_to_db
from core.prompts import (
    get_file_qa_prompt,
    get_general_rag_prompt,
    attach_chat_memory,
    build_full_prompt,
    build_gemini_contents,
    build_openai_messages
)
# ── Sabitler ─────────────────────────────────────────────────────────────────
FILE_MODE_MAX_CHUNKS   = 40
GENERAL_RAG_TOP_K      = 10
CHUNK_CHAR_LIMIT       = 2000
MAX_HISTORY_TURNS      = 2
LLM_PRE_FILTER_DISTANCE_THRESHOLD = 0.55
# ─────────────────────────────────────────────────────────────────────────────

# ── Session konuşma hafızası (SQLite) ───────────────────────────────────

def _get_history(session_id: str) -> list[dict]:
    from database.sql.session import get_session
    from database.sql.repositories.chat_repo import ChatRepository
    with get_session() as db:
        repo = ChatRepository(db)
        messages = repo.get_messages(session_id, limit=MAX_HISTORY_TURNS * 2)
        out = []
        for msg in messages:
            out.append({"role": msg.rol, "text": msg.icerik})
        return out

def _save_to_history(session_id: str, user_text: str, ai_text: str, model: str = None) -> None:
    from database.sql.session import get_session
    from database.sql.repositories.chat_repo import ChatRepository
    with get_session() as db:
        repo = ChatRepository(db)
        if not repo.get_session(session_id):
            repo.create_session(session_id=session_id)
        
        repo.add_message(session_id, "user", user_text)
        repo.add_message(session_id, "assistant", ai_text, model=model)

    try:
        from database.vector.chroma_db import vector_db
        safe_col_name = f"chat_mem_{session_id}".replace("-", "_")
        doc_text = f"Kullanıcı dedi ki: {user_text}\nAI Cevap Verdi: {ai_text}"
        vector_db.add_documents(
            collection_name=safe_col_name,
            documents=[doc_text],
            metadatas=[{"type": "chat_log", "time": time.time()}],
            ids=[f"msg_{uuid.uuid4().hex[:8]}"]
        )
    except Exception as e:
        print(f"[CHAT-RAG SAVE ERROR]: {e}")

def clear_session_history(session_id: str) -> None:
    from database.sql.session import get_session
    from database.sql.repositories.chat_repo import ChatRepository
    with get_session() as db:
        repo = ChatRepository(db)
        repo.delete_session(session_id)
        
    try:
        from database.vector.chroma_db import vector_db
        safe_col_name = f"chat_mem_{session_id}".replace("-", "_")
        vector_db.delete_collection(safe_col_name)
    except Exception:
        pass

def _fetch_chat_memory(session_id: str, query: str) -> str:
    try:
        from database.vector.chroma_db import vector_db
        safe_col_name = f"chat_mem_{session_id}".replace("-", "_")
        if safe_col_name in vector_db.list_collections():
            results = vector_db.query(collection_name=safe_col_name, query_texts=[query], n_results=2)
            docs = results.get("documents", [[]])[0]
            if docs:
                return "\n\n".join(docs)
    except Exception as e:
        print(f"[CHAT-RAG QUERY ERROR]: {e}")
    return ""
# ─────────────────────────────────────────────────────────────────────────────



def _truncate(text: str, limit: int = CHUNK_CHAR_LIMIT) -> str:
    if len(text) <= limit:
        return text
    return text[:limit] + f"\n...[{len(text) - limit} karakter kırpıldı]"


def _build_file_context(
    user_message: str,
    file_name: str,
    collection_name: str | None,
    top_k_candidates: int = 40,
    max_pages: int = 8,
) -> tuple[str, list[dict], dict | None]:
    return _build_semantic_context(
        user_message=user_message,
        file_name=file_name,
        collection_name=collection_name,
        top_k=max_pages
    )


def _build_semantic_context(
    user_message: str,
    file_name: str | None = None,
    collection_name: str | None = None,
    top_k: int = GENERAL_RAG_TOP_K,
) -> tuple[str, list[dict], dict | None]:
    """
    RAG Pipeline Optimizasyonu:
    1. ChromaDB'den vektörel anlamsal sonuçları getir (Aşama 1).
    2. DocumentRepository üzerinden SQLite JOIN yaparak ilgili metinleri, relations tablosunu ve location_marker'ı çek (Aşama 2 & 3).
    3. LLM_PRE_FILTER_DISTANCE_THRESHOLD eşiğindeki sonuçları reddet.
    """
    try:
        from database.vector.chroma_db import vector_db
        from database.sql.session import get_session
        from database.sql.repositories.document_repo import DocumentRepository

        all_collections = vector_db.list_collections()
        if not all_collections:
            return "", [], None

        target_cols = [collection_name] if collection_name else all_collections
        parts:   list[str] = []
        sources: list[dict] = []
        best_ui_action: dict | None = None

        for col in target_cols:
            if col not in all_collections:
                continue
            try:
                # Aşama 1: Vektör Araması (Semantic Retrieval)
                results = vector_db.query(
                    collection_name=col,
                    query_texts=[user_message],
                    n_results=top_k * 2,
                )
                chroma_ids = results.get("ids", [[]])[0]
                dists = results.get("distances", [[]])[0]

                if not chroma_ids:
                    continue

                # Kaba filtreleme (Python Router Threshold)
                filtered_ids = []
                for rank, cid in enumerate(chroma_ids):
                    dist = dists[rank] if rank < len(dists) else 0.0
                    if dist <= LLM_PRE_FILTER_DISTANCE_THRESHOLD:
                        filtered_ids.append(cid)
                
                if not filtered_ids:
                    continue

                # Aşama 2 & 3: Graf Genişletmesi ve SQLite JOIN
                with get_session() as db:
                    repo = DocumentRepository(db)
                    rich_contexts = repo.node_ids_to_context(filtered_ids[:top_k])

                    for ctx in rich_contexts:
                        doc_info = ctx["document"]
                        src = doc_info["filename"]
                        
                        if file_name and src != file_name:
                            continue

                        marker = ctx["location_marker"]
                        content = ctx["content"]

                        # 1 Derece Derinlikte Graf Okuması (Relations)
                        graph_note = ""
                        if ctx["related_nodes"]:
                            graph_note = "\n[Sistem Graph Notu: Bu düğüm şunlarla ilişkilidir:\n"
                            for rel in ctx["related_nodes"]:
                                tgt = rel.get('document_name') or 'Bilinmeyen'
                                r_type = rel.get('relation_type', 'bağlı')
                                graph_note += f"- '{tgt}' ({r_type})\n"
                            graph_note += "]\n"

                        header = f"[{src}" + (f" | Konum: {marker}" if marker else "") + "]"
                        parts.append(f"{header}\n{_truncate(content or '')}{graph_note}")

                        # UI Action Belirleme (İlk ve en yakın sonuç)
                        if marker and not best_ui_action:
                            best_ui_action = {
                                "command": "OPEN_TAB",
                                "url": f"http://localhost:8000/files/{src}#{marker}"
                            }

                        sources.append({
                            "file": src,
                            "location_marker": marker,
                            "chroma_id": ctx["chroma_id"],
                        })

            except Exception as ex:
                print(f"[RAG-SEMANTIC] Hata - Koleksiyon {col}: {ex}")
                continue

        return "\n\n---\n\n".join(parts), sources, best_ui_action

    except Exception as e:
        print(f"[RAG-SEMANTIC] Genel Hata: {e}")
        return "", [], None


# ─────────────────────────────────────────────────────────────────────────────

class AIService:
    @staticmethod
    async def get_reply(
        user_message: str,
        file_name: str | None = None,
        collection_name: str | None = None,
        session_id: str = "default_chat",
        ip: str = "127.0.0.1",
        mac: str = "00:00:00:00",
    ) -> tuple[str, bool, list[dict], dict | None]:
        """
        Döner: (yanıt_metni, rag_kullanıldı_mı, kaynak_listesi, ui_action)
        """
        models = await run_in_threadpool(get_user_models)
        if not models:
            return (
                "❌ Hata: Kayıtlı hiçbir yapay zeka modeli bulunamadı. "
                "Lütfen önce 'Ayarlar -> Yapay Zeka Modelleri' kısmından bir model ve API anahtarı ekleyin.",
                False,
                [],
                None,
            )

        active_model      = models[0]
        model_name        = active_model["name"]
        api_key           = active_model["api_key"]
        start_time        = time.time()
        ui_action         = None

        # ── RAG bağlamı ──────────────────────────────────────────────────────
        if file_name:
            rag_context, rag_sources, ui_action = await run_in_threadpool(_build_file_context, user_message, file_name, collection_name)
            system_intro = get_file_qa_prompt(file_name)
        else:
            rag_context, rag_sources, ui_action = await run_in_threadpool(_build_semantic_context, user_message, collection_name=collection_name)
            system_intro = get_general_rag_prompt()

        # ── Chat-RAG ─────────────────────────────────────────────────────────
        chat_memory_text = await run_in_threadpool(_fetch_chat_memory, session_id, user_message)
        system_intro = attach_chat_memory(system_intro, chat_memory_text)
        
        full_prompt = build_full_prompt(system_intro, rag_context, user_message)

        is_gemini = "gemini" in model_name.lower() or api_key.startswith("AIza")
        actual_model_name = model_name
        if is_gemini:
            invalid_names = ["gemini", "google gemini", "google", "gemini ai", "gemini-pro"]
            if model_name.lower().strip() in invalid_names or "1.5" in model_name:
                actual_model_name = "gemini-1.5-pro" if "pro" in model_name.lower() else "gemini-1.5-flash"
            elif "2.0" in model_name:
                actual_model_name = "gemini-2.0-flash"

        # ── Konuşma geçmişi ──────────────────────────────────────────────
        history = await run_in_threadpool(_get_history, session_id)


        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                if is_gemini:
                    url = (
                        f"https://generativelanguage.googleapis.com/v1beta/models/"
                        f"{actual_model_name}:generateContent?key={api_key}"
                    )
                    payload = {
                        "systemInstruction": {"parts": [{"text": system_intro}]},
                        "contents": build_gemini_contents(history, full_prompt),
                    }
                    response = await client.post(
                        url, headers={"Content-Type": "application/json"}, json=payload
                    )
                    response.raise_for_status()
                    data = response.json()

                    try:
                        reply_text = data["candidates"][0]["content"]["parts"][0]["text"]
                    except (KeyError, IndexError):
                        reply_text = "Google Gemini API boş veya anlamsız bir yanıt döndürdü."

                    usage          = data.get("usageMetadata", {})
                    prompt_tokens  = usage.get("promptTokenCount", 0)
                    comp_tokens    = usage.get("candidatesTokenCount", 0)
                    total_tokens   = usage.get("totalTokenCount", 0)
                    provider_label = "Google Gemini"

                else:
                    response = await client.post(
                        "https://api.openai.com/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {api_key}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": actual_model_name,
                            "messages": build_openai_messages(history, system_intro, full_prompt),
                        },
                    )
                    response.raise_for_status()
                    data = response.json()

                    reply_text     = data["choices"][0]["message"]["content"]
                    usage          = data.get("usage", {})
                    prompt_tokens  = usage.get("prompt_tokens", 0)
                    comp_tokens    = usage.get("completion_tokens", 0)
                    total_tokens   = usage.get("total_tokens", 0)
                    provider_label = "OpenAI (Custom)"

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
                await run_in_threadpool(add_log_to_db, log_entry)

                # Konuşma geçmişine kaydet (sadece ham mesajlar, RAG bağlamı değil)
                await run_in_threadpool(_save_to_history, session_id, user_message, reply_text, actual_model_name)

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
                "provider":         "Google Gemini" if is_gemini else "OpenAI (Custom)",
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
    ) -> AsyncGenerator[str, None]:
        """
        SSE formatında text chunk'ları yield eder.
        Her chunk: 'data: <json>\n\n'  (type: 'chunk' | 'done' | 'error')
        """
        models = await run_in_threadpool(get_user_models)
        if not models:
            yield f"data: {json.dumps({'type': 'error', 'text': '❌ Kayıtlı model bulunamadı. Ayarlar → Yapay Zeka Modelleri kısmından ekleyin.'})}\n\n"
            return

        active_model = models[0]
        model_name   = active_model["name"]
        api_key      = active_model["api_key"]
        start_time   = time.time()

        # RAG bağlamı
        ui_action = None
        if file_name:
            rag_context, rag_sources, ui_action = await run_in_threadpool(_build_file_context, user_message, file_name, collection_name)
            system_intro = get_file_qa_prompt(file_name)
        else:
            rag_context, rag_sources, ui_action = await run_in_threadpool(_build_semantic_context, user_message, collection_name=collection_name)
            system_intro = get_general_rag_prompt()

        # ── Chat-RAG ─────────────────────────────────────────────────────────
        chat_memory_text = await run_in_threadpool(_fetch_chat_memory, session_id, user_message)
        system_intro = attach_chat_memory(system_intro, chat_memory_text)
        
        full_prompt = build_full_prompt(system_intro, rag_context, user_message)

        is_gemini = "gemini" in model_name.lower() or api_key.startswith("AIza")
        actual_model_name = model_name
        if is_gemini:
            invalid_names = ["gemini", "google gemini", "google", "gemini ai", "gemini-pro"]
            if model_name.lower().strip() in invalid_names or "1.5" in model_name:
                actual_model_name = "gemini-1.5-pro" if "pro" in model_name.lower() else "gemini-1.5-flash"
            elif "2.0" in model_name:
                actual_model_name = "gemini-2.0-flash"

        # ── Konuşma geçmişi ──────────────────────────────────────────────
        history = await run_in_threadpool(_get_history, session_id)

        full_reply = ""
        prompt_tokens = 0
        comp_tokens   = 0
        total_tokens  = 0

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                if is_gemini:
                    # Gemini streaming endpoint
                    url = (
                        f"https://generativelanguage.googleapis.com/v1beta/models/"
                        f"{actual_model_name}:streamGenerateContent?alt=sse&key={api_key}"
                    )
                    payload = {
                        "systemInstruction": {"parts": [{"text": system_intro}]},
                        "contents": build_gemini_contents(history, full_prompt),
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
                    provider_label = "Google Gemini"

                else:
                    # OpenAI streaming endpoint
                    async with client.stream(
                        "POST",
                        "https://api.openai.com/v1/chat/completions",
                        headers={
                            "Authorization": f"Bearer {api_key}",
                            "Content-Type": "application/json",
                        },
                        json={
                            "model": actual_model_name,
                            "messages": build_openai_messages(history, system_intro, full_prompt),
                            "stream": True,
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
                    provider_label = "OpenAI (Custom)"

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
            await run_in_threadpool(add_log_to_db, log_entry)

            # Konuşma geçmişine kaydet
            await run_in_threadpool(_save_to_history, session_id, user_message, full_reply, actual_model_name)

            # done sinyali
            yield f"data: {json.dumps({'type': 'done', 'rag_used': bool(rag_context), 'rag_sources': rag_sources, 'ui_action': ui_action})}\n\n"

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
                "provider":         "Google Gemini" if is_gemini else "OpenAI (Custom)",
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
            yield f"data: {json.dumps({'type': 'error', 'text': f'❌ Sistemsel hata: {str(e)}'})}\n\n"
    # ──────────────────────────────────────────────────────────────────────────


ai_service = AIService()
