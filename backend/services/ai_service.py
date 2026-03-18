import httpx
import uuid
import time
import json
from datetime import datetime
from typing import AsyncGenerator
from core.monitor_db import get_user_models, add_log_to_db

# ── Sabitler ─────────────────────────────────────────────────────────────────
FILE_MODE_MAX_CHUNKS   = 40
GENERAL_RAG_TOP_K      = 5
CHUNK_CHAR_LIMIT       = 2000
# Bir session'da tutulacak maksimum tur sayısı (1 tur = 1 kullanıcı + 1 AI mesajı)
# Sadece doğal akış için son 2 mesajı in-memory tutarız. Ana hafıza Chat-RAG (ChromaDB) olacak.
MAX_HISTORY_TURNS      = 2
# ─────────────────────────────────────────────────────────────────────────────

# ── Session konuşma hafızası (in-memory) ───────────────────────────────────
# {session_id: [{"role": "user"|"assistant", "text": "..."}, ...]}
_session_history: dict[str, list[dict]] = {}


def _get_history(session_id: str) -> list[dict]:
    return list(_session_history.get(session_id, []))


def _save_to_history(session_id: str, user_text: str, ai_text: str) -> None:
    if session_id not in _session_history:
        _session_history[session_id] = []
    _session_history[session_id].append({"role": "user",      "text": user_text})
    _session_history[session_id].append({"role": "assistant", "text": ai_text})
    # Çok büyümemesi için eski mesajları kırp
    max_msgs = MAX_HISTORY_TURNS * 2
    if len(_session_history[session_id]) > max_msgs:
        _session_history[session_id] = _session_history[session_id][-max_msgs:]

    # ── Chat-RAG Kayıt (Maliyet Kurtaran Anlamsal Hafıza) ──
    try:
        from services.chroma_service import chroma_service
        # Session ID'den güvenli bir koleksiyon adı oluştur (tireleri alt çizgi yap vb.)
        safe_col_name = f"chat_mem_{session_id}".replace("-", "_")
        
        doc_text = f"Kullanıcı dedi ki: {user_text}\nAI Cevap Verdi: {ai_text}"
        chroma_service.add_documents(
            collection_name=safe_col_name,
            documents=[doc_text],
            metadatas=[{"type": "chat_log", "time": time.time()}],
            ids=[f"msg_{uuid.uuid4().hex[:8]}"]
        )
    except Exception as e:
        print(f"[CHAT-RAG SAVE ERROR]: {e}")


def clear_session_history(session_id: str) -> None:
    """Session silindiğinde çağrılır."""
    _session_history.pop(session_id, None)
    try:
        from services.chroma_service import chroma_service
        safe_col_name = f"chat_mem_{session_id}".replace("-", "_")
        chroma_service.delete_collection(safe_col_name)
    except Exception:
        pass
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
) -> tuple[str, list[dict]]:
    """
    2 KATMANLI BAĞLAM MİMARİSİ:

    Katman 1 — Belge Özeti (document_summary chunk, page=0):
        Her sorguda otomatik olarak eklenir. AI "bu belge ne?" sorusunu
        her zaman bilir. MM01 = Malzeme Yönetimi Modülü gibi genel bağlam
        kaybolmaz.

    Katman 2 — Sayfa-Çeşitli Toplama:
        ChromaDB'den 40 aday alınır, her sayfadan 1 en iyi chunk seçilir.
        Böylece belgenin farklı bölgelerinden max_pages sayfa gelir.
    """
    try:
        from services.chroma_service import chroma_service
        all_collections = chroma_service.list_collections()
        if not all_collections:
            return "", []

        target_cols = [collection_name] if collection_name else all_collections

        parts: list[str] = []
        sources: list[dict] = []
        seen_keys: set[str] = set()

        for col in target_cols:
            if col not in all_collections:
                continue
            try:
                # ── KATMAN 1: Belge Özeti (document_summary) ────────────────
                # page=0 olan chunk'ı doğrudan sorgula (her zaman ekle)
                try:
                    summary_results = chroma_service.query(
                        collection_name=col,
                        query_texts=[file_name],   # Belge adıyla ara
                        n_results=1,
                        where={"$and": [{"source": file_name}, {"page": 0}]}
                    )
                    s_docs_list = summary_results.get("documents")
                    if s_docs_list and len(s_docs_list) > 0 and s_docs_list[0]:
                        s_docs = s_docs_list[0]
                        if s_docs and s_docs[0].strip():
                            parts.insert(0, f"=== BELGE GENEL BAĞLAMI ===\n{s_docs[0][:2000]}")
                            # Özet chunk sekme olarak açılmaz (page=0), sadece AI bağlamı için
                except Exception as ex:
                    print(f"[RAG] Summary fetch hatası: {ex}")
                    pass

                # ── KATMAN 2: Sayfa-Çeşitli Toplama ────────────────────────
                results = chroma_service.query(
                    collection_name=col,
                    query_texts=[user_message],
                    n_results=min(top_k_candidates, 40),
                    where={"source": file_name}
                )

                doc_list = results.get("documents")
                meta_list = results.get("metadatas")

                docs = doc_list[0] if doc_list and len(doc_list) > 0 else []
                metas = meta_list[0] if meta_list and len(meta_list) > 0 else []

                # Aday listesi (page=0 olan özet chunk'ları hariç tut)
                all_candidates: list[tuple[str, dict, int]] = []
                for rank, (doc, meta) in enumerate(zip(docs, metas)):
                    if meta.get("page", 1) == 0:
                        continue  # Özet chunk zaten Katman 1'de eklendi
                    all_candidates.append((doc, meta, rank))

                # Her sayfadan en iyi 1 chunk seç
                best_per_page: dict[str, tuple[str, dict, int]] = {}
                for doc, meta, rank in all_candidates:
                    page     = str(meta.get("page", "0"))
                    src      = meta.get("source", file_name)
                    page_key = f"{src}_p{page}"
                    if page_key not in best_per_page:
                        best_per_page[page_key] = (doc, meta, rank)
                    elif rank < best_per_page[page_key][2]:
                        best_per_page[page_key] = (doc, meta, rank)

                # Rank'a göre sırala ve max_pages ile sınırla
                selected = sorted(best_per_page.values(), key=lambda x: x[2])[:max_pages]

                for doc, meta, _ in selected:
                    src   = meta.get("source", file_name)
                    page  = meta.get("page", "")
                    ctype = meta.get("type", "text")
                    text  = _truncate(doc.strip())
                    if not text:
                        continue

                    header = (
                        f"[{src}"
                        + (f" | Sayfa {page}" if page else "")
                        + (f" | {ctype}" if ctype not in ("text", "multimodal_text_with_bbox") else "")
                        + "]"
                    )
                    parts.append(f"{header}\n{text}")

                    source_key = f"{src}_p{page}_{meta.get('bbox', '')}"
                    if source_key not in seen_keys and page:
                        sources.append({
                            "file": src,
                            "page": page,
                            "bbox": meta.get("bbox", ""),
                            "image_path": meta.get("image_path", "")
                        })
                        seen_keys.add(source_key)

            except Exception as e:
                print(f"[RAG-FILE] Koleksiyon '{col}' okunamadı: {e}")

        if not parts:
            return _build_semantic_context(
                user_message=user_message,
                file_name=file_name,
                collection_name=collection_name,
                top_k=max_pages,
            )

        return "\n\n---\n\n".join(parts), sources

    except Exception as e:
        print(f"[RAG-FILE] Hata: {e}")
        return "", []


def _build_semantic_context(
    user_message: str,
    file_name: str | None = None,
    collection_name: str | None = None,
    top_k: int = GENERAL_RAG_TOP_K,
) -> tuple[str, list[str]]:
    """
    Semantic (anlam bazlı) arama – genel RAG modu.
    file_name verilirse sadece o kaynak filtrelenir.
    """
    try:
        from services.chroma_service import chroma_service
        all_collections = chroma_service.list_collections()
        if not all_collections:
            return "", []

        target_cols = [collection_name] if collection_name else all_collections
        parts:   list[str] = []
        sources: list[dict] = []
        seen_keys = set()

        for col in target_cols:
            if col not in all_collections:
                continue
            try:
                results = chroma_service.query(
                    collection_name=col,
                    query_texts=[user_message],
                    n_results=top_k,
                )
                docs  = results.get("documents", [[]])[0]
                metas = results.get("metadatas", [[]])[0]

                for doc, meta in zip(docs, metas):
                    src  = meta.get("source", col)
                    page = meta.get("page", "")

                    if file_name and src != file_name:
                        continue

                    header = f"[Kaynak: {src}" + (f", Sayfa {page}" if page else "") + "]"
                    parts.append(f"{header}\n{_truncate(doc)}")
                    
                    source_key = f"{src}_p{page}_{meta.get('bbox', '')}"
                    if source_key not in seen_keys:
                        sources.append({
                            "file": src,
                            "page": page,
                            "bbox": meta.get("bbox", ""),
                            "image_path": meta.get("image_path", "")
                        })
                        seen_keys.add(source_key)
            except Exception:
                continue

        return "\n\n---\n\n".join(parts), sources

    except Exception as e:
        print(f"[RAG-SEMANTIC] Hata: {e}")
        return "", []


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
    ) -> tuple[str, bool, list[str]]:
        """
        Döner: (yanıt_metni, rag_kullanıldı_mı, kaynak_listesi)
        """
        models = get_user_models()
        if not models:
            return (
                "❌ Hata: Kayıtlı hiçbir yapay zeka modeli bulunamadı. "
                "Lütfen önce 'Ayarlar -> Yapay Zeka Modelleri' kısmından bir model ve API anahtarı ekleyin.",
                False,
                [],
            )

        active_model      = models[0]
        model_name        = active_model["name"]
        api_key           = active_model["api_key"]
        start_time        = time.time()

        # ── RAG bağlamı ──────────────────────────────────────────────────────
        if file_name:
            # DOSYA-ÖZELİNDE MOD
            rag_context, rag_sources = _build_file_context(user_message, file_name, collection_name)
            system_intro = (
                f"PROFILIN: Sen çok üst düzey, bağımsız düşünebilen bir yapay zeka ve danışmansın.\n"
                f"KULLANICI TALEBİ: Sana bir soru soruyor ve arka planda '{file_name}' adlı belgenin veritabanı tarama sonuçlarını (gizli bağlam olarak) sağlıyor.\n\n"
                f"KATI KURALLAR:\n"
                f"1. KESİNLİKLE belgeyi özetleme, 'Belgede şu yazıyor' diye madde madde sayma veya metni kopyala-yapıştır yapma!\n"
                f"2. Kullanıcının ne istediğini ANLA ve sanki hiçbir belge yokmuş gibi, DİREKT konuyu anlatan, çözüm sunan, kendi yorumlarını katan bir cevap yaz.\n"
                f"3. Gelen veritabanı sonuçlarını sadece 'kendi bilgini zenginleştirmek' ve 'haklı çıkmak' için arka planda kullan.\n"
                f"4. Eğer veritabanından aldığın güzel bir koordinat veya spesifik bir bilgi varsa bunu doğal cümlenin akışı içinde yedir ve cümlenin veya paragrafın sonuna [Sayfa X] yaz. Böylece sistem o resmi otomatik açabilsin.\n"
                f"Örnek Kötü Cevap: 'Sözleşmenin 2. sayfasında fesih hakkından bahsedilmiştir.'\n"
                f"Örnek İyi Cevap: 'Fesih hakkı ticari anlaşmalarda senin gözetmen gereken en büyük detaydır. Sizin koşullarınızda da gördüğüm kadarıyla bu durum gayet net güvenceye alınmış [Sayfa 2]. Buna ek olarak...'\n\n"
            )
        else:
            # GENEL MOD: anlam bazlı arama
            rag_context, rag_sources = _build_semantic_context(user_message, collection_name=collection_name)
            system_intro = (
                "Sen çok yetenekli bir asistansın. Aşağıda kullanıcının sistemine yüklenmiş "
                "belgelerden elde edilen ilgili bilgiler yer almaktadır. Bu bilgileri kullanarak "
                "soruyu cevapla. Eğer bilgi bulunmuyorsa kendi genel bilginle yanıt ver.\n\n"
            )

        # ── Chat-RAG (Eski Sohbetleri Tarama) ─────────────────────────────────
        chat_memory_text = ""
        try:
            from services.chroma_service import chroma_service
            safe_col_name = f"chat_mem_{session_id}".replace("-", "_")
            # Bu koleksiyon varsa kullanıcının sorusuyla anlamsal eşleşen eski 2 mesajı bul
            if safe_col_name in chroma_service.list_collections():
                results = chroma_service.query(collection_name=safe_col_name, query_texts=[user_message], n_results=2)
                docs = results.get("documents", [[]])[0]
                if docs:
                    chat_memory_text = "\n\n".join(docs)
        except Exception as e:
            print(f"[CHAT-RAG QUERY ERROR]: {e}")

        if chat_memory_text:
            system_intro += (
                "=== ESKİ SOHBET GEÇMİŞİ (HATIRLAMAN GEREKENLER) ===\n"
                "Kullanıcının şu anki sorusuyla bağlantılı olarak daha önce konuştuğunuz bazı konuşma kesitleri aşağıdadır:\n"
                f"{chat_memory_text}\n"
                "====================================================\n\n"
            )
        # ──────────────────────────────────────────────────────────────────────

        if rag_context:
            full_prompt = (
                system_intro
                + "=== BELGE İÇERİĞİ ===\n"
                + rag_context
                + "\n\n=== KULLANICI SORUSU ===\n"
                + user_message
            )
        else:
            # Hafızada kayıt yok – düz soru
            full_prompt = user_message
        # ────────────────────────────────────────────────────────────────────

        is_gemini = "gemini" in model_name.lower() or api_key.startswith("AIza")

        actual_model_name = model_name
        if is_gemini:
            invalid_names = ["gemini", "google gemini", "google", "gemini ai", "gemini-pro"]
            if model_name.lower().strip() in invalid_names or "1.5" in model_name:
                actual_model_name = "gemini-2.5-pro" if "pro" in model_name.lower() else "gemini-2.0-flash"

        # ── Konuşma geçmişi ──────────────────────────────────────────────
        history = _get_history(session_id)

        # Gemini için contents dizisi (user/model rolleri)
        def _build_gemini_contents(current_text: str) -> list[dict]:
            contents = []
            for msg in history:
                role = "user" if msg["role"] == "user" else "model"
                contents.append({"role": role, "parts": [{"text": msg["text"]}]})
            contents.append({"role": "user", "parts": [{"text": current_text}]})
            return contents

        # OpenAI için messages dizisi (user/assistant rolleri)
        def _build_openai_messages(system_text: str, current_text: str) -> list[dict]:
            msgs = [{"role": "system", "content": system_text}]
            for msg in history:
                role = "user" if msg["role"] == "user" else "assistant"
                msgs.append({"role": role, "content": msg["text"]})
            msgs.append({"role": "user", "content": current_text})
            return msgs
        # ───────────────────────────────────────────────────────────────

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                if is_gemini:
                    url = (
                        f"https://generativelanguage.googleapis.com/v1beta/models/"
                        f"{actual_model_name}:generateContent?key={api_key}"
                    )
                    payload = {
                        "systemInstruction": {"parts": [{"text": system_intro}]},
                        "contents": _build_gemini_contents(full_prompt),
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
                            "messages": _build_openai_messages(system_intro, full_prompt),
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
                add_log_to_db(log_entry)

                # Konuşma geçmişine kaydet (sadece ham mesajlar, RAG bağlamı değil)
                _save_to_history(session_id, user_message, reply_text)

                return reply_text, bool(rag_context), rag_sources

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
            add_log_to_db(log_entry)
            return f"❌ API Hatası: {error_msg}", False, []

        except Exception as e:
            return f"❌ Sistemsel bir hata oluştu: {str(e)}", False, []

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
        models = get_user_models()
        if not models:
            yield f"data: {json.dumps({'type': 'error', 'text': '❌ Kayıtlı model bulunamadı. Ayarlar → Yapay Zeka Modelleri kısmından ekleyin.'})}\n\n"
            return

        active_model = models[0]
        model_name   = active_model["name"]
        api_key      = active_model["api_key"]
        start_time   = time.time()

        # RAG bağlamı
        if file_name:
            rag_context, rag_sources = _build_file_context(user_message, file_name, collection_name)
            system_intro = (
                f"PROFILIN: Sen çok üst düzey, bağımsız düşünebilen bir yapay zeka ve danışmansın.\n"
                f"KULLANICI TALEBİ: Sana bir soru soruyor ve arka planda '{file_name}' adlı belgenin veritabanı tarama sonuçlarını (gizli bağlam olarak) sağlıyor.\n\n"
                f"KATI KURALLAR:\n"
                f"1. KESİNLİKLE belgeyi özetleme, 'Belgede şu yazıyor' diye madde madde sayma veya metni kopyala-yapıştır yapma!\n"
                f"2. Kullanıcının ne istediğini ANLA ve sanki hiçbir belge yokmuş gibi, DİREKT konuyu anlatan, çözüm sunan, kendi yorumlarını katan bir cevap yaz.\n"
                f"3. Gelen veritabanı sonuçlarını sadece 'kendi bilgini zenginleştirmek' ve 'haklı çıkmak' için arka planda kullan.\n"
                f"4. Eğer veritabanından aldığın güzel bir koordinat veya spesifik bir bilgi varsa bunu doğal cümlenin akışı içinde yedir ve cümlenin veya paragrafın sonuna [Sayfa X] yaz. Böylece sistem o resmi otomatik açabilsin.\n"
                f"Örnek Kötü Cevap: 'Sözleşmenin 2. sayfasında fesih hakkından bahsedilmiştir.'\n"
                f"Örnek İyi Cevap: 'Fesih hakkı ticari anlaşmalarda senin gözetmen gereken en büyük detaydır. Sizin koşullarınızda da gördüğüm kadarıyla bu durum gayet net güvenceye alınmış [Sayfa 2]. Buna ek olarak...'\n\n"
            )
        else:
            rag_context, rag_sources = _build_semantic_context(user_message, collection_name=collection_name)
            system_intro = (
                "Sen çok yetenekli bir asistansın. Aşağıda kullanıcının sistemine yüklenmiş "
                "belgelerden elde edilen ilgili bilgiler yer almaktadır. Bu bilgileri kullanarak "
                "soruyu cevapla. Eğer bilgi bulunmuyorsa kendi genel bilginle yanıt ver.\n\n"
            )

        # ── Chat-RAG (Eski Sohbetleri Tarama) ─────────────────────────────────
        chat_memory_text = ""
        try:
            from services.chroma_service import chroma_service
            safe_col_name = f"chat_mem_{session_id}".replace("-", "_")
            if safe_col_name in chroma_service.list_collections():
                results = chroma_service.query(collection_name=safe_col_name, query_texts=[user_message], n_results=2)
                docs = results.get("documents", [[]])[0]
                if docs:
                    chat_memory_text = "\n\n".join(docs)
        except Exception as e:
            print(f"[CHAT-RAG QUERY ERROR]: {e}")

        if chat_memory_text:
            system_intro += (
                "=== ESKİ SOHBET GEÇMİŞİ (HATIRLAMAN GEREKENLER) ===\n"
                "Kullanıcının şu anki sorusuyla bağlantılı olarak daha önce konuştuğunuz bazı konuşma kesitleri aşağıdadır:\n"
                f"{chat_memory_text}\n"
                "====================================================\n\n"
            )
        # ──────────────────────────────────────────────────────────────────────

        if rag_context:
            full_prompt = (
                system_intro
                + "=== ARKA PLAN VERİTABANI SONUÇLARI (GİZLİ REFERANS BİLGİSİ) ===\n"
                + rag_context
                + "\n\n=== KULLANICI SORUSU ===\n"
                + user_message
            )
        else:
            full_prompt = user_message

        is_gemini = "gemini" in model_name.lower() or api_key.startswith("AIza")
        actual_model_name = model_name
        if is_gemini:
            invalid_names = ["gemini", "google gemini", "google", "gemini ai", "gemini-pro"]
            if model_name.lower().strip() in invalid_names or "1.5" in model_name:
                actual_model_name = "gemini-2.5-pro" if "pro" in model_name.lower() else "gemini-2.0-flash"

        # ── Konuşma geçmişi ──────────────────────────────────────────────
        history = _get_history(session_id)

        def _build_gemini_contents_s(current_text: str) -> list[dict]:
            contents = []
            for msg in history:
                role = "user" if msg["role"] == "user" else "model"
                contents.append({"role": role, "parts": [{"text": msg["text"]}]})
            contents.append({"role": "user", "parts": [{"text": current_text}]})
            return contents

        def _build_openai_messages_s(system_text: str, current_text: str) -> list[dict]:
            msgs = [{"role": "system", "content": system_text}]
            for msg in history:
                role = "user" if msg["role"] == "user" else "assistant"
                msgs.append({"role": role, "content": msg["text"]})
            msgs.append({"role": "user", "content": current_text})
            return msgs
        # ───────────────────────────────────────────────────────────────

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
                        "contents": _build_gemini_contents_s(full_prompt),
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
                            "messages": _build_openai_messages_s(system_intro, full_prompt),
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
            add_log_to_db(log_entry)

            # Konuşma geçmişine kaydet
            _save_to_history(session_id, user_message, full_reply)

            # done sinyali
            yield f"data: {json.dumps({'type': 'done', 'rag_used': bool(rag_context), 'rag_sources': rag_sources})}\n\n"

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
            add_log_to_db(log_entry)
            yield f"data: {json.dumps({'type': 'error', 'text': f'❌ API Hatası: {error_msg}'})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'text': f'❌ Sistemsel hata: {str(e)}'})}\n\n"
    # ──────────────────────────────────────────────────────────────────────────


ai_service = AIService()
