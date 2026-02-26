# Starq

Self-hosted distributed work queue over Redis Streams. Workers claim jobs via HTTP — no SDK needed.

## Quick Start

```bash
docker compose up
```

- **Dashboard**: http://localhost:3000
- **API**: http://localhost:8000/api/health
- **Dev API key**: `dev-key`

## API

Writes require `X-API-Key` header. Reads are open.

| Endpoint | Description |
|---|---|
| `POST /api/v1/queues` | Create a queue |
| `GET /api/v1/queues` | List queues |
| `GET /api/v1/queues/:name` | Queue details + stats |
| `DELETE /api/v1/queues/:name` | Delete a queue |
| `POST /api/v1/queues/:name/jobs` | Submit job(s) |
| `POST /api/v1/queues/:name/jobs/claim` | Claim jobs |
| `PUT /api/v1/queues/:name/jobs/:id/complete` | Complete a job |
| `PUT /api/v1/queues/:name/jobs/:id/fail` | Fail a job |
| `GET /api/v1/queues/:name/jobs` | List jobs (paginated) |

## CLI

```bash
cd api && uv run starq -u https://queue.korroni.cloud -k <API_KEY> <command>
```

Commands:

| Command | Description |
|---|---|
| `health` | Check API health |
| `queues` | List all queues |
| `create <name>` | Create a queue |
| `info <name>` | Queue details + stats |
| `delete <name>` | Delete a queue |
| `submit <file> -q <queue>` | Submit JSONL file as jobs (`-` for stdin) |
| `jobs <queue>` | List jobs (filter with `-s pending`) |
| `claim <queue>` | Claim jobs (`-n 5` for count) |
| `complete <queue> <id>` | Mark job completed |
| `fail <queue> <id>` | Mark job failed |

Global options: `-u URL` (default: `http://localhost:8000`), `-k API_KEY`

## Writing a Worker

Workers are plain HTTP clients. Claim jobs, do work, report back. No SDK needed.

```python
import requests

API = "https://queue.korroni.cloud"
API_KEY = "your-api-key"
QUEUE = "my-queue"
HEADERS = {"X-API-Key": API_KEY, "Content-Type": "application/json"}


def claim_jobs(count=1, block_ms=5000):
    r = requests.post(
        f"{API}/api/v1/queues/{QUEUE}/jobs/claim",
        json={"count": count, "block_ms": block_ms},
        headers=HEADERS,
    )
    r.raise_for_status()
    return r.json()["jobs"]


def complete_job(job_id, result=None):
    requests.put(
        f"{API}/api/v1/queues/{QUEUE}/jobs/{job_id}/complete",
        json={"result": result or {}},
        headers=HEADERS,
    ).raise_for_status()


def fail_job(job_id, error=""):
    requests.put(
        f"{API}/api/v1/queues/{QUEUE}/jobs/{job_id}/fail",
        json={"error": error},
        headers=HEADERS,
    ).raise_for_status()


while True:
    jobs = claim_jobs(count=5, block_ms=5000)
    if not jobs:
        continue
    for job in jobs:
        try:
            # --- your work here ---
            payload = job["payload"]
            result = {"processed": True}
            # ----------------------
            complete_job(job["id"], result)
        except Exception as e:
            fail_job(job["id"], str(e))
```

Key points:
- **`block_ms`** makes `claim` long-poll so you don't busy-loop when the queue is empty
- **`count`** lets you grab multiple jobs at once for batch processing
- Failed jobs are retried automatically up to the queue's `max_retries` setting
- If a worker dies mid-job, the job is reclaimed after the queue's `claim_timeout` expires
- Run as many worker processes as you want — the API handles concurrency

## Architecture

Three containers:
- **starq-redis** — Redis 7, AOF persistence
- **starq-api** — FastAPI
- **starq-web** — Next.js 15 dashboard

## Deployment

Deploys to `queue.korroni.cloud` via GitHub Actions. Traefik routes `/api/*` to the API and everything else to the dashboard.

```bash
# Generate an API key
openssl rand -hex 32
```

GitHub secrets (`deployment` environment): `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PORT`, `STARQ_API_KEYS`

## Development

```bash
# API only
cd api && uv run uvicorn starq.main:app --reload

# Web only
cd web && npm run dev
```
