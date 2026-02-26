from __future__ import annotations

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    redis_url: str = "redis://localhost:6379/0"
    starq_api_keys: str = ""  # comma-separated for key rotation
    stale_job_interval: int = 30  # seconds between stale job sweeps
    default_claim_timeout: int = 300  # 5 minutes
    default_max_retries: int = 3
    job_meta_ttl: int = 86400 * 7  # 7 days TTL on completed/failed job metadata

    @property
    def api_keys(self) -> list[str]:
        return [k.strip() for k in self.starq_api_keys.split(",") if k.strip()]


settings = Settings()
