# Units 14–15: friends, discovery, and presence

Status: complete (July 12, 2026)

Migration `0004_friends_presence.sql` adds expiring friend requests, canonical active friendships, direct threads, and scoped mutes. Requests require a current or unexpired 48-hour encounter, the recipient's encounter-request permission, and no block in either direction. Crossing requests are treated as mutual consent and create the friendship immediately. Explicit acceptance and crossing requests take a canonical-pair transaction lock and create exactly one friendship and one new direct thread.

Rejected, cancelled, and expired requests never create a thread. The leased worker marks pending requests expired and purges request records after the 30-day spam-control window. Unfriend closes contact access without deleting the direct thread; Unit 16 owns existing-message retention behavior. Blocking cancels pending requests and ends active friendship access.

The API exposes request create/list/accept/reject/cancel, paginated friends, unfriend, scoped mute/unmute, and authoritative counts. Profile projection distinguishes public, current/recent encounter, and friend audiences. Exact normalized username lookup is the only discovery mechanism; there are no suggestions, broad search, uploads, or recommendations.

Presence is derived from Redis connection leases. Connect/disconnect changes publish only to active, unblocked friends when the subject permits presence. The friends UI periodically performs an authoritative refetch so counts and presence recover after dropped realtime events or reconnect.

The web application now provides usable History, Friends/Requests, exact-profile lookup, other-user profile, request, hide, block, mute, and unfriend journeys with loading, empty, unavailable, and error states.

## Rollout

Run `npm run db:migrate` before deploying the API and worker. Deploy the API/worker before the web client. No new environment variables are required.

## Verification

- Fresh local reset followed by all four migrations
- Lint and workspace typecheck
- All workspace and legacy tests
- 14 Postgres/Redis integration tests
- Migration and secret validation
- Web, admin, API, package builds, and client secret scan
