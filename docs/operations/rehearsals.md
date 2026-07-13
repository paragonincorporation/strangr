# Operational rehearsals

## Release control

Use the protected `Release candidate` workflow with a full reviewed commit SHA. Required checks, integration tests, browser tests, and builds run first. Migrations use a migration-only database credential; the reviewed API revision becomes ready before the checked-out web/admin clients deploy, followed by smoke checks. GitHub environments must require the named release approvers and hold only scoped Render hooks, Vercel deployment credentials/project IDs, and smoke URLs. Application startup never migrates.

Before production, confirm the restore point and record the approved RPO/RTO. A failed migration, readiness check, smoke test, or rehearsal stops release. Country and paid-plan switches remain off until their independent approvals are recorded.

## Scenario procedure

For each scenario below, the incident commander records start/end time, revision, participants, alerts, user/safety impact, decisions, recovery result, RPO/RTO achieved, gaps, owner, and due date. Evidence must not contain secrets, tokens, private messages, media, moderator notes, or raw provider payloads.

1. Announce the staging exercise and freeze unrelated changes.
2. Confirm rollback, kill switches, backups, observers, and abort criteria.
3. Inject only the approved failure.
4. Detect through the normal alert path and follow the linked runbook.
5. Restore service and verify authorization, data integrity, queues, workers, and audit logs.
6. Save sanitized evidence and create follow-up work.
7. Record the result with `npm run rehearse:operations -- <scenario>`.

Supported records are `database-restore`, `redis-loss`, `webhook-replay`, `auth-outage`, `turn-outage`, `credential-rotation`, `bad-migration`, `moderator-compromise`, and `data-exposure`. A `fail` result returns a failing exit code and must not be relabelled.

## Recovery and rollback expectations

- Database restore: restore into an isolated target, apply migrations, compare durable row counts/checksums and authorization samples, then measure actual RPO/RTO. Never overwrite production during rehearsal.
- Redis loss: flush only the isolated staging namespace/instance. Clients receive degraded/ended state, durable blocks/sanctions remain dominant, queues rebuild, and no stale ticket or match is accepted.
- Webhook replay: replay signed sandbox fixtures, including duplicates and out-of-order events. Entitlements follow the newest durable provider object and are never granted from redirects.
- Auth outage: existing capability checks fail safely; new protected actions do not bypass verification; reporting/support paths and status messaging remain available as designed.
- TURN outage: direct peer connections may continue; relay-required calls fail honestly without weakening reporting/blocking. Use the TURN kill switch/credential rotation path.
- Credential rotation: rotate one scoped staging credential, deploy consumers, verify old credential rejection, then revoke it. Never print the value.
- Bad migration: stop deploy, restore/forward-fix according to the reviewed migration plan, and keep old/new application protocols compatible. Destructive down-migrations are not automatic.
- Moderator compromise: revoke sessions/roles and provider access, preserve audit evidence, rotate relevant credentials, reassign cases, and invoke privacy/legal notification assessment.
- Data exposure: activate the incident commander, contain access, preserve minimal evidence, assess affected data/regions/users, and follow counsel-approved notification timelines.

## Kill switches and rollback

Disable the smallest affected server-owned capability: country registration/matching/billing switches, paid catalog rows, visual-risk flag, global/per-country concurrency ceiling, or TURN credentials. Blocks, reports, sanctions, and deletion contact restrictions stay active. Roll back application code only to a protocol/schema-compatible revision; otherwise forward-fix. Verify `/health/live`, `/health/ready`, exact CORS/WebSocket origins, worker completion, billing reconciliation, and admin AAL2 after recovery.
