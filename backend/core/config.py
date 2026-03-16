from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Proje001 API"
    API_V1_STR: str = "/api"
    # FRONTEND_URL for CORS
    FRONTEND_URL: str = "http://localhost:5173"
    # Add other configuration variables like DB connection string, AI API Keys etc.
    OPENAI_API_KEY: str = ""
    GEMINI_API_KEY: str = ""

    class Config:
        env_file = ".env"

settings = Settings()
