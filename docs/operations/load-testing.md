# Integration and load testing

## Scope and safety

Run load tests only against an approved local or staging environment. Never use production users, scrape tokens, disable safety controls, or exceed provider limits. The accountable engineering owner must approve the socket count and duration. H18 remains the authority for the launch ceiling.

The PostgreSQL integration suite creates verified adult fixtures for Free, Lite, Loaded, and Maxed Out and verifies effective grants. It uses fake Stripe identifiers only. Turnstile's documented test keys remain in local/test configuration. The Redis suite verifies that two API-store instances share tickets, queues, matches, cooldown state, and rate limits.

## Browser and integration coverage

Run:

```bash
npm run test:integration
npm run test:e2e
```

CI runs PostgreSQL/Redis integration separately from Chromium desktop/mobile shell coverage. Before Gate A, humans must still use two real browser/device sessions for signup, onboarding, preferences, text/video matching, forced TURN, cooldown, reveal, rating, report, block, reconnect, sandbox purchase/downgrade, deletion, and admin sanction. Store screenshots or recordings only when they contain no conversation media, message bodies, tokens, birth dates, or other private data.

## Protocol-aware socket harness

Create distinct verified adult staging accounts through the normal signup/onboarding flow, one for each simulated socket. Place their short-lived access tokens in an ignored, mode-0600 `.load-tokens.json` file:

```json
{ "tokens": ["token-one", "token-two"] }
```

Do not commit or attach this file to a ticket. Run a small calibration first:

```bash
LOAD_API_URL=https://staging-api.example.invalid \
LOAD_ORIGIN=https://staging.example.invalid \
LOAD_SOCKETS=20 \
LOAD_DURATION_SECONDS=30 \
npm run load:realtime
```

The harness obtains single-use tickets, opens authenticated sockets, sends versioned `match.join`, acknowledges matches, exchanges unique chat messages, cycles matches, and exercises application pings. Its mode-0600 report contains open/ready/queue/match/connect/chat/leave/next/reconnect/rating/error counts and client-observed p50/p95/p99 match latency. Increase concurrency in reviewed steps; stop on error-rate, latency, saturation, safety-backlog, or cost thresholds.

Run each behavior separately so failures are attributable:

```bash
# Successful text Next after the 25-second server cooldown
LOAD_SCENARIO=steady LOAD_MODE=text LOAD_DURATION_SECONDS=90 npm run load:realtime

# Early text Next attempts; cooldown_active is counted as expected, not fatal
LOAD_SCENARIO=skip-storm LOAD_MODE=text LOAD_HOLD_SECONDS=3 npm run load:realtime

# Close and reopen half the clients using fresh single-use tickets
LOAD_SCENARIO=churn LOAD_MODE=video LOAD_DURATION_SECONDS=60 npm run load:realtime

# Hold encounters past 120 seconds and submit authenticated ratings
LOAD_SCENARIO=steady LOAD_RATINGS=true LOAD_DURATION_SECONDS=150 npm run load:realtime
```

The harness refuses `LOAD_ENVIRONMENT=production`. A run fails on unexpected protocol/socket errors or rating failures. Signed Stripe webhook duplicate/out-of-order storms must use sandbox-signed fixtures, and worker/cleanup contention must use the reviewed maintenance command; neither secret-bearing operation is embedded in the socket harness.

Correlate every run with revision/environment tags and capture:

- API instance count, socket ceiling, RSS/CPU, disconnect and reconnect rates;
- Redis memory, command latency, evictions, queue keys, and flush recovery;
- PostgreSQL connections, CPU, locks, query latency, storage, and rating/webhook writes;
- worker duration/contention and cleanup backlog;
- TURN sessions/bytes and provider cost;
- p50/p95/p99 queue-to-match and WebRTC-connect latency;
- queue churn, skip storms, rating/webhook retries, and moderation intake;
- projected infrastructure, TURN, monitoring, and moderation cost per 1,000 conversations.

The harness does not synthesize media or claim a safe production ceiling. Forced TURN, WebRTC quality, webhook storms, cleanup contention, browser/device behavior, and cost require approved staging exercises and provider dashboards. H18 chooses a launch ceiling below both the measured technical limit and staffed moderation capacity.
