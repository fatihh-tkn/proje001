import httpx
import uuid
import time
import json
from datetime import datetime
from typing import AsyncGenerator
from fastapi.concurrency import run_in_threadpool
from core.db_bridge import get_user_models, add_log_to_db, get_ai_agent
from core.prompts import (
    get_file_qa_prompt,
    get_general_rag_prompt,
    attach_chat_memory,
    build_full_prompt,
    build_gemini_contents,
    build_openai_messages
)
def _get_user_excluded_files(user_id: str | None) -> list[str]:
    """Kullanıcının meta verisinden erişimi kapalı dosyaların SQL ID'lerini döner."""
    if not user_id:
        return []
    try:
        from database.sql.session import get_session
        from database.sql.models import Kullanici, Belge
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


# ── Sabitler (SQL Veritabanı Sistem Ayarları) ──────────────────────────────────────────
class AppSettings:
    @staticmethod
    def _get(key: str, default):
        try:
            from core.db_bridge import get_system_settings
            val = get_system_settings().get(key)
            return type(default)(val) if val is not None else default
        except Exception:
            return default

    @property
    def FILE_MODE_MAX_CHUNKS(self) -> int: return self._get("FILE_MODE_MAX_CHUNKS", 40)
    @property
    def GENERAL_RAG_TOP_K(self) -> int: return self._get("GENERAL_RAG_TOP_K", 10)
    @property
    def CHUNK_CHAR_LIMIT(self) -> int: return self._get("CHUNK_CHAR_LIMIT", 2000)
    @property
    def MAX_HISTORY_TURNS(self) -> int: return self._get("MAX_HISTORY_TURNS", 2)
    @property
    def LLM_PRE_FILTER_DISTANCE_THRESHOLD(self) -> float: return self._get("LLM_PRE_FILTER_DISTANCE_THRESHOLD", 1.6)

SETTINGS = AppSettings()
# ─────────────────────────────────────────────────────────────────────────────

# ── Session konuşma hafızası (SQLite) ───────────────────────────────────

def _get_history(session_id: str) -> list[dict]:
    from database.sql.session import get_session
    from database.sql.repositories.chat_repo import ChatRepository
    with get_session() as db:
        repo = ChatRepository(db)
        messages = repo.get_messages(session_id, limit=SETTINGS.MAX_HISTORY_TURNS * 2)
        out = []
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
        print(f"[CHAT-RAG SAVE ERROR]: {e}")

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
    except Exception:
        pass

def _fetch_chat_memory(session_id: str, query: str) -> str:
    try:
        from database.vector.pgvector_db import vector_db
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



def _truncate(text: str, limit: int = None) -> str:
    limit = limit or SETTINGS.CHUNK_CHAR_LIMIT
    if len(text) <= limit:
        return text
    return text[:limit] + f"\n...[{len(text) - limit} karakter kırpıldı]"


def _build_file_context(
    user_message: str,
    file_name: str,
    collection_name: str | None,
    top_k_candidates: int = 40,
    max_pages: int = 8,
    excluded_file_ids: list[str] = None,
    allowed_pools: list[str] = None
) -> tuple[str, list[dict], dict | None]:
    return _build_semantic_context(
        user_message=user_message,
        file_name=file_name,
        collection_name=collection_name,
        top_k=max_pages,
        excluded_file_ids=excluded_file_ids,
        allowed_pools=allowed_pools
    )


def _build_semantic_context(
    user_message: str,
    file_name: str | None = None,
    collection_name: str | None = None,
    top_k: int = None,
    excluded_file_ids: list[str] = None,
    allowed_pools: list[str] = None
) -> tuple[str, list[dict], dict | None]:
    """
    RAG Pipeline Optimizasyonu:
    1. ChromaDB'den vektörel anlamsal sonuçları getir (Aşama 1).
    2. DocumentRepository üzerinden SQLite JOIN yaparak ilgili metinleri, relations tablosunu ve location_marker'ı çek (Aşama 2 & 3).
    3. LLM_PRE_FILTER_DISTANCE_THRESHOLD eşiğindeki sonuçları reddet.
    """
    top_k = top_k or SETTINGS.GENERAL_RAG_TOP_K
    try:
        from database.vector.pgvector_db import vector_db
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
                    if dist <= SETTINGS.LLM_PRE_FILTER_DISTANCE_THRESHOLD:
                        filtered_ids.append(cid)
                
                if not filtered_ids:
                    continue

                # Aşama 2: ChunkGraph ile komşu genişletmesi (NEXT/PREV/SEMANTIC)
                try:
                    from database.graph.networkx_db import chunk_graph
                    expanded_ids = chunk_graph.expand(filtered_ids)
                except Exception:
                    expanded_ids = filtered_ids

                # Aşama 3: Graf Genişletmesi ve SQLite JOIN
                with get_session() as db:
                    repo = DocumentRepository(db)
                    rich_contexts = repo.node_ids_to_context(expanded_ids[:top_k])

                    for ctx in rich_contexts:
                        doc_info = ctx["document"]
                        src = doc_info["filename"]
                        
                        if file_name and src != file_name:
                            continue
                            
                        # Dosya ajan ayarlarında yasaklanmışsa (erişim kapatılmışsa) bu sonucu yoksay
                        if excluded_file_ids and doc_info.get("id") in excluded_file_ids:
                            continue

                        # Havuz yetki kontrolü (Beyaz liste - Inclusion)
                        if allowed_pools:
                            f_type = (doc_info.get("dosya_turu") or doc_info.get("file_type") or "").lower().replace(".", "")
                            AUDIO_EXTS = {"mp3", "wav", "ogg", "m4a", "flac", "aac", "opus", "wma", "mp4", "avi", "mov", "mkv", "webm", "m4v", "wmv"}
                            
                            # Mantık: UI tarafında Ses/Video "rag_2", diğer belgeler "rag_1" havuzuna atandı.
                            pool_id = "rag_2" if f_type in AUDIO_EXTS else "rag_1"
                            
                            if pool_id not in allowed_pools:
                                continue

                        marker = ctx["location_marker"]
                        content = ctx["content"]
                        page    = ctx.get("page")
                        bbox    = ctx.get("bbox")
                        doc_info = ctx["document"]
                        pdf_path = doc_info.get("pdf_path") or doc_info.get("file_path") or ""

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
                        if not best_ui_action:
                            # PDF URL oluştur (fiziksel yol → API endpoint)
                            import urllib.parse
                            pdf_url = (
                                f"/api/archive/file/{doc_info.get('id')}"
                                if doc_info.get("id")
                                else ""
                            )
                            best_ui_action = {
                                "command":     "OPEN_PDF_AT",
                                "pdf_url":     pdf_url,
                                "source_file": src,
                                "page":        page,
                                "bbox":        bbox,
                                "doc_id":      doc_info.get("id"),
                            }

                        sources.append({
                            "file":             src,
                            "location_marker":  marker,
                            "chroma_id":        ctx["chroma_id"],
                            "page":             page,
                            "bbox":             bbox,
                            "doc_id":           doc_info.get("id"),
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
        user_id: str | None = None,
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

        # Ajan Ayarlarını SQL'den Çek
        agent_config = await run_in_threadpool(get_ai_agent, "chatbot")
        temperature = 0.7
        excluded_files = []
        allowed_pools = []
        if agent_config:
            allowed_rags = agent_config.get("allowed_rags") or []
            excluded_files = [str(r)[1:] for r in allowed_rags if str(r).startswith("!")]
            allowed_pools = [str(r) for r in allowed_rags if not str(r).startswith("!")]
            temperature = agent_config.get("temperature", 0.7)

        # Kullanıcı bazlı belge kısıtlaması
        user_excluded = await run_in_threadpool(_get_user_excluded_files, user_id)
        if user_excluded:
            excluded_files = list(set(excluded_files) | set(user_excluded))

        # ── RAG bağlamı ──────────────────────────────────────────────────────
        if file_name:
            rag_context, rag_sources, ui_action = await run_in_threadpool(_build_file_context, user_message, file_name, collection_name, excluded_file_ids=excluded_files, allowed_pools=allowed_pools)
            system_intro = get_file_qa_prompt(file_name)
        else:
            rag_context, rag_sources, ui_action = await run_in_threadpool(_build_semantic_context, user_message, collection_name=collection_name, excluded_file_ids=excluded_files, allowed_pools=allowed_pools)
            system_intro = get_general_rag_prompt()

        if agent_config and agent_config.get("prompt"):
            system_intro = f"{agent_config['prompt']}\n\n{system_intro}"

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
                        "generationConfig": {
                            "temperature": temperature
                        }
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
                            "temperature": temperature
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
        user_id: str | None = None,
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

        # Ajan Ayarlarını SQL'den Çek
        agent_config = await run_in_threadpool(get_ai_agent, "chatbot")
        temperature = 0.7
        excluded_files = []
        allowed_pools = []
        if agent_config:
            allowed_rags = agent_config.get("allowed_rags") or []
            excluded_files = [str(r)[1:] for r in allowed_rags if str(r).startswith("!")]
            allowed_pools = [str(r) for r in allowed_rags if not str(r).startswith("!")]
            temperature = agent_config.get("temperature", 0.7)

        # Kullanıcı bazlı belge kısıtlaması
        user_excluded = await run_in_threadpool(_get_user_excluded_files, user_id)
        if user_excluded:
            excluded_files = list(set(excluded_files) | set(user_excluded))

        # RAG bağlamı
        ui_action = None
        if file_name:
            rag_context, rag_sources, ui_action = await run_in_threadpool(_build_file_context, user_message, file_name, collection_name, excluded_file_ids=excluded_files, allowed_pools=allowed_pools)
            system_intro = get_file_qa_prompt(file_name)
        else:
            rag_context, rag_sources, ui_action = await run_in_threadpool(_build_semantic_context, user_message, collection_name=collection_name, excluded_file_ids=excluded_files, allowed_pools=allowed_pools)
            system_intro = get_general_rag_prompt()
            
        if agent_config and agent_config.get("prompt"):
            system_intro = f"{agent_config['prompt']}\n\n{system_intro}"

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
            # Sadece sohbetsel veriyi (History DB) kaydet! (Issue 5 - Normalization)
            await run_in_threadpool(
                _save_to_history,
                session_id, user_message, full_reply,
                actual_model_name,
                rag_sources,
            )

            await run_in_threadpool(add_log_to_db, log_entry)

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

    @staticmethod
    async def revise_prompt(user_prompt: str) -> str:
        """İstem Revize Botu'nu kullanarak prompt'u iyileştirir."""
        agent_config = await run_in_threadpool(get_ai_agent, agent_id="sys_agent_prompt_001")
        if not agent_config:
            # Fallback olarak varsayılan bir iyileştirme isteği gönder
            system_prompt = "Kullanıcının girdiği istemi (prompt) yapay zeka tarafından çok daha iyi anlaşılabilecek, net ve profesyonel bir talimata dönüştür. Asla kendi başına cevap verme, sadece revize et."
            temperature = 0.3
        else:
            system_prompt = agent_config.get("prompt", "Kullanıcının girdiği istemi profesyonelleştir.")
            temperature = agent_config.get("temperature", 0.3)

        models = await run_in_threadpool(get_user_models)
        if not models:
            raise ValueError("Kayıtlı hiçbir yapay zeka modeli bulunamadı.")

        active_model = models[0]
        model_name = active_model["name"]
        api_key = active_model["api_key"]

        is_gemini = "gemini" in model_name.lower() or api_key.startswith("AIza")
        actual_model_name = model_name
        if is_gemini:
            invalid_names = ["gemini", "google gemini", "google", "gemini ai", "gemini-pro"]
            if model_name.lower().strip() in invalid_names or "1.5" in model_name:
                actual_model_name = "gemini-1.5-pro" if "pro" in model_name.lower() else "gemini-1.5-flash"
            elif "2.0" in model_name:
                actual_model_name = "gemini-2.0-flash"

        async with httpx.AsyncClient(timeout=60.0) as client:
            if is_gemini:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{actual_model_name}:generateContent?key={api_key}"
                payload = {
                    "systemInstruction": {"parts": [{"text": system_prompt}]},
                    "contents": [{"parts": [{"text": user_prompt}]}],
                    "generationConfig": {"temperature": temperature}
                }
                response = await client.post(url, headers={"Content-Type": "application/json"}, json=payload)
                response.raise_for_status()
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
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                    json={"model": actual_model_name, "messages": messages, "temperature": temperature},
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"].strip()


ai_service = AIService()
