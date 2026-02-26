from __future__ import annotations

import asyncio
import json
import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from starq.config import settings
from starq.redis_client import (
    close_pool,
    consumer_group,
    dedupe_key,
    get_redis,
    job_meta_key,
    queue_meta_key,
    queue_set_key,
    stats_failed_key,
    stream_key,
)
from starq.routers import jobs, queues

logger = logging.getLogger("starq")


async def reclaim_stale_jobs():
    """Background task: reclaim stale jobs or dead-letter them."""
    while True:
        try:
            await asyncio.sleep(settings.stale_job_interval)
            r = get_redis()
            names = await r.smembers(queue_set_key())

            for name in names:
                meta = await r.hgetall(queue_meta_key(name))
                claim_timeout_ms = int(meta.get("claim_timeout", 300)) * 1000
                max_retries = int(meta.get("max_retries", 3))
                sk = stream_key(name)
                cg = consumer_group(name)

                try:
                    pending = await r.xpending_range(sk, cg, min="-", max="+", count=100)
                except Exception:
                    continue

                now_ms = int(time.time() * 1000)
                for entry in pending:
                    idle = entry.get("time_since_delivered", 0)
                    if idle < claim_timeout_ms:
                        continue

                    entry_id = entry.get("message_id", "")
                    jmk = job_meta_key(name, entry_id)
                    retries = int(await r.hget(jmk, "retries") or 0)

                    if retries >= max_retries:
                        # Dead-letter — remove dedupe hash so payload can be retried
                        dh = await r.hget(jmk, "dedupe_hash")
                        await r.hset(jmk, mapping={
                            "status": "failed",
                            "error": "max retries exceeded (stale reclaim)",
                            "completed_at": str(int(time.time())),
                        })
                        await r.xack(sk, cg, entry_id)
                        await r.incr(stats_failed_key(name))
                        if dh:
                            await r.srem(dedupe_key(name), dh)
                    else:
                        # Reset for reclaim
                        await r.hset(jmk, mapping={
                            "status": "pending",
                            "claimed_by": "",
                            "claimed_at": "",
                        })

            await r.aclose()
        except asyncio.CancelledError:
            break
        except Exception as e:
            logger.error(f"Stale job reclaim error: {e}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting Starq API...")
    task = asyncio.create_task(reclaim_stale_jobs())
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass
    await close_pool()
    logger.info("Starq API shut down.")


app = FastAPI(
    title="Starq",
    description="Distributed work queue over Redis Streams",
    lifespan=lifespan,
    docs_url=None,
    redoc_url=None,
    openapi_url=None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(queues.router, prefix="/api/v1")
app.include_router(jobs.router, prefix="/api/v1")


@app.get("/api/health")
async def health():
    r = get_redis()
    try:
        await r.ping()
        await r.aclose()
        return {"status": "ok"}
    except Exception as e:
        await r.aclose()
        return {"status": "error", "detail": str(e)}
