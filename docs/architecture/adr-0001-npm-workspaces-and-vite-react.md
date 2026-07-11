# ADR 0001: npm workspaces and Vite React clients

Status: accepted by `plan.md`  
Date: July 11, 2026

## Context

The anonymous client is imperative DOM code. Accounts, profiles, settings, social state, billing, admin workflows, and long-lived realtime state require clearer route/component boundaries. The existing npm workflow should remain familiar.

## Decision

Use npm workspaces. Build separate `apps/web` and `apps/admin` clients with Vite, React, and TypeScript. Put transport contracts, database code, UI primitives, and shared configuration in packages. Keep user and admin applications independently deployable.

## Consequences

One root install owns the graph and root scripts orchestrate workspaces. The legacy DOM app remains a temporary behavior reference. Next.js/server rendering is deferred because beta does not need it.
