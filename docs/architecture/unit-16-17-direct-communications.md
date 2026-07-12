# Units 16–17: direct communications

Paramingle direct communication is restricted to the canonical direct thread created when a friendship becomes active. Random encounter threads are never promoted. `CommunicationRepository` rechecks direct membership, an active friendship, blocks in either direction, the peer account state, and verified email inside each message or call transaction.

## Persistent messages

- A per-thread advisory transaction lock assigns exactly one increasing server sequence. `(thread_id, client_message_id)` is the idempotency boundary; replaying different content is rejected.
- HTTP provides bounded cursor recovery and realtime publishes `message.created`. Clients de-duplicate by message ID and order by server sequence before authoritative refetch.
- One monotonic `thread_members.read_sequence` cursor represents read state. Counts are computed by the server from durable cursors and sequences.
- Delete-for-me uses a membership-specific hidden row. Delete-for-everyone replaces content with an explicit tombstone and uses server time plus `MESSAGE_DELETE_FOR_EVERYONE_SECONDS` (15 minutes locally).
- Message bodies remain plain text and are never included in API logs or realtime error messages.

## Direct voice/video calls

- `POST /v1/calls/direct` creates metadata only and requires an online, current, unblocked friend. Redis atomically leases both users so queues, random matches, and other calls cannot overlap.
- Invites ring active web sessions only. Typed accept/reject/cancel/end and call-scoped RTC events reject missing or stale leases and recheck durable relationship access.
- Unanswered calls become `missed`; terminal actions release both leases. The worker repairs missed-state transitions after process restarts and deletes call metadata after the configurable 90-day database expiry.
- Media uses WebRTC and the existing short-lived TURN boundary. Paramingle stores no audio, video, SDP, or ICE payloads.

The web Messages route provides recoverable thread/message state, unread indicators, strict text rendering, delete tombstones, incoming-call controls, and voice/video permission acquisition only after the user selects a call mode.

## Configuration and migration

Migration `0005_direct_communications.sql` adds read cursors, per-viewer hidden messages, global tombstones, explicit voice/video call media, call lifecycle state, inviter identity, and retention indexes.

New server configuration:

- `MESSAGE_DELETE_FOR_EVERYONE_SECONDS=900`
- `DIRECT_CALL_RING_SECONDS=30`

Verification completed locally: full root checks, production builds, eight Playwright desktop/mobile journeys, production dependency audit, and migration static validation. Container-backed integration was unavailable because this host's Docker installation does not provide the Compose subcommand.
