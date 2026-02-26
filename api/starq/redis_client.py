from __future__ import annotations

import redis.asyncio as redis

from starq.config import settings

pool: redis.ConnectionPool | None = None


def get_pool() -> redis.ConnectionPool:
    global pool
    if pool is None:
        pool = redis.ConnectionPool.from_url(settings.redis_url, decode_responses=True)
    return pool


def get_redis() -> redis.Redis:
    return redis.Redis(connection_pool=get_pool())


async def close_pool():
    global pool
    if pool is not None:
        await pool.aclose()
        pool = None


# --- Key helpers ---

def queue_set_key() -> str:
    return "starq:queues"


def queue_meta_key(name: str) -> str:
    return f"starq:queue:{name}"


def stream_key(name: str) -> str:
    return f"starq:stream:{name}"


def consumer_group(name: str) -> str:
    return f"starq:cg:{name}"


def job_meta_key(queue: str, job_id: str) -> str:
    return f"starq:job:{queue}:{job_id}"


def stats_completed_key(name: str) -> str:
    return f"starq:stats:{name}:completed"


def stats_failed_key(name: str) -> str:
    return f"starq:stats:{name}:failed"


def dedupe_key(name: str) -> str:
    return f"starq:dedupe:{name}"
