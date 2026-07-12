# Anonymous prototype baseline

Captured: July 11, 2026  
Baseline type: source, runtime, tests, and visual behavior  
Repository state: this directory has no `.git` metadata, so no commit hash or tag exists to record

## Purpose

This document freezes the useful behavior of the anonymous prototype before the account-based workspace replaces it. The legacy implementation remains in `public/`, `server/`, and `test/` and is available through the `legacy:*` root scripts. It is a behavior reference, not a compatibility layer or a production data source.

## Verification captured

Environment:

- Node.js `v22.19.0`
- npm `10.9.3`
- macOS arm64 development host

Commands and results:

```text
npm test
11 tests passed, 0 failed

npm start
Paramingle web: http://localhost:3000
Paramingle signaling: ws://localhost:8080

GET http://localhost:3000/health
200 {"ok":true,"activeSessions":0}

GET http://localhost:3000/
200
```

The socket integration suite proves two real sockets can queue, match, relay plain text, execute `next` without stale state, and resume a paired session inside the reconnect grace period.

## Runtime topology

- Express serves static content, runtime environment JavaScript, health, and report intake on `SERVER_PORT` (default 3000 in the original baseline).
- A separate `ws` server handles signaling on `WS_PORT` (default 8080).
- All sessions, pairs, queues, recent pairs, rate limits, and report authorization are process memory only.
- The browser stores the anonymous session ID/resume token in tab `sessionStorage`.
- STUN is provided through runtime configuration. Optional TURN credentials are placed in the same runtime response in this prototype and must not be copied into the new production design.

## HTTP surface

| Method | Path              | Baseline behavior                                                                                           |
| ------ | ----------------- | ----------------------------------------------------------------------------------------------------------- |
| GET    | `/health`         | Process health and active anonymous session count                                                           |
| GET    | `/runtime-env.js` | Browser WebSocket URL/port, ICE servers, and reconnect grace                                                |
| POST   | `/report`         | Pair-token-authorized metadata report with fixed reason, 500-character note, and 160-character text snippet |
| GET    | `/*`              | Static files from `public/`                                                                                 |

Report reasons are `harassment`, `sexual-content`, `hate-or-abuse`, `spam-or-scam`, `underage-concern`, and `other`.

Important pivot difference: the prototype automatically calls `next` after a successful report. The beta contract replaces this with distinct “Submit report” and “Submit and leave” actions. Do not preserve the automatic skip.

## WebSocket protocol baseline

Every wire message is JSON shaped as:

```json
{
  "type": "match.join",
  "requestId": "client-generated UUID",
  "payload": {}
}
```

Accepted client commands:

| Command          | Important payload/behavior                             |
| ---------------- | ------------------------------------------------------ |
| `session.resume` | Anonymous session ID and resume token from tab storage |
| `match.join`     | `mode` is `video` or `text`                            |
| `match.next`     | Closes the active pair, remembers it, and queues again |
| `match.cancel`   | Removes current queue entry                            |
| `rtc.signal`     | Active `pairId` and offer/answer/ICE object            |
| `chat.message`   | Active `pairId`; plain text trimmed to 500 characters  |
| `chat.typing`    | Boolean typing state relayed to active peer            |
| `media.state`    | Boolean audio/video summary relayed to active peer     |
| `session.end`    | Removes queue/pair/session and closes the socket       |

Server events observed in source/tests:

- `session.ready`, `session.resumed`, `session.resume_failed`
- `match.queued`, `match.found`, `match.cancelled`, `match.timeout`
- `peer.status` with `reconnecting`, `resumed`, or `left`
- `rtc.signal`
- `chat.message`, `chat.sent`, `chat.typing`
- `media.state`
- `rate_limited`
- `error`

The browser socket wrapper additionally emits local-only `socket.status`, `reconnect.scheduled`, and a generic `message` event.

## Client state machine

```text
idle --START--> matching
idle --END--> ended

matching --MATCHED--> connected
matching --SOCKET_LOST--> reconnecting
matching --CANCEL/END--> ended

connected --NEXT--> matching
connected --SOCKET_LOST--> reconnecting
connected --PEER_LEFT/END--> ended

reconnecting --RESTORED--> connected
reconnecting --NEXT--> matching
reconnecting --TIMEOUT/PEER_LEFT/END--> ended

ended --START--> matching
ended --RESET--> idle
```

Illegal transitions return `false` and do not mutate state.

## Behavior to preserve conceptually

- Camera/microphone is requested after chat intent, not on page load.
- Missing WebRTC or denied media falls back to text.
- The initiator creates the WebRTC offer; ICE received before the remote description is buffered.
- The socket reconnect delay steps through 0.5, 1, 2, 4, and 8 seconds.
- A paired disconnect has a bounded grace window. The peer sees reconnect/resume/left state.
- Queue entries expire, disconnected sockets are pruned, and recently ended pairs are temporarily excluded.
- `next` clears the old pair before requeueing.
- Chat bubbles use `textContent`; HTML-shaped text is displayed as text.
- Explicit end and `pagehide` close the peer/socket and stop local media tracks.
- Report data excludes video/audio and limits copied text.

## Known prototype limitations that must not survive

- Anonymous identity and client-held resume authorization.
- Separate public HTTP and WebSocket ports.
- In-memory durable/report state and instance-local rate limits.
- An 18+ modal instead of account onboarding and 16–17/adult cohorts.
- Automatic skip after report.
- Runtime delivery of long-lived TURN credentials.
- No block, friendship, persistence, admin authorization, audit, or retention jobs.
- Protocol parsing validates only broad shapes and trusts several nested payloads.

## Visual reference set

The checked-in PNGs under `docs/product/prototype-reference/` were captured at 1280×800 through the collaborative local browser and extracted from its evidence recording. They record layout and brand, not approved beta copy or policy:

1. `01-landing.png`
2. `02-age-gate.png`
3. `03-guidelines.png`
4. `04-matching.png`
5. `05-video-room.png`
6. `06-text-room.png`
7. `07-report.png`
8. `08-reconnect.png`
9. `09-ended.png`

The visual set confirms the near-black/purple system, heavy display type, liquid-glass panels, soft geometry, call dock, side chat, status pill, safety dialog, reconnect notice, and terminal state. Unit 3 should use these images as comparison references while replacing their anonymous/18+ language.
