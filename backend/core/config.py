from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Proje001 API"
    API_V1_STR: str = "/api"
    # FRONTEND_URL for CORS
    FRONTEND_URL: str = "http://localhost:5173"
    # Add other configuration variables like DB connection string, AI API Keys etc.
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""
    N8N_API_KEY: str = ""
    # Embedding modeli: paraphrase-multilingual-MiniLM-L12-v2 (varsayılan), BAAI/bge-m3, openai/text-embedding-3-small vb.
    EMBEDDING_MODEL: str = ""

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
