# ADR 0004: Drizzle and repository-owned SQL migrations

Status: accepted by `plan.md`  
Date: July 11, 2026

## Decision

Use Drizzle for schema/query typing and commit explicit SQL migrations. Keep constraints/indexes visible and separate schema, repository, transaction, and test-helper concerns in `packages/database`.

## Consequences

Production migrations are explicit deploy steps, not an API startup side effect. Schema constraints provide final concurrency/authorization defenses. Prisma is not used for beta.
