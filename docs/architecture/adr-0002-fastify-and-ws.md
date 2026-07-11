# ADR 0002: Fastify HTTP with ws realtime

Status: accepted by `plan.md`  
Date: July 11, 2026

## Decision

Use Node.js 22, TypeScript, Fastify for HTTP lifecycle/routes, and `ws` for authenticated realtime signaling. Domain modules remain independent of transport. Use structured Pino-compatible logging and shared Zod boundary contracts as their units land.

## Consequences

The Express prototype is not extended into the account API. Fastify plugins can encapsulate domains without adopting a heavier application framework. Existing queue/signaling tests remain behavior references and will be reimplemented against authenticated domain services.
