from __future__ import annotations

import hashlib
import json
import time

from fastapi import APIRouter, Depends, HTTPException

from starq.auth import verify_api_key
from starq.config import settings
from starq.models import (
    ClaimedJobs,
    JobClaim,
    JobComplete,
    JobFail,
    JobInfo,
    JobListResponse,
    JobSubmit,
    JobSubmitBatch,
)
from starq.redis_client import (
    consumer_group,
    dedupe_key,
    get_redis,
    job_meta_key,
    queue_meta_key,
    queue_set_key,
    stats_completed_key,
    stats_failed_key,
    stream_key,
)

router = APIRouter(prefix="/queues/{name}/jobs", tags=["jobs"])


async def _ensure_queue(r, name: str):
    if not await r.sismember(queue_set_key(), name):
        raise HTTPException(status_code=404, detail=f"Queue '{name}' not found")


def _job_info_from_meta(queue: str, job_id: str, meta: dict) -> JobInfo:
    payload = {}
    result = {}
    if meta.get("payload"):
        try:
            payload = json.loads(meta["payload"])
        except (json.JSONDecodeError, TypeError):
            pass
    if meta.get("result"):
        try:
            result = json.loads(meta["result"])
        except (json.JSONDecodeError, TypeError):
            pass

    return JobInfo(
        id=job_id,
        queue=queue,
        status=meta.get("status", "pending"),
        payload=payload,
        result=result,
        error=meta.get("error", ""),
        retries=int(meta.get("retries", 0)),
        created_at=meta.get("created_at", ""),
        claimed_at=meta.get("claimed_at", ""),
        completed_at=meta.get("completed_at", ""),
    )


def _payload_hash(payload: dict) -> str:
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()


@router.post("", dependencies=[Depends(verify_api_key)])
async def submit_jobs(name: str, body: JobSubmit | JobSubmitBatch):
    r = get_redis()
    await _ensure_queue(r, name)

    jobs_to_submit = body.jobs if isinstance(body, JobSubmitBatch) else [body]

    # Check if dedupe is enabled
    queue_meta = await r.hgetall(queue_meta_key(name))
    is_dedupe = queue_meta.get("dedupe", "0") == "1"

    # Filter duplicates if dedupe enabled
    accepted: list[tuple[int, JobSubmit, str]] = []  # (orig_index, job, hash)
    skipped = 0

    if is_dedupe:
        dk = dedupe_key(name)
        for i, job in enumerate(jobs_to_submit):
            h = _payload_hash(job.payload)
            if await r.sismember(dk, h):
                skipped += 1
            else:
                accepted.append((i, job, h))
    else:
        accepted = [(i, job, "") for i, job in enumerate(jobs_to_submit)]

    result = []
    sk = stream_key(name)
    now = str(int(time.time()))

    if accepted:
        # Add all jobs to stream in a pipeline
        pipe = r.pipeline()
        for _, job, _ in accepted:
            pipe.xadd(sk, {"payload": json.dumps(job.payload), "priority": str(job.priority)})
        xadd_results = await pipe.execute()

        # Store metadata + add dedupe hashes in a second pipeline
        pipe = r.pipeline()
        for idx, (_, job, h) in enumerate(accepted):
            job_id = xadd_results[idx]
            meta = {
                "status": "pending",
                "payload": json.dumps(job.payload),
                "created_at": now,
                "retries": "0",
            }
            if is_dedupe and h:
                meta["dedupe_hash"] = h
                pipe.sadd(dedupe_key(name), h)
            pipe.hset(job_meta_key(name, job_id), mapping=meta)
        await pipe.execute()

        for idx, (_, job, _) in enumerate(accepted):
            result.append(JobInfo(
                id=xadd_results[idx],
                queue=name,
                status="pending",
                payload=job.payload,
                created_at=now,
            ))

    await r.aclose()
    return {"jobs": result, "submitted": len(accepted), "skipped": skipped}


@router.post("/claim", response_model=ClaimedJobs, dependencies=[Depends(verify_api_key)])
async def claim_jobs(name: str, body: JobClaim):
    r = get_redis()
    await _ensure_queue(r, name)

    sk = stream_key(name)
    cg = consumer_group(name)
    now = str(int(time.time()))
    claimed = []

    # First try to autoclaim stale jobs
    meta = await r.hgetall(queue_meta_key(name))
    claim_timeout_ms = int(meta.get("claim_timeout", 300)) * 1000

    consumer = "w"

    try:
        stale_result = await r.xautoclaim(sk, cg, consumer, min_idle_time=claim_timeout_ms, start_id="0-0", count=body.count)
        if stale_result and len(stale_result) > 1 and stale_result[1]:
            for entry_id, fields in stale_result[1]:
                jmk = job_meta_key(name, entry_id)
                retries = int(await r.hget(jmk, "retries") or 0)
                await r.hset(jmk, mapping={
                    "status": "claimed",
                    "claimed_at": now,
                    "retries": str(retries + 1),
                })
                job_meta = await r.hgetall(jmk)
                claimed.append(_job_info_from_meta(name, entry_id, job_meta))
    except Exception:
        pass

    # Then read new jobs if we need more
    remaining = body.count - len(claimed)
    if remaining > 0:
        try:
            results = await r.xreadgroup(
                cg, consumer, {sk: ">"},
                count=remaining,
                block=body.block_ms if body.block_ms > 0 else None,
            )
            if results:
                for _stream, messages in results:
                    for entry_id, fields in messages:
                        jmk = job_meta_key(name, entry_id)
                        await r.hset(jmk, mapping={
                            "status": "claimed",
                            "claimed_at": now,
                        })
                        job_meta = await r.hgetall(jmk)
                        claimed.append(_job_info_from_meta(name, entry_id, job_meta))
        except Exception:
            pass

    await r.aclose()
    return ClaimedJobs(jobs=claimed)


@router.put("/{job_id}/complete", dependencies=[Depends(verify_api_key)])
async def complete_job(name: str, job_id: str, body: JobComplete):
    r = get_redis()
    await _ensure_queue(r, name)

    jmk = job_meta_key(name, job_id)
    if not await r.exists(jmk):
        await r.aclose()
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

    now = str(int(time.time()))
    pipe = r.pipeline()
    pipe.hset(jmk, mapping={
        "status": "completed",
        "result": json.dumps(body.result),
        "completed_at": now,
    })
    # Set TTL on completed job metadata so it doesn't accumulate forever
    pipe.expire(jmk, settings.job_meta_ttl)
    pipe.xack(stream_key(name), consumer_group(name), job_id)
    pipe.incr(stats_completed_key(name))
    await pipe.execute()

    await r.aclose()
    return {"status": "completed", "job_id": job_id}


@router.put("/{job_id}/fail", dependencies=[Depends(verify_api_key)])
async def fail_job(name: str, job_id: str, body: JobFail):
    r = get_redis()
    await _ensure_queue(r, name)

    jmk = job_meta_key(name, job_id)
    if not await r.exists(jmk):
        await r.aclose()
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

    meta = await r.hgetall(queue_meta_key(name))
    max_retries = int(meta.get("max_retries", 3))
    retries = int(await r.hget(jmk, "retries") or 0)

    if retries < max_retries:
        await r.hset(jmk, mapping={
            "status": "pending",
            "error": body.error,
            "claimed_at": "",
        })
    else:
        # Terminal failure — remove dedupe hash so payload can be retried
        dh = await r.hget(jmk, "dedupe_hash")
        now = str(int(time.time()))
        pipe = r.pipeline()
        pipe.hset(jmk, mapping={
            "status": "failed",
            "error": body.error,
            "completed_at": now,
        })
        pipe.expire(jmk, settings.job_meta_ttl)
        pipe.xack(stream_key(name), consumer_group(name), job_id)
        pipe.incr(stats_failed_key(name))
        if dh:
            pipe.srem(dedupe_key(name), dh)
        await pipe.execute()

    await r.aclose()
    return {"status": "failed", "job_id": job_id, "retries": retries}


@router.get("", response_model=JobListResponse)
async def list_jobs(
    name: str,
    status: str | None = None,
    count: int = 50,
    cursor: str | None = None,
):
    """Cursor-based paginated job listing. Uses XREVRANGE with stream IDs."""
    r = get_redis()
    await _ensure_queue(r, name)

    sk = stream_key(name)

    # XREVRANGE paginates by using the previous page's last ID minus 1ms
    max_id = "+"
    if cursor:
        # Cursor is the last stream ID from previous page — go before it
        parts = cursor.split("-")
        if len(parts) == 2:
            ts, seq = int(parts[0]), int(parts[1])
            if seq > 0:
                max_id = f"{ts}-{seq - 1}"
            else:
                max_id = f"{ts - 1}-{2**63 - 1}"

    # Fetch one extra to detect has_more
    fetch_count = count + 1
    entries = await r.xrevrange(sk, max=max_id, count=fetch_count)

    has_more = len(entries) > count
    if has_more:
        entries = entries[:count]

    # Pipeline all HGETALL calls
    if entries:
        pipe = r.pipeline()
        for entry_id, _ in entries:
            pipe.hgetall(job_meta_key(name, entry_id))
        metas = await pipe.execute()
    else:
        metas = []

    jobs = []
    for i, (entry_id, fields) in enumerate(entries):
        meta = metas[i] if metas[i] else {
            "status": "pending",
            "payload": fields.get("payload", "{}"),
            "created_at": "",
        }
        job = _job_info_from_meta(name, entry_id, meta)
        if status is None or job.status == status:
            jobs.append(job)

    next_cursor = entries[-1][0] if has_more and entries else ""

    await r.aclose()
    return JobListResponse(jobs=jobs, cursor=next_cursor, has_more=has_more)
