from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    APP_NAME: str = "Document Repository"
    APP_ENV: str = "development"
    DEBUG: bool = True

    DATABASE_URL: str
    TEST_DATABASE_URL: str = ""

    REDIS_URL: str

    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    UPLOAD_DIR: str = "./uploads"
    MAX_UPLOAD_SIZE: int = 52428800
    ALLOWED_EXTENSIONS: str = ".pdf,.doc,.docx,.txt,.xlsx,.xls,.ppt,.pptx,.csv,.zip"

    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173"

    DEFAULT_PAGE_SIZE: int = 10
    MAX_PAGE_SIZE: int = 100

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]

    @property
    def allowed_extensions_list(self) -> List[str]:
        return [ext.strip() for ext in self.ALLOWED_EXTENSIONS.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
