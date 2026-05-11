from functools import lru_cache
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./app.db"
    JWT_SECRET_KEY: str = "[**REDACTED**]"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 14

    CLOVA_STUDIO_API_KEY: str = ""
    CLOVA_STUDIO_BASE_URL: str = "https://clovastudio.stream.ntruss.com/v1/openai"
    CLOVA_CHAT_MODEL: str = "HCX-005"
    CLOVA_EMBEDDING_MODEL: str = "bge-m3"

    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 40
    FRONTEND_ORIGIN: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @field_validator("UPLOAD_DIR")
    @classmethod
    def normalize_upload_dir(cls, value: str) -> str:
        return value.strip() or "uploads"

    @property
    def cors_origins(self) -> List[str]:
        origins = {
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            self.FRONTEND_ORIGIN,
        }
        return sorted(origin for origin in origins if origin)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
