from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./dev.db"
    SECRET_KEY: str = "change-me-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    ANTHROPIC_API_KEY: str = ""
    ALLOWED_ORIGINS: str = "http://localhost:5173"

    @property
    def is_sqlite(self) -> bool:
        return self.DATABASE_URL.startswith("sqlite")

    @property
    def sqlalchemy_url(self) -> str:
        """Normalize the DB URL so SQLAlchemy uses the psycopg (v3) driver.

        Railway hands us a bare ``postgresql://`` (and legacy ``postgres://``)
        URL. SQLAlchemy 2.0's default dbapi for that scheme is ambiguous
        across environments, so we pin it to psycopg v3 explicitly.
        """
        url = self.DATABASE_URL
        if url.startswith("postgres://"):
            url = "postgresql://" + url[len("postgres://"):]
        if url.startswith("postgresql://"):
            url = "postgresql+psycopg://" + url[len("postgresql://"):]
        return url

    @property
    def origins_list(self) -> list[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = ".env"


@lru_cache
def get_settings() -> Settings:
    return Settings()
