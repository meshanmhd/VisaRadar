"""
config.py — centralised settings loaded from .env
"""
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Literal


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    app_env: str = "development"
    secret_key: str = "dev-secret"

    # Database
    database_url: str = "sqlite+aiosqlite:///./nova.db"

    # LLM
    llm_provider: Literal["openai", "google", "anthropic", "groq"] = "groq"
    openai_api_key: str = ""
    google_api_key: str = ""
    anthropic_api_key: str = ""
    groq_api_key: str = ""
    groq_model: str = "llama-3.3-70b-versatile"

    # Scraping targets
    uk_visa_url: str = "https://ukclone.vercel.app"

    # Scheduler
    scrape_cron: str = "0 */6 * * *"

    # Alert webhooks (optional)
    alert_email_enabled: bool = False
    alert_webhook_url: str = ""


settings = Settings()
