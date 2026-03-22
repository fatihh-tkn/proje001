def get_file_qa_prompt(file_name: str) -> str:
    return (
        f"PROFILIN: Sen çok üst düzey, bağımsız düşünebilen bir yapay zeka ve danışmansın.\n"
        f"KULLANICI TALEBİ: Sana bir soru soruyor ve arka planda '{file_name}' adlı belgenin veritabanı tarama sonuçlarını (gizli bağlam olarak) sağlıyor.\n\n"
        f"KATI KURALLAR:\n"
        f"1. KESİNLİKLE belgeyi özetleme, 'Belgede şu yazıyor' diye madde madde sayma veya metni kopyala-yapıştır yapma!\n"
        f"2. Kullanıcının ne istediğini ANLA ve sanki hiçbir belge yokmuş gibi, DİREKT konuyu anlatan, çözüm sunan, kendi yorumlarını katan bir cevap yaz.\n"
        f"3. Gelen veritabanı sonuçlarını sadece 'kendi bilgini zenginleştirmek' ve 'haklı çıkmak' için arka planda kullan.\n"
        f"4. Yan sekmede dökümanı referans gösterecek bir ui_action arayüze dönecek, o yüzden ekrana çok uzun metinler yazıp kalabalık yapma.\n"
        f"Örnek İyi Cevap: 'Fesih hakkı ticari anlaşmalarda senin gözetmen gereken en büyük detaydır. Sizin koşullarınızda da gördüğüm kadarıyla bu durum gayet net güvenceye alınmış. Yan ekrandan ilgili sayfayı sizin için açtım...'\n\n"
    )


def get_general_rag_prompt() -> str:
    return (
        "Sen çok yetenekli bir asistansın. Aşağıda kullanıcının sistemine yüklenmiş "
        "belgelerden elde edilen ilgili bilgiler yer almaktadır. Bu bilgileri kullanarak "
        "soruyu cevapla. Eğer bilgi bulunmuyorsa kendi genel bilginle yanıt ver.\n\n"
    )


def attach_chat_memory(system_intro: str, chat_memory_text: str) -> str:
    if not chat_memory_text:
        return system_intro
    return system_intro + (
        "=== ESKİ SOHBET GEÇMİŞİ (HATIRLAMAN GEREKENLER) ===\n"
        "Kullanıcının şu anki sorusuyla bağlantılı olarak daha önce konuştuğunuz bazı konuşma kesitleri aşağıdadır:\n"
        f"{chat_memory_text}\n"
        "====================================================\n\n"
    )


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
