# Starq — Distributed Work Queue

## Architecture
Three containers on `root_default` Docker network:
- **starq-redis** — Redis 7 Alpine, AOF persistence
- **starq-api** — FastAPI on port 8000
- **starq-web** — Next.js 15 on port 3000

## API
- FastAPI with Redis Streams backend
- Auth: `APIKeyHeader(name="X-API-Key")` + `hmac.compare_digest`
- Read endpoints (GET) have no auth; write endpoints (POST/PUT) require API key
- Env: `STARQ_API_KEYS` (comma-separated)

## Redis Key Schema
- `starq:queues` — Set of queue names
- `starq:queue:{name}` — Hash with queue metadata
- `starq:stream:{name}` — Stream for jobs
- `starq:cg:{name}` — Consumer group on the stream
- `starq:job:{name}:{id}` — Hash with job metadata
- `starq:stats:{name}:completed` / `failed` — Counters

## Web
- Next.js 15 App Router with constellation dark theme
- Polling: dashboard 5s, queue detail 2s
- API key stored in localStorage

## Deploy
- Traefik routes `queue.korroni.cloud/api/*` → API (priority 20), else → Web (priority 10)
- GitHub Actions: build-api, build-web, deploy jobs
- Images: `ghcr.io/gbischof/starq/api:latest`, `ghcr.io/gbischof/starq/web:latest`

## Commands
- Local dev: `docker compose up`
- API only: `cd api && uv run uvicorn starq.main:app --reload`
- Web only: `cd web && npm run dev`
