from __future__ import annotations

import json
import time

from fastapi import APIRouter, Depends, HTTPException

from starq.auth import verify_api_key
from starq.models import (
    ClaimedJobs,
    JobClaim,
    JobComplete,
    JobFail,
    JobInfo,
    JobList,
    JobSubmit,
    JobSubmitBatch,
)
from starq.redis_client import (
    consumer_group,
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
        claimed_by=meta.get("claimed_by", ""),
        error=meta.get("error", ""),
        retries=int(meta.get("retries", 0)),
        created_at=meta.get("created_at", ""),
        claimed_at=meta.get("claimed_at", ""),
        completed_at=meta.get("completed_at", ""),
    )


@router.post("", response_model=list[JobInfo], dependencies=[Depends(verify_api_key)])
async def submit_jobs(name: str, body: JobSubmit | JobSubmitBatch):
    r = get_redis()
    await _ensure_queue(r, name)

    jobs_to_submit = body.jobs if isinstance(body, JobSubmitBatch) else [body]
    result = []

    sk = stream_key(name)
    now = str(int(time.time()))

    for job in jobs_to_submit:
        # Add to stream
        job_id = await r.xadd(
            sk,
            {"payload": json.dumps(job.payload), "priority": str(job.priority)},
        )

        # Store job metadata
        meta = {
            "status": "pending",
            "payload": json.dumps(job.payload),
            "created_at": now,
            "retries": "0",
        }
        await r.hset(job_meta_key(name, job_id), mapping=meta)

        result.append(_job_info_from_meta(name, job_id, meta))

    await r.aclose()
    return result


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

    try:
        stale_result = await r.xautoclaim(sk, cg, body.worker_id, min_idle_time=claim_timeout_ms, start_id="0-0", count=body.count)
        # stale_result = (next_start_id, [(id, fields), ...], deleted_ids)
        if stale_result and len(stale_result) > 1 and stale_result[1]:
            for entry_id, fields in stale_result[1]:
                jmk = job_meta_key(name, entry_id)
                retries = int(await r.hget(jmk, "retries") or 0)
                await r.hset(jmk, mapping={
                    "status": "claimed",
                    "claimed_by": body.worker_id,
                    "claimed_at": now,
                    "retries": str(retries + 1),
                })
                job_meta = await r.hgetall(jmk)
                claimed.append(_job_info_from_meta(name, entry_id, job_meta))
    except Exception:
        pass  # No stale jobs or group doesn't exist yet

    # Then read new jobs if we need more
    remaining = body.count - len(claimed)
    if remaining > 0:
        try:
            results = await r.xreadgroup(
                cg, body.worker_id, {sk: ">"},
                count=remaining,
                block=body.block_ms if body.block_ms > 0 else None,
            )
            if results:
                for _stream, messages in results:
                    for entry_id, fields in messages:
                        jmk = job_meta_key(name, entry_id)
                        await r.hset(jmk, mapping={
                            "status": "claimed",
                            "claimed_by": body.worker_id,
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
    await r.hset(jmk, mapping={
        "status": "completed",
        "result": json.dumps(body.result),
        "completed_at": now,
    })

    # ACK the message
    await r.xack(stream_key(name), consumer_group(name), job_id)

    # Increment counter
    await r.incr(stats_completed_key(name))

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
        # Re-enqueue: just update status, leave in PEL for reclaim
        await r.hset(jmk, mapping={
            "status": "pending",
            "error": body.error,
            "claimed_by": "",
            "claimed_at": "",
        })
    else:
        # Dead-letter: ACK + mark as failed
        now = str(int(time.time()))
        await r.hset(jmk, mapping={
            "status": "failed",
            "error": body.error,
            "completed_at": now,
        })
        await r.xack(stream_key(name), consumer_group(name), job_id)
        await r.incr(stats_failed_key(name))

    await r.aclose()
    return {"status": "failed", "job_id": job_id, "retries": retries}


@router.get("", response_model=JobList)
async def list_jobs(name: str, status: str | None = None, count: int = 50):
    r = get_redis()
    await _ensure_queue(r, name)

    sk = stream_key(name)
    # Get recent entries from stream
    entries = await r.xrevrange(sk, count=count)

    jobs = []
    for entry_id, fields in entries:
        jmk = job_meta_key(name, entry_id)
        meta = await r.hgetall(jmk)
        if not meta:
            # Job metadata may have been cleaned up; reconstruct from stream
            meta = {
                "status": "pending",
                "payload": fields.get("payload", "{}"),
                "created_at": "",
            }
        job = _job_info_from_meta(name, entry_id, meta)
        if status is None or job.status == status:
            jobs.append(job)

    await r.aclose()
    return JobList(jobs=jobs)
