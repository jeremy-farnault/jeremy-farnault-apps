# @jf/aider-broker

Small backend service that runs on the Raspberry Pi behind the Cloudflare Tunnel from
ticket 5. Receives chat requests from `apps/aider`'s `/api/chat` route, picks a local
Ollama model based on the message content, and streams the reply back as NDJSON.

Replaces the throwaway `health.mjs` from ticket 5.

## Endpoints

- `GET /health` — bearer-secret gated liveness check.
- `POST /v1/chat` — bearer-secret + `X-Aider-User-Id` gated, streams `BrokerStreamEvent` NDJSON lines.

See `src/server.ts` for the exact request/response contract.

## Deploying to the Pi

This service only ever runs on the Pi itself, so "deploying" is a local build + file
replace + systemd restart (see `scripts/deploy.sh`):

```bash
pnpm --filter @jf/aider-broker deploy
```

**Port 8787 is load-bearing** — `/etc/cloudflared/config.yml`'s tunnel ingress points at
`http://localhost:8787`. Do not change `PI_PORT` without also updating that file and
restarting `cloudflared`.
