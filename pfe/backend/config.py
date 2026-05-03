"""
Central configuration — loads all environment variables from .env file.
A single `settings` instance is imported everywhere in the app.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Groq API
    groq_api_key: str = ""

    # MongoDB
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_db_name: str = "cfg_digital_twin"

    # OpenWeatherMap
    weather_api_key: str = ""
    weather_city: str = "Gafsa,TN"

    # CORS — comma-separated list of allowed origins
    cors_origins: str = "http://localhost:5173"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


settings = Settings()
