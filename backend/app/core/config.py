from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    PROJECT_NAME: str = "InventIQ"
    DATABASE_URL: str = "postgresql://postgres:password@db:5432/inventiq"
    SECRET_KEY: str = "super-secret-key-change-in-production-min-32-chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    class Config:
        env_file = ".env"


settings = Settings()
