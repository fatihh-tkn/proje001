import httpx
import uuid
import time
from datetime import datetime
from core.monitor_db import get_user_models, add_log_to_db

# ── Sabitler ─────────────────────────────────────────────────────────────────
# Dosya-özelinde modda maksimum kaç chunk gönderilsin (token aşımı önleme)
FILE_MODE_MAX_CHUNKS   = 40
# Genel RAG modunda kaç sonuç
GENERAL_RAG_TOP_K      = 5
# Chunk başına karakter limiti (çok uzun chunk'ları kırp)
CHUNK_CHAR_LIMIT       = 2000
# ─────────────────────────────────────────────────────────────────────────────


def _truncate(text: str, limit: int = CHUNK_CHAR_LIMIT) -> str:
    if len(text) <= limit:
        return text
    return text[:limit] + f"\n...[{len(text) - limit} karakter kırpıldı]"


def _build_file_context(
    file_name: str,
    collection_name: str | None,
) -> tuple[str, list[str]]:
    """
    Sürüklenen dosyanın TÜM chunk'larını sayfa sırasıyla getirir.
    Çok fazla chunk varsa en fazla FILE_MODE_MAX_CHUNKS alır.
    Döner: (context_metni, kaynak_listesi)
    """
    try:
        from services.chroma_service import chroma_service
        all_collections = chroma_service.list_collections()
        if not all_collections:
            return "", []

        target_cols = [collection_name] if collection_name else all_collections
        all_chunks: list[dict] = []

        for col in target_cols:
            if col not in all_collections:
                continue
            try:
                chunks = chroma_service.get_documents_by_source(col, file_name)
                all_chunks.extend(chunks)
            except Exception as e:
                print(f"[RAG-FILE] Koleksiyon '{col}' okunamadı: {e}")

        if not all_chunks:
            # Belki dosya hafızaya kaydedilmemiş – semantic fallback
            return _build_semantic_context(file_name=file_name, user_message=file_name,
                                           collection_name=collection_name, top_k=10)

        # Maksimum chunk sınırla
        chunks_to_use = all_chunks[:FILE_MODE_MAX_CHUNKS]

        parts: list[str] = []
        sources: set[str] = set()

        for c in chunks_to_use:
            meta   = c.get("metadata", {})
            src    = meta.get("source", file_name)
            page   = meta.get("page", "")
            ctype  = meta.get("type", "text")
            text   = _truncate(c.get("text", "").strip())
            if not text:
                continue

            header = f"[{src}" + (f" | Sayfa {page}" if page else "") + (f" | {ctype}" if ctype != "text" else "") + "]"
            parts.append(f"{header}\n{text}")
            sources.add(f"{src}" + (f" (s.{page})" if page else ""))

        return "\n\n---\n\n".join(parts), sorted(sources)

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
        sources: list[str] = []

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
                    label  = f"{src} (s.{page})" if page else src
                    if label not in sources:
                        sources.append(label)
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
            # DOSYA-ÖZELİNDE MOD: dosyanın tüm chunk'larını sayfa sırasıyla al
            rag_context, rag_sources = _build_file_context(file_name, collection_name)
            system_intro = (
                f"Sen çok yetenekli bir belge analiz asistanısın. "
                f"Kullanıcı sana '{file_name}' adlı dosyayı sürükleyerek bu belge hakkında "
                f"derinlemesine bir soru sormak istiyor.\n\n"
                f"Aşağıda bu dosyanın SAYFA SIRALIYLA alınan tüm bölümleri yer almaktadır "
                f"({len(rag_sources)} kayıt). Lütfen:\n"
                f"• Belgeyi başından sonuna kadar dikkate al.\n"
                f"• Soruyu bu belgeye dayanarak kapsamlı şekilde yanıtla.\n"
                f"• Yanıtlamak için yeterli bilgi yoksa bunu açıkça belirt.\n"
                f"• Sayfa numaralarına atıfta bulun (örn. 'Sayfa 3'e göre...').\n\n"
            )
        else:
            # GENEL MOD: anlam bazlı arama
            rag_context, rag_sources = _build_semantic_context(user_message, collection_name=collection_name)
            system_intro = (
                "Sen çok yetenekli bir asistansın. Aşağıda kullanıcının sistemine yüklenmiş "
                "belgelerden elde edilen ilgili bilgiler yer almaktadır. Bu bilgileri kullanarak "
                "soruyu cevapla. Eğer bilgi bulunmuyorsa kendi genel bilginle yanıt ver.\n\n"
            )

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

        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                if is_gemini:
                    url = (
                        f"https://generativelanguage.googleapis.com/v1beta/models/"
                        f"{actual_model_name}:generateContent?key={api_key}"
                    )
                    payload = {"contents": [{"parts": [{"text": full_prompt}]}]}
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
                            "messages": [{"role": "user", "content": full_prompt}],
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
                    "sessionId":        "default_chat",
                    "role":             "user",
                    "error":            None,
                    "request":          user_message,
                    "response":         reply_text,
                    "ip":               "127.0.0.1",
                    "mac":              "00:00:00:00",
                    "rag_used":         bool(rag_context),
                    "rag_file":         file_name or "",
                }
                add_log_to_db(log_entry)

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
                "sessionId":        "default_chat",
                "role":             "user",
                "error":            error_code,
                "request":          user_message,
                "response":         f"API Hatası: {error_msg}",
                "ip":               "127.0.0.1",
                "mac":              "00:00:00:00",
                "rag_used":         False,
            }
            add_log_to_db(log_entry)
            return f"❌ API Hatası: {error_msg}", False, []

        except Exception as e:
            return f"❌ Sistemsel bir hata oluştu: {str(e)}", False, []


ai_service = AIService()
