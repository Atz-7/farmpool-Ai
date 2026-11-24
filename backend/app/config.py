from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "sqlite:///./farmpool.db"
    jwt_secret: str = "dev-secret-change-me"
    jwt_algorithm: str = "HS256"
    token_minutes: int = 720
    gemini_api_key: str = ""  # server-side only, never sent to frontend
    gemini_model: str = "gemini-2.5-flash"
    osrm_url: str = ""  # e.g. https://router.project-osrm.org ; empty = use offline estimate
    class Config:
        env_file = ".env"

settings = Settings()
