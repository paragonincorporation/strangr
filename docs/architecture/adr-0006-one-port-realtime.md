# ADR 0006: one public API and realtime port

Status: accepted by `plan.md`  
Date: July 11, 2026

## Decision

Serve REST and WebSocket upgrade traffic from the same public Fastify server. Realtime uses `/ws`; the new architecture has no separate public `WS_PORT`.

## Consequences

Local/deployment routing is simpler and avoids the prototype port conflict. Authentication later uses a roughly 30-second, single-use ticket in `/ws?ticket=...`, never a long-lived access token in the URL.
