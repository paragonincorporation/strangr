# Units 9–11: authenticated realtime, matching, and random conversations

Implemented July 12, 2026.

## Boundaries

- Access tokens are exchanged over authenticated HTTP for random 256-bit tickets. Redis stores only a SHA-256 ticket key; tickets expire after 30 seconds and are atomically consumed with `GETDEL`.
- Socket identity is the internal account and database device-session binding from the ticket. Client events cannot choose a user, cohort, role, entitlement, or peer.
- Redis owns leased presence, connection routing, layered counters, cohort/mode queue partitions, match acknowledgments, recent-pair exclusions, sequence counters, and pub/sub delivery. Durable social and message data is not stored there.
- Queue pairing is one Lua operation. It prevents duplicate active state, searches only the same cohort/mode partition, applies deny/recent-pair keys, and leases both users to one UUID match.
- The block and sanction lookup boundary is deny-capable; persistent block and sanction sources arrive in Units 13 and 20. No permissive client assertion exists.
- RTC offers, answers, ICE, failures, and random text are schema-validated and relayed only to the current peer. Text receives a server sequence and sender acknowledgment. SDP, ICE, tickets, and message content are not logged.
- TURN credentials use the time-limited HMAC username convention and expire in five minutes. `TURN_CREDENTIAL_SECRET` remains server-only.
- The React route owns media, peer connection, realtime client, timers, and UI state. Video media is requested after intent; permission failure offers text. Every terminal path stops tracks, closes the peer/socket, detaches media, and clears peer-specific state.

## Operations

Redis is now required for API readiness and realtime operation. Configure `REDIS_URL`, comma-separated `TURN_URLS`, and a production-only `TURN_CREDENTIAL_SECRET`. Multiple API instances route user events through Redis pub/sub.

The current recent-pair TTL is 60 seconds, queue lease is 120 seconds, match acknowledgment lease is 20 seconds, and connection lease is 45 seconds. These are beta defaults and should become validated configuration before load tuning. Redis restart intentionally loses ephemeral queues/matches; clients receive a clear reconnect/end path and must rejoin after eligibility is checked again.

No database migration is required for Units 9–11. Unit 12 supplies durable encounter/message persistence and retention. Unit 13 supplies persistent block enforcement; Unit 18 supplies report intake/evidence.
