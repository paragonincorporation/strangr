# Units 12–13: encounters, retention, and blocks

Status: complete (July 12, 2026)

## Durable boundary

Migration `0003_encounters_blocks.sql` adds explicitly typed encounters, participants, random/direct threads, members, messages, random/direct calls, call participants, restricted report evidence, and blocks. An accepted Redis match is persisted using the existing match UUID. The random thread is unique per encounter, client message IDs and server sequences are unique within a thread, and every random record expires no later than 48 hours. Call records expire after 90 days and contain timing/result categories only.

The schema has no fields for SDP, ICE, IP addresses, audio, video, frames, or captures. Realtime descriptions and candidates remain ephemeral relays.

## Retention

The worker takes a Postgres advisory lease, deletes expired random messages and encounter records in bounded idempotent batches, and reports counts, dry-run status, and oldest-record lag. `worker:once -- --dry-run` reports eligible rows without deleting them. A report copies at most a 500-character text excerpt into restricted evidence with a separate reason and expiry; it never holds the random thread open.

History is limited to the server's 48-hour window, uses opaque cursor pagination, projects only a safe peer preview, and supports hide-for-viewer. Blocking hides the shared encounter from both participants immediately.

## Block semantics

Blocks are directional records, while contact authorization checks either direction. Creating the same directional block is idempotent; opposite blocks may coexist. Self-blocks are rejected. Unblock deletes only the actor's directional block. It permits future eligibility if no opposite block exists, but does not restore hidden encounter history, a terminated match, or any relationship.

On block, the API persists first, removes both accounts from all queue partitions, closes an active match, publishes a generic `blocked` termination without exposing the actor or reason, and installs a Redis deny cache. The database remains authoritative: candidate selection and every peer-scoped realtime command recheck the persistent relationship. Profile, avatar, and encounter surfaces return generic unavailable results.

Friend requests, friendships, and direct-message/direct-call endpoints do not exist before Units 14 and 16–17. Their tables and services must call `BlockRepository.hasEitherDirection`; block remains the dominant authorization rule.

## Migration and rollout

Run `npm run db:migrate` before deploying the API or worker. Deploy API instances before enabling the retention schedule. Existing ephemeral Redis matches are not backfilled; only matches accepted after deployment create encounters.

## Verification

- `npm run db:migrate`
- `npm run test:integration`
- `npm run check`
- `npm run build`

Integration coverage includes concurrent idempotent encounter creation, ordered/idempotent random messages, one-sided hiding, privacy projection, either-direction and simultaneous blocks, self-block rejection, exact UTC expiry, and separately retained minimal report evidence.
