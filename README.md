# Starq

Self-hosted distributed work queue with a thin HTTP API over Redis Streams. Workers claim jobs via HTTP — no SDK needed.

## Quick Start

```bash
docker compose up
```

- **Dashboard**: http://localhost:3000
- **API**: http://localhost:8000/api/health
- **Dev API key**: `dev-key`

## API

All write operations require `X-API-Key` header. Read operations are open.

```bash
# Create a queue
curl -X POST localhost:8000/api/v1/queues \
  -H "X-API-Key: dev-key" \
  -H "Content-Type: application/json" \
  -d '{"name": "emails", "description": "Email send queue"}'

# Submit a job
curl -X POST localhost:8000/api/v1/queues/emails/jobs \
  -H "X-API-Key: dev-key" \
  -H "Content-Type: application/json" \
  -d '{"payload": {"to": "user@example.com", "subject": "Hello"}}'

# Claim a job
curl -X POST localhost:8000/api/v1/queues/emails/jobs/claim \
  -H "X-API-Key: dev-key" \
  -H "Content-Type: application/json" \
  -d '{"worker_id": "worker-1", "count": 1}'

# Complete a job
curl -X PUT localhost:8000/api/v1/queues/emails/jobs/{id}/complete \
  -H "X-API-Key: dev-key" \
  -H "Content-Type: application/json" \
  -d '{"worker_id": "worker-1", "result": {"sent": true}}'

# List queues (no auth)
curl localhost:8000/api/v1/queues

# List jobs (no auth)
curl localhost:8000/api/v1/queues/emails/jobs
```

## Architecture

Three containers:
- **starq-redis** — Redis 7 with AOF persistence
- **starq-api** — FastAPI on port 8000
- **starq-web** — Next.js 15 dashboard on port 3000

## Deployment

Deploys to `queue.korroni.cloud` via GitHub Actions. Traefik routes `/api/*` to the API (priority 20) and everything else to the web dashboard (priority 10).

### Generate an API key

```bash
openssl rand -hex 32
```

### Required GitHub secrets (`deployment` environment)

- `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_PORT`
- `STARQ_API_KEYS` — comma-separated API keys

## Development

```bash
# API only
cd api && uv run uvicorn starq.main:app --reload

# Web only
cd web && npm run dev
```
