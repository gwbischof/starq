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

Submit a JSONL file where each line becomes a job payload:

```bash
cd api && uv run starq jobs.jsonl -q my-queue -k dev-key
```

Options:
- `-u URL` — API base URL (default: `http://localhost:8000`)
- `-b N` — Batch size per request (default: 100)
- Use `-` as file to read from stdin

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
