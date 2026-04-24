def _get_prompt_template(key: str, default: str) -> str:
    """SistemAyari tablosundan prompt şablonunu okur; yoksa default döner."""
    try:
        from database.sql.session import get_session
        from database.sql.models import SistemAyari
        from sqlalchemy import select
        db_key = f"prompt_template_{key}"
        with get_session() as db:
            row = db.scalar(select(SistemAyari).where(SistemAyari.anahtar == db_key))
            if row and row.deger:
                return str(row.deger)
    except Exception:
        pass
    return default


_DEFAULT_FILE_QA = (
    "PROFILIN: Sen çok üst düzey, bağımsız düşünebilen bir yapay zeka ve danışmansın.\n"
    "KULLANICI TALEBİ: Sana bir soru soruyor ve arka planda '{file_name}' adlı belgenin veritabanı tarama sonuçlarını (gizli bağlam olarak) sağlıyor.\n\n"
    "KATI KURALLAR:\n"
    "1. KESİNLİKLE belgeyi özetleme, 'Belgede şu yazıyor' diye madde madde sayma veya metni kopyala-yapıştır yapma!\n"
    "2. Kullanıcının ne istediğini ANLA ve sanki hiçbir belge yokmuş gibi, DİREKT konuyu anlatan, çözüm sunan, kendi yorumlarını katan bir cevap yaz.\n"
    "3. Gelen veritabanı sonuçlarını sadece 'kendi bilgini zenginleştirmek' ve 'haklı çıkmak' için arka planda kullan.\n"
    "4. Yan sekmede dökümanı referans gösterecek bir ui_action arayüze dönecek, o yüzden ekrana çok uzun metinler yazıp kalabalık yapma.\n"
    "Örnek İyi Cevap: 'Fesih hakkı ticari anlaşmalarda senin gözetmen gereken en büyük detaydır. Sizin koşullarınızda da gördüğüm kadarıyla bu durum gayet net güvenceye alınmış. Yan ekrandan ilgili sayfayı sizin için açtım...'\n\n"
)

_DEFAULT_GENERAL_RAG = (
    "Sen çok yetenekli bir asistansın. Aşağıda kullanıcının sistemine yüklenmiş "
    "belgelerden elde edilen ilgili bilgiler yer almaktadır. Bu bilgileri kullanarak "
    "soruyu cevapla. Eğer bilgi bulunmuyorsa kendi genel bilginle yanıt ver.\n\n"
)

_DEFAULT_CHAT_MEMORY = (
    "=== ESKİ SOHBET GEÇMİŞİ (HATIRLAMAN GEREKENLER) ===\n"
    "Kullanıcının şu anki sorusuyla bağlantılı olarak daha önce konuştuğunuz bazı konuşma kesitleri aşağıdadır:\n"
    "{chat_memory}\n"
    "====================================================\n\n"
)


def get_file_qa_prompt(file_name: str) -> str:
    template = _get_prompt_template("file_qa", _DEFAULT_FILE_QA)
    return template.replace("{file_name}", file_name)


def get_general_rag_prompt() -> str:
    return _get_prompt_template("general_rag", _DEFAULT_GENERAL_RAG)


def attach_chat_memory(system_intro: str, chat_memory_text: str) -> str:
    if not chat_memory_text:
        return system_intro
    template = _get_prompt_template("chat_memory", _DEFAULT_CHAT_MEMORY)
    block = template.replace("{chat_memory}", chat_memory_text)
    return system_intro + block


def build_full_prompt(system_intro: str, rag_context: str, user_message: str) -> str:
    if rag_context:
        return (
            system_intro
            + "=== ARKA PLAN VERİTABANI SONUÇLARI (GİZLİ REFERANS BİLGİSİ) ===\n"
            + rag_context
            + "\n\n=== KULLANICI SORUSU ===\n"
            + user_message
        )
    return user_message


def build_gemini_contents(history: list[dict], current_text: str) -> list[dict]:
    contents = []
    for msg in history:
        role = "user" if msg["role"] == "user" else "model"
        contents.append({"role": role, "parts": [{"text": msg["text"]}]})
    contents.append({"role": "user", "parts": [{"text": current_text}]})
    return contents


def build_openai_messages(history: list[dict], system_text: str, current_text: str) -> list[dict]:
    msgs = [{"role": "system", "content": system_text}]
    for msg in history:
        role = "user" if msg["role"] == "user" else "assistant"
        msgs.append({"role": role, "content": msg["text"]})
    msgs.append({"role": "user", "content": current_text})
    return msgs
