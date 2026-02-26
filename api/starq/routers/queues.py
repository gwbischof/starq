from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException

from starq.auth import verify_api_key
from starq.models import QueueCreate, QueueInfo, QueueList
from starq.redis_client import (
    consumer_group,
    dedupe_key,
    get_redis,
    queue_meta_key,
    queue_set_key,
    stats_completed_key,
    stats_failed_key,
    stream_key,
)

router = APIRouter(prefix="/queues", tags=["queues"])


async def _queue_info(r, name: str) -> QueueInfo:
    meta = await r.hgetall(queue_meta_key(name))
    if not meta:
        meta = {}

    # Stream length
    sk = stream_key(name)
    try:
        length = await r.xlen(sk)
    except Exception:
        length = 0

    # Pending + workers from XPENDING
    pending = 0
    workers = 0
    try:
        info = await r.xpending(sk, consumer_group(name))
        if info:
            pending = info.get("pending", 0) if isinstance(info, dict) else info[0]
            consumers = info.get("consumers", []) if isinstance(info, dict) else info[3] if len(info) > 3 else []
            workers = len(consumers) if consumers else 0
    except Exception:
        pass

    completed = int(await r.get(stats_completed_key(name)) or 0)
    failed = int(await r.get(stats_failed_key(name)) or 0)

    return QueueInfo(
        name=name,
        description=meta.get("description", ""),
        max_retries=int(meta.get("max_retries", 3)),
        claim_timeout=int(meta.get("claim_timeout", 300)),
        dedupe=meta.get("dedupe", "0") == "1",
        pending=pending,
        completed=completed,
        failed=failed,
        workers=workers,
        length=length,
    )


@router.get("", response_model=QueueList)
async def list_queues():
    r = get_redis()
    names = await r.smembers(queue_set_key())
    queues = []
    for name in sorted(names):
        queues.append(await _queue_info(r, name))
    await r.aclose()
    return QueueList(queues=queues)


@router.post("", response_model=QueueInfo, dependencies=[Depends(verify_api_key)])
async def create_queue(body: QueueCreate):
    r = get_redis()
    name = body.name

    # Check if already exists
    if await r.sismember(queue_set_key(), name):
        await r.aclose()
        raise HTTPException(status_code=409, detail=f"Queue '{name}' already exists")

    # Create stream + consumer group
    sk = stream_key(name)
    cg = consumer_group(name)
    try:
        await r.xgroup_create(sk, cg, id="0", mkstream=True)
    except Exception:
        pass  # Group may already exist

    # Store metadata
    await r.hset(
        queue_meta_key(name),
        mapping={
            "description": body.description,
            "max_retries": str(body.max_retries),
            "claim_timeout": str(body.claim_timeout),
            "dedupe": "1" if body.dedupe else "0",
        },
    )

    # Add to queue set
    await r.sadd(queue_set_key(), name)

    info = await _queue_info(r, name)
    await r.aclose()
    return info


@router.get("/{name}", response_model=QueueInfo)
async def get_queue(name: str):
    r = get_redis()
    if not await r.sismember(queue_set_key(), name):
        await r.aclose()
        raise HTTPException(status_code=404, detail=f"Queue '{name}' not found")
    info = await _queue_info(r, name)
    await r.aclose()
    return info


@router.delete("/{name}", dependencies=[Depends(verify_api_key)])
async def delete_queue(name: str):
    r = get_redis()
    if not await r.sismember(queue_set_key(), name):
        await r.aclose()
        raise HTTPException(status_code=404, detail=f"Queue '{name}' not found")

    # Remove from set
    await r.srem(queue_set_key(), name)

    # Delete stream, metadata, stats, dedupe set
    await r.unlink(
        stream_key(name),
        queue_meta_key(name),
        stats_completed_key(name),
        stats_failed_key(name),
        dedupe_key(name),
    )

    # Delete job metadata keys in batches via SCAN + UNLINK
    cursor_val: int | str = 0
    while True:
        cursor_val, keys = await r.scan(cursor=cursor_val, match=f"starq:job:{name}:*", count=500)
        if keys:
            await r.unlink(*keys)
        if cursor_val == 0 or cursor_val == "0":
            break
    await r.aclose()
    return {"status": "deleted", "queue": name}
