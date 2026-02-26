from __future__ import annotations

import hmac

from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader

from starq.config import settings

api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


def verify_api_key(key: str | None = Security(api_key_header)):
    keys = settings.api_keys
    if not keys:
        return  # No keys configured = no auth
    if key is None:
        raise HTTPException(status_code=401, detail="Missing API key")
    for valid_key in keys:
        if hmac.compare_digest(key, valid_key):
            return
    raise HTTPException(status_code=401, detail="Invalid API key")
