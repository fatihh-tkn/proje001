class AIService:
    @staticmethod
    async def get_reply(user_message: str) -> str:
        # İleride buraya OpenAI, LangChain veya diğer LLM entegrasyonları gelecek.
        print(f"Alınan mesaj: {user_message}")
        # Şimdilik basit bir echo (yankı) veya mock cevap dönüyoruz
        return f"Python Backend'den yanıt: '{user_message}' mesajınızı aldım!"


ai_service = AIService()
