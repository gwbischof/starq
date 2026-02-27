from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


# --- Queue ---


class QueueCreate(BaseModel):
    name: str = Field(..., pattern=r"^[a-z0-9][a-z0-9._-]*$", max_length=128)
    description: str = ""
    max_retries: int = 3
    claim_timeout: int = 600  # seconds
    dedupe: bool = False


class QueueInfo(BaseModel):
    name: str
    description: str = ""
    max_retries: int = 3
    claim_timeout: int = 600
    dedupe: bool = False
    pending: int = 0
    claimed: int = 0
    completed: int = 0
    failed: int = 0


class QueueList(BaseModel):
    queues: list[QueueInfo]


# --- Job ---


class JobSubmit(BaseModel):
    payload: dict[str, Any] = Field(default_factory=dict)
    priority: int = 0


class JobSubmitBatch(BaseModel):
    jobs: list[JobSubmit]


class JobClaim(BaseModel):
    count: int = 1
    block_ms: int = 0


class JobComplete(BaseModel):
    result: dict[str, Any] = Field(default_factory=dict)


class JobFail(BaseModel):
    error: str = ""


class JobInfo(BaseModel):
    id: str
    queue: str
    status: str = "pending"
    payload: dict[str, Any] = Field(default_factory=dict)
    result: dict[str, Any] = Field(default_factory=dict)
    error: str = ""
    retries: int = 0
    created_at: str = ""
    claimed_at: str = ""
    completed_at: str = ""


class JobListResponse(BaseModel):
    jobs: list[JobInfo]
    cursor: str = ""  # stream ID for next page ("" = no more)
    has_more: bool = False


class ClaimedJobs(BaseModel):
    jobs: list[JobInfo]
