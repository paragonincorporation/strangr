# ADR 0005: Redis-compatible ephemeral state

Status: accepted by `plan.md`  
Date: July 11, 2026

## Decision

Use a managed Redis-compatible service for queues, presence, connection ownership, recent-pair exclusions, match/call leases, distributed rate limits, single-use realtime tickets, idempotency, jobs, and pub/sub.

## Consequences

Persistent users, relationships, messages, reports, billing, and sanctions stay in Postgres. Redis state always has deliberate expiry/recovery semantics and must work across multiple API instances.
