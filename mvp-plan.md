# Paramingle MVP beta execution plan

Status: authoritative execution plan  
Owner: unassigned  
Last updated: July 13, 2026  
Target: public V1 beta, followed by V2 engagement and monetization expansion

## 1. How agents must use this file

This is the source of truth for getting Paramingle from its current repository state to a public beta. Product intent lives here. Existing ADRs and unit handoffs remain the source of truth for implementation details that have already shipped.

Before changing code, an agent must:

1. Read this file, `README.md`, `docs/architecture/open-decisions.md`, and the handoff for the area being changed.
2. Inspect the current implementation. Do not assume the progress notes in an older plan are current.
3. Run `git status --short` and preserve unrelated work.
4. Take one bounded task or a tightly related set of tasks.
5. Write tests with the implementation.
6. Add a new migration for schema changes. Never rewrite a migration that may have been applied.
7. Run the narrow checks while working and `npm run check` before handoff.
8. Update the progress ledger at the end of this file with files changed, commands run, results, remaining risks, and the exact next task.

An agent may not:

- invent legal, safety, tax, or business approval;
- put real credentials in the repository;
- weaken reporting, blocking, age enforcement, or privacy to make another feature easier;
- grant an entitlement based on browser state or a Stripe redirect;
- record video or audio;
- silently upload call screenshots;
- issue a permanent sanction solely from an automated classifier;
- mark a task complete when its manual launch dependency is still missing.

Use these labels throughout the plan:

- **Agent:** Codex can implement and verify this work.
- **Manual:** a named human must do it in a provider dashboard, sign a contract, supply judgment, or approve risk.
- **Gate:** launch cannot move past this point until the condition is met.

## 2. Outcome and success criteria

V1 exists to answer one question: do adults enjoy random conversations on Paramingle enough to return?

The beta is successful when the team can measure, with acceptable safety and reliability:

- verified-user to first-match conversion;
- queue wait time and match success;
- WebRTC connection success and call duration;
- the percentage of conversations reaching two minutes;
- like and dislike outcomes;
- skip timing;
- day 1, day 7, and day 30 return rate;
- friend-request and acceptance rate;
- reports and blocks per 1,000 encounters;
- subscription conversion and churn;
- infrastructure and moderation cost per 1,000 conversations.

Do not collect message bodies, video frames, audio, exact birth dates, or sensitive profile data in analytics.

## 3. Locked V1 product contract

### Audience and availability

- V1 is for users aged 18 and older.
- The interface, policies, support, and moderation are English-only.
- The product may be marketed as a global beta only after country-by-country approval.
- Production registration, matching, and billing are controlled independently by a server-owned country registry.
- The registry defaults to disabled. A country is enabled only after legal, payment, safety, support, and infrastructure review.
- Sanctioned, embargoed, payment-unsupported, or operationally unsupported regions remain disabled.
- Country matching preferences do not override launch availability.

### Accounts and onboarding

- Accounts are required.
- Support verified email/password and Google OAuth.
- Email verification is required before matching, messaging, friendship actions, calls, or billing.
- Collect date of birth once, encrypt it, and derive adult eligibility on the server.
- Reject users under 18. Do not reveal the exact eligibility calculation in the error response.
- Require versioned acceptance of the Terms, Privacy Policy, and Community Guidelines.
- Explain the no-nudity, no-recording, reporting, blocking, and Maxed Out profile-view rules during onboarding.

### Core conversation loop

1. Register, verify, and complete onboarding.
2. Choose text or video and set allowed preferences.
3. Enter authenticated, account-aware matching.
4. Talk, use the in-call text chat, reveal a safe profile card where allowed, or leave.
5. Report or block at any time.
6. After 120 connected seconds, like or dislike the conversation.
7. Optionally become friends and use the existing direct messaging and call features.
8. Return to matching or end the session.

### Text skip rule

- In a connected random text conversation, Next is locked for 25 seconds.
- The server owns the unlock timestamp. Client clock changes and reconnects cannot reset or bypass it.
- Leave, Block, Report, and Report and leave are never delayed.
- Video Next remains immediate.
- Queue join/leave spam has a separate rate limit.

### Conversation outcomes

- A conversation becomes rateable after 120 server-measured connected seconds.
- Each participant may submit one immutable `like` or `dislike`.
- A rating cannot be submitted for a conversation that never connected.
- The window closes 24 hours after the encounter ends.
- The other person's response stays hidden until both respond or the window closes.
- Reports and blocks do not create, delete, or rewrite ratings.
- V1 stores outcomes and total likes but awards no ParamPoints or XP.

### Profile exposure during random calls

- Free, Lite, and Loaded users begin anonymous.
- Each may reveal their own safe call card for that encounter. Revealing is one-way; it does not force the other person to reveal.
- Maxed Out users see the other participant's safe call card when the match connects. They remain anonymous until they reveal themselves.
- Users must be told about this Maxed Out behavior during onboarding and in privacy settings.
- The safe card may contain avatar, username, display name, country, language, and interests.
- It never contains exact birth date, email, restricted bio, online history, device data, reports, sanctions, payment data, or deleted content.
- Blocking immediately ends the encounter and revokes call-card access.

### V1 plans

Prices are monthly USD list prices.

| Plan      | Price | Active V1 entitlements                                                                                                         |
| --------- | ----: | ------------------------------------------------------------------------------------------------------------------------------ |
| Free      |    $0 | Text/video matching, country/language/interests preferences, profiles, reporting, blocking, friends, direct messages and calls |
| Lite      |    $3 | Free features, gender preference, online-status display                                                                        |
| Loaded    |    $9 | Lite features, premium media target up to FHD, reconnect previous eligible match, profile frames/backgrounds, supporter badge  |
| Maxed Out |   $19 | Loaded features, capped queue priority, safe-call-card override, early-access flag, direct support route                       |

Rules:

- Ads do not ship in V1.
- Daily ParamPoints and XP, quests, levels, and Maxed Out temporary max level are marked "coming in V2" and are not sold as active benefits.
- Premium quality is a best-effort target. Browser, hardware, network, TURN, and peer conditions may lower received resolution.
- Paid queue priority has a hard cap. Free users must not starve.
- Paid features never bypass blocks, sanctions, launch-country rules, compatibility, or safety checks.
- Reconnect is an offer to the immediately previous eligible match, not a forced connection.
- Stripe webhooks, not checkout redirects, control entitlements.

### V1 safety promise

- Prohibit harassment, nudity, sexual behavior, hate speech, spam, scams, fake-camera abuse, and underage use.
- Video and audio are never recorded or stored by Paramingle.
- Reporting does not end a conversation unless the user chooses Report and leave.
- Blocking ends the interaction and prevents future matching, profile access, friend requests, messages, calls, reveals, and reconnect.
- Automated classifiers are risk signals only. They cannot permanently ban an account.
- Basic anti-bot, spam detection, rate limiting, and moderation operations must work before launch.

## 4. V2 product contract

V2 begins after V1 proves the core loop and supplies enough data to tune rewards without encouraging farming.

V2 includes:

- ParamPoints and an immutable transaction ledger;
- XP, a versioned level curve through level 50, and level-up rewards;
- an explainable reputation model;
- daily and weekly quests;
- streak and invite rewards;
- daily subscription grants;
- temporary Maxed Out level presentation without minting permanent XP;
- an expanded cosmetic catalog;
- ads after written provider approval;
- optional rewarded ads if policy permits;
- progression-aware profiles.

The initial reputation system must not subtract XP every day. Start with reputation-based earning modifiers and recovery tasks. Daily XP decay needs a separate product decision, user-facing explanation, abuse analysis, and appeal policy.

## 5. Current repository baseline

The repository is not an empty prototype. It is an npm-workspaces monorepo using Node.js 22, TypeScript, React/Vite, Fastify, `ws`, Drizzle, PostgreSQL, Redis, and WebRTC.

Implemented boundaries include:

- user and admin React applications;
- shared UI, configuration, contracts, and database packages;
- Supabase-oriented authentication and account reconciliation;
- encrypted birth-date storage and profile/privacy settings;
- avatar quarantine and processing;
- authenticated realtime tickets;
- Redis matching, presence, leases, and signaling;
- random text/video sessions and encounter retention;
- blocks, friends, discovery, direct messages, and direct calls;
- reports, moderation cases, sanctions, appeals, roles, and audit data;
- Render/Vercel deployment manifests and a maintenance worker.

Missing or incomplete work includes:

- production provider configuration;
- an 18+ production gate and launch-country controls;
- V1 conversation ratings;
- the 25-second text skip lock;
- matching preference and entitlement enforcement;
- Stripe catalog, billing, webhooks, and entitlement ledger;
- paid identity reveal, reconnect, queue priority, and quality policies;
- privacy export/deletion completion;
- automated abuse signals;
- production monitoring, load testing, restore rehearsal, and launch operations.

Verification on July 12, 2026:

- `npm run check` passed.
- Six migrations validated.
- Unit, API, UI, contract, and legacy tests passed.
- Redis was not running; API tests correctly exercised degraded readiness behavior.

Before starting Task 1, re-run the inventory because code may have changed.

## 6. Target architecture and invariants

Keep the current topology:

- `apps/web`: public React client on Vercel;
- `apps/admin`: separate admin React client on Vercel;
- `apps/api`: Fastify HTTP, `/ws`, and worker on Render;
- `packages/contracts`: Zod transport contracts;
- `packages/database`: Drizzle schema, migrations, repositories, encryption;
- `packages/ui`: accessible shared components;
- `packages/config`: validated server/browser configuration;
- Supabase: Auth, PostgreSQL, and avatar storage;
- Redis: queues, leases, cooldowns, rate limits, and presence;
- browser WebRTC with managed TURN fallback;
- Stripe Checkout and Billing Portal.

System invariants:

- Browsers never receive server secrets.
- PostgreSQL owns durable financial, moderation, rating, and entitlement data.
- Redis owns expiring realtime state.
- The server owns age eligibility, connected duration, cooldowns, rating eligibility, matching rights, quality policy, priority, and profile-view rights.
- Every retryable write has an idempotency key or a unique database constraint.
- API startup never runs migrations.
- Logs never contain tokens, exact birth dates, raw Stripe payloads, private message bodies, video frames, or audio.
- Breaking realtime changes require a protocol version and an upgrade response.

## 7. Public interface and schema work

These names are the default contract. Change one only when the existing code makes it technically invalid, and record the replacement in an ADR.

### Launch control tables

Add `launch_countries`:

- `country_code char(2)` primary key;
- `registration_enabled boolean`;
- `matching_enabled boolean`;
- `billing_enabled boolean`;
- `reason_code text`;
- `reviewed_at timestamptz`;
- `reviewed_by uuid null`;
- timestamps.

Add `user_country_state`:

- user ID;
- registration country;
- last observed country;
- source and checked timestamp.

Do not store raw IP addresses here.

### Billing and entitlement tables

Add:

- `subscription_plans` with stable keys `free`, `lite`, `loaded`, `maxed_out`, environment-specific Stripe IDs, price, version, and active state;
- `subscriptions` with user, Stripe customer/subscription IDs, status, current period, cancellation state, and last processed object time;
- `entitlement_grants` with entitlement key, source, validity, and revocation;
- `stripe_webhook_events` keyed by Stripe event ID for idempotent processing.

Do not store card data.

### Matching preference tables

Add `matching_preferences` with mode-specific country, language, interests, optional self-described gender, and optional gender preference.

- Gender is optional and private.
- Include an `everyone` preference.
- Never infer gender from name, avatar, profile text, or video.
- Free users may set country, language, and interests.
- Lite and above may set gender preference.

### Encounter additions

Add authoritative connected timing and rating fields to encounters:

- connected-at;
- connected duration;
- rating-eligible-at;
- rating-window-closes-at.

Add `encounter_identity_reveals` with encounter, viewer, subject, source (`subject_consent` or `maxed_entitlement`), reveal time, and revocation.

Add `conversation_ratings` with encounter, rater, subject, outcome, and submission time. Enforce one row per encounter/rater.

Add `reconnect_requests` with requester, previous encounter, state, expiry, and resolution.

### HTTP endpoints

Add contracts, handlers, authorization, OpenAPI entries, and tests for:

- `GET /v1/launch/availability`
- `GET /v1/catalog/plans`
- `GET /v1/me/entitlements`
- `GET /v1/me/matching-preferences`
- `PUT /v1/me/matching-preferences`
- `POST /v1/billing/checkout`
- `POST /v1/billing/portal`
- `POST /v1/billing/webhooks/stripe`
- `POST /v1/encounters/:id/reveal`
- `GET /v1/encounters/:id/call-card`
- `POST /v1/encounters/:id/rating`
- `GET /v1/me/rating-summary`
- `POST /v1/encounters/:id/reconnect`
- `POST /v1/reconnect-requests/:id/accept`
- `POST /v1/privacy/export`
- `POST /v1/privacy/delete`
- `POST /v1/privacy/delete/cancel`
- `GET/PUT /v1/admin/launch-countries`
- `GET /v1/admin/subscriptions/:userId`
- `POST /v1/admin/entitlements/grant`
- `POST /v1/admin/entitlements/revoke`
- `GET /v1/admin/quality/summary`

### Realtime events

Add compatible, versioned events:

- `session.timer`: connected time, text unlock, and rating eligibility;
- `session.identity_revealed`: safe card and reveal source;
- `session.rating_available`;
- `session.rating_submitted`: acknowledgement without leaking the other rating;
- `session.entitlements_changed`;
- `session.reconnect_offered` and `session.reconnect_resolved`;
- `session.quality_policy`: target dimensions, frame rate, and bitrate.

## 8. Execution order

Tasks are dependency-ordered. An agent may parallelize only tasks that do not touch the same contracts, migrations, or invariants.

### Task 0: establish the live execution ledger

**Agent**

- Inventory every route, page, repository, migration, worker job, and realtime event.
- Mark each V1 capability implemented, partial, placeholder, absent, or manual.
- Correct stale progress notes in this file only. Preserve older plans as history.
- Add the exact next task to the progress ledger.

**Done when**

- A new agent can find the next change without chat history.
- No completed foundation is scheduled for a rewrite.

### Task 1: assign human owners

**Manual**

Assign named owners for product, engineering release, safety, privacy/legal, billing/tax, customer support, incidents, and data protection. Agents must leave owners `unassigned` until a human provides names.

**Gate:** public registration cannot open with these roles unassigned.

### Task 2: lock launch and policy requirements

**Manual**

- Select the first countries for legal review.
- Approve prohibited and held countries.
- Approve Terms, Privacy Policy, Community Guidelines, cookie notice, subscription/refund terms, moderation policy, appeals policy, and retention schedule.
- Define the legal entity and support contacts shown to users.
- Approve the Maxed Out safe-card disclosure.

**Agent**

- Version policy documents and acceptance records.
- Replace public 16+ copy with 18+.
- Add deny-by-default country controls and neutral unsupported-region UX.
- Add admin country controls and audit events.
- Add feature flags for registration, matching, video, billing, reconnect, paid reveal, queue boost, and automated detection.

**Tests**

- Disabled countries cannot register, match, or bill as configured.
- A matching preference cannot bypass availability.
- Admin country changes require AAL2 and are audited.

### Task 3: configure local, CI, staging, and production environments

**Manual**

Create organization-owned Supabase, Render, Vercel, TURN, Stripe, SMTP, Turnstile, error-monitoring, uptime-monitoring, analytics, DNS, and support accounts. Enable MFA and least privilege. Add secrets only through provider secret stores.

**Agent**

- Extend `.env.example` and validated config for new services.
- Reject placeholder credentials in production.
- Keep preview deployments away from production data and billing.
- Document every secret's owner, scope, rotation, and destination.
- Keep server values out of `VITE_*` variables.

Supabase production setup must include RLS review, custom SMTP, Auth rate-limit review, backups, and PITR where the recovery target requires it. See the [Supabase production checklist](https://supabase.com/docs/guides/deployment/going-into-prod).

### Task 4: enforce 18+ onboarding

**Agent**

- Reject invalid, future, and under-18 birth dates.
- Derive eligibility using server time.
- Retain encrypted birth date for account lifetime under the approved policy.
- Prevent birth-date self-service changes after onboarding.
- Reject existing minor-cohort accounts from every communication capability.
- Update UI copy and fixtures.

**Tests**

- Exact eighteenth birthday boundaries in UTC.
- Leap-day birth dates.
- Replayed onboarding steps.
- Client timezone and clock manipulation.
- Minor account attempts across HTTP and WebSocket paths.

### Task 5: finish matching preferences

**Agent**

- Add normalized country, language, interest, gender identity, and gender preference contracts.
- Apply hard exclusions before preferences: eligibility, sanctions, blocks, country availability, active session, and recent pair.
- Enforce Lite entitlement for gender preference.
- Apply a documented relaxation policy as wait time grows. Never relax gender silently.
- Show users when narrow filters reduce liquidity.
- Do not create fake users to fill queues.

**Tests**

- Symmetric compatibility.
- Block and sanction exclusion.
- Free-tier gender-filter denial.
- Queue cancellation and stale lease cleanup.
- Multi-instance Redis atomicity.
- Free-user fairness under paid priority.

### Task 6: add the text skip cooldown

**Agent**

- Record server-authoritative connected time.
- Return `skipAllowedAt` and structured `cooldown_active` errors.
- Add an accessible UI countdown.
- Keep safety exits immediate.
- Add queue churn limits separate from the conversation cooldown.

**Tests**

- Just before, exactly at, and after 25 seconds.
- Reconnect and client-clock manipulation.
- Video remains immediate.
- Block and Report and leave remain immediate.

### Task 7: add conversation ratings

**Agent**

- Add timing fields, rating table, repository, API, realtime events, UI, and summary projection.
- Make writes idempotent.
- Show rating controls after two connected minutes and on the ended screen.
- Keep the other outcome private until resolution.
- Add anomaly metrics for repeated-pair and coordinated rating patterns.

**Tests**

- Duration eligibility and expiry.
- Participant authorization.
- Concurrent submissions.
- Duplicate retries.
- Reports and blocks do not rewrite ratings.
- Aggregate total likes remains correct after deletion/anonymization rules.

### Task 8: implement safe-card reveal

**Agent**

- Build one safe-card projection in the account service.
- Add session-scoped reveal persistence and realtime delivery.
- Enforce consent for Free, Lite, and Loaded.
- Enforce active Maxed Out entitlement for the override.
- Revoke on block, deletion, sanction, expiry, or lost entitlement.
- Avoid caching a projection without viewer authorization in its cache key.

**Tests**

- Unrevealed free user is inaccessible.
- Maxed Out sees only approved fields.
- Expired subscription loses access.
- A different encounter ID cannot be substituted.
- Private and internal fields never leak.

### Task 9: implement reconnect

**Agent**

- Track the immediately previous eligible encounter.
- Require Loaded or Maxed Out.
- Create a short-lived offer without exposing forbidden identity.
- Require compatible availability and acceptance from the other user.
- Fall back to normal matching after decline or expiry.

**Tests**

- Free and Lite denial.
- Block, sanction, deletion, and country changes invalidate offers.
- Concurrent reconnect and queue join are atomic.
- Polling does not leak presence indefinitely.

### Task 10: implement media quality policies

**Agent**

- Define conservative Free/Lite targets and premium Loaded/Maxed targets up to 1920x1080.
- Use media constraints, sender parameters, and WebRTC statistics where supported.
- Adapt down for packet loss, latency, CPU pressure, bandwidth, and relay conditions.
- Provide browser-specific fallbacks.
- Present measured quality as diagnostics, not a guarantee.

**Tests**

- Permission denial and missing devices.
- Unsupported sender parameters.
- Bandwidth degradation and TURN-only calls.
- Camera switching and network changes.
- Safari, Firefox, Chromium, iOS, and Android behavior.

### Task 11: build Stripe billing and entitlements

**Manual**

- Verify the business, bank, and tax identity.
- Disclose the 18+ random-video UGC model and moderation controls to Stripe.
- Obtain any requested approval.
- Create sandbox and live products/prices.
- Configure the Billing Portal, refunds, cancellation, and support authority.
- Identify and complete tax registrations before collection where required.

Stripe subscriptions change asynchronously. Verified webhooks must provision and revoke access. See [Stripe subscription webhooks](https://docs.stripe.com/billing/subscriptions/webhooks). Stripe Tax can monitor thresholds, but the business remains responsible for registration. See [Stripe tax registrations](https://docs.stripe.com/tax/registering).

**Agent**

- Add plan, subscription, entitlement, and webhook-event migrations.
- Seed stable internal plan keys separately from Stripe IDs.
- Verify webhook signatures against the raw body.
- Store event IDs before processing.
- Handle subscription created, updated, deleted, invoice paid/failed, disputes, refunds, and checkout completion.
- Resolve out-of-order events using object timestamps and reconciliation fetches.
- Add a scheduled reconciliation job.
- Add authenticated Checkout and Billing Portal endpoints.
- Never provision from the return URL.

**Tests**

- Signature failure and replay.
- Out-of-order delivery.
- Duplicate checkout.
- Upgrade, downgrade, cancellation, payment failure, grace period, refund, and dispute.
- Reconciliation repairs a missed event.

### Task 12: centralize entitlement enforcement

**Agent**

Implement one service for:

- `matching.gender_filter`;
- `presence.online_status`;
- `media.premium_quality`;
- `matching.reconnect`;
- `profile.frames`;
- `profile.animated_background`;
- `profile.supporter_badge`;
- `matching.priority_weight`;
- `call_card.paid_override`;
- `features.early_access`;
- `support.direct`.

Every HTTP and realtime decision must call this boundary. Cache briefly and invalidate on webhook changes. Preserve rights through a paid-through cancellation date. Apply the approved payment-failure grace period. Audit manual grants.

**Tests**

- Browser claims cannot grant features.
- Active calls and queues refresh after revocation.
- Priority has a cap and cannot starve free users.
- Manual grants expire and are audited.

### Task 13: replace the premium placeholder UI

**Agent**

- Fetch the server catalog.
- Show active V1 and coming V2 benefits separately.
- Show current plan, renewal, cancellation, past-due state, and portal access.
- Add processing and provider-unavailable states.
- Avoid fake urgency and hidden cancellation.
- Add accessible price and feature comparison.

### Task 14: complete moderation operations

**Manual**

- Approve report taxonomy, sanction matrix, evidence retention, urgent escalation, appeal targets, coverage hours, and staffing.
- Train moderators before invite traffic.

**Agent**

- Verify harassment, NSFW, spam, hate speech, fake camera, and underage report paths.
- Confirm Report does not leave and Report and leave does.
- Confirm Block revokes every contact path.
- Add queue priority, escalation timers, reason templates, and restricted evidence access.
- Add immutable audit events for case reads and actions.
- Require AAL2, exact admin origin, least-privilege roles, session timeout, and reauthentication for high-risk actions.

### Task 15: add anti-bot and spam protection

**Agent**

- Add Turnstile to signup and recovery through Supabase support and to risk-triggered application flows where needed.
- Validate application tokens server-side with expected hostname and action.
- Rate-limit signup, profile updates, queue joins, Next, messages, requests, ratings, reports, and reconnect by account and session.
- Use privacy-preserving network-prefix limits for unauthenticated abuse.
- Detect high-rate identical messages and queue churn.
- Use escalating friction rather than unappealable secret bans.

Turnstile tokens are single-use, expire after five minutes, and require server validation. See [Cloudflare Siteverify](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/). Use official test keys in automated tests.

### Task 16: add basic NSFW risk signals

**Manual**

- Approve a model/provider, license, privacy terms, accuracy evaluation, user notice, and enabled countries.
- Decide whether client-side frame analysis is acceptable.

**Agent**

Default design, subject to approval:

- Run an approved classifier on low-frequency frames in the browser.
- Never transmit or persist frames.
- Send bounded scores and model version only.
- Locally obscure or pause outgoing video after repeated high-confidence signals and show a warning.
- Make risk data visible to moderators only when tied to a report or repeated abuse.
- Add a kill switch.
- Treat fake-camera heuristics the same way: as signals, not proof.

**Tests**

- No frames appear in network traffic or logs.
- Model failure does not remove reporting or blocking.
- Feature-disabled behavior.
- False-positive and appeal path.
- Performance on low-end devices.
- Pre-launch evaluation across lighting and skin tones.

### Task 17: complete privacy operations

**Agent**

- Finish session listing, revoke-one, and sign-out-other-sessions.
- Add authenticated export requests and worker-generated, short-lived downloads.
- Exclude other users' private data, moderator notes, fraud signals, and secrets.
- Add deletion pending, recent reauthentication, optional cancellation window, immediate contact disablement, session revocation, profile removal, and policy-based erasure/anonymization.
- Handle active subscriptions and required billing/safety retention.
- Make retention jobs idempotent and bounded.

Cleanup must cover random messages and user encounter history after 48 hours, reconnect requests, friend requests, rating windows, abandoned uploads, stale realtime state, security logs, export archives, deletion-pending accounts, report evidence, and expired grants.

### Task 18: add observability and cost controls

**Manual**

Create monitoring projects, alert destinations, escalation contacts, and spending budgets.

**Agent**

- Add structured error reporting with revision/environment tags and tested redaction.
- Monitor API readiness, WebSockets, queue wait, match success, WebRTC connection success, call duration, early skips, ratings, reports, blocks, TURN use, webhook delay, worker lag, database saturation, and Redis memory.
- Add global and per-country concurrency ceilings.
- Add honest beta-full UX.
- Alert on abnormal TURN, Redis, database, email, storage, and billing usage.
- Connect every alert to a runbook.

### Task 19: security, accessibility, and browser hardening

**Agent**

Security review must cover:

- authorization and IDOR across profiles, encounters, ratings, messages, reports, calls, billing, exports, and admin;
- WebSocket origin, ticket replay, stale sessions, and protocol downgrade;
- Stripe signatures, replay, and event ordering;
- upload type, size, decompression bombs, and SVG rejection;
- XSS in profiles, messages, and moderation evidence;
- SQL injection, SSRF, CORS, CSP, headers, and log redaction;
- deletion, block, sanction, and subscription race conditions.

Accessibility/browser review must cover keyboard use, screen readers, focus, contrast, reduced motion, responsive layouts, media-permission failure, device switching, network changes, countdown announcements, billing return, and admin dialogs on current Chrome, Edge, Firefox, desktop Safari, iOS Safari, and Android Chrome.

**Manual**

- Commission an independent penetration test before unrestricted public traffic.
- Publish a security contact and vulnerability disclosure process.

### Task 20: build integration, E2E, and load coverage

**Agent**

- Seed adult accounts for every plan.
- Use fake Stripe webhook fixtures and Turnstile test keys.
- Add two-browser text/video matching tests and TURN-forced tests.
- Test signup, onboarding, preferences, cooldown, reveal, rating, report, block, reconnect, purchase, downgrade, deletion, and admin sanction.
- Add multi-instance API/Redis integration tests.
- Build a protocol-aware load harness for sockets, queue churn, matching, chat, skip storms, heartbeats, ratings, webhooks, and cleanup jobs.
- Measure the safe socket ceiling, match latency, Redis/database limits, reconnect behavior, memory, worker contention, and cost per 1,000 conversations.

**Manual**

Approve a launch ceiling below both the measured infrastructure limit and the staffed moderation limit.

### Task 21: deploy and rehearse operations

**Manual**

- Configure product, API, admin, auth, and support domains.
- Configure SPF, DKIM, and DMARC.
- Enter exact callbacks and origins in Supabase, Google, Stripe, Vercel, and Render.
- Choose recovery point and recovery time targets.
- Enroll every admin in MFA.

**Agent**

- Require format, lint, typecheck, tests, migration validation, secret scan, and builds in CI.
- Apply migrations before application deploys.
- Enforce HTTPS/WSS, exact origins, CSP, and HSTS after domain verification.
- Rehearse database restore, Redis loss, webhook replay, auth outage, TURN outage, credential rotation, bad migration recovery, moderator compromise, and data exposure response.
- Document rollback and kill-switch steps.

Release order:

1. Approve the release candidate.
2. Confirm a restore point.
3. Apply reviewed migrations.
4. Deploy API and worker.
5. Verify liveness, readiness, and protocol compatibility.
6. Deploy web and admin.
7. Run production smoke tests.
8. Enable features and countries gradually.
9. Watch alerts and product/safety metrics before expansion.

## 9. Required automated scenarios

No V1 feature is done without the relevant cases below.

### Identity and authorization

- unverified, underage, limited, suspended, banned, deletion-pending, and deleted accounts;
- wrong user and wrong encounter/thread identifiers;
- expired or replayed auth and realtime tickets;
- stale entitlements and mid-session revocation;
- admin without AAL2 or required role.

### Concurrency and retries

- duplicate HTTP submissions;
- duplicate/out-of-order realtime commands;
- two devices for one account;
- concurrent Next, Block, Report, rating, reconnect, and disconnect;
- webhook duplicates and out-of-order delivery;
- worker retry after partial completion.

### Failure behavior

- Postgres unavailable;
- Redis unavailable or flushed;
- TURN unavailable;
- Stripe and SMTP timeouts;
- browser permission denial;
- offline/reconnect and tab close;
- unsupported media APIs;
- feature flag disabled while in use.

### Privacy and safety

- safe-card field leakage;
- blocked-user cache leakage;
- log and analytics redaction;
- export cross-user leakage;
- retention and deletion races;
- report spam without blocking urgent reporting;
- automated-risk false positives.

## 10. Beta gates

### Gate A: internal alpha

Pass when:

- `npm run check` and integration suites pass;
- two real devices match by text and video;
- a TURN-forced call works;
- cooldown, reveal, rating, report, block, and reconnect work;
- sandbox billing provisions and revokes all plans;
- an admin sanction revokes an active capability;
- no production user data is involved.

### Gate B: closed beta

Pass when:

- production infrastructure and backups are configured;
- approved policies are live;
- moderators are trained and scheduled;
- Stripe live approval and applicable tax setup are complete;
- backup restore succeeds;
- an independent security review has no open critical or high finding;
- invite-only operation completes an agreed review period;
- safety backlog, cost, uptime, and match quality stay within approved limits.

### Gate C: country-limited public beta

Pass when:

- registration is enabled only in approved countries;
- capacity ceilings and kill switches are active;
- on-call, support, appeals, billing, and deletion workflows have owners;
- no severity-one incident is open;
- queue wait, connection success, report rate, TURN cost, and moderation backlog meet launch thresholds.

### Gate D: global expansion

Global expansion is repeated country enablement, not one configuration switch.

For each country or small group:

1. Complete legal, privacy, payment, and safety review.
2. Confirm English support is acceptable.
3. Enable and test in staging.
4. Enable production registration at a low ceiling.
5. Watch quality, safety, support, billing, and cost.
6. Expand, hold, or disable.

## 11. V1 final acceptance checklist

- [ ] Adults can register, verify, onboard, use the product, export data, and delete accounts.
- [ ] Under-18 users cannot enter any communication flow.
- [ ] Text and video matching work across different networks and API instances.
- [ ] TURN fallback is tested in production-like conditions.
- [ ] Text Next is locked for 25 connected seconds; safety exits are immediate.
- [ ] Rating is available after 120 connected seconds and cannot be forged or duplicated.
- [ ] Blocking revokes every communication, discovery, reveal, and reconnect path.
- [ ] Reports reach the approved moderation workflow.
- [ ] Sanctions revoke active and future capabilities.
- [ ] Free, Lite, and Loaded stay anonymous until self-reveal.
- [ ] Maxed Out sees only the documented safe card.
- [ ] All four plans purchase, renew, upgrade, downgrade, fail, cancel, refund, and revoke correctly.
- [ ] Free users remain matchable under paid queue priority.
- [ ] Premium media degrades safely.
- [ ] Retention, exports, deletion, backups, and restore work.
- [ ] Monitoring reaches a named human.
- [ ] No critical or high security defect is open.
- [ ] Legal, safety, business, and engineering owners approve launch.
- [ ] Capacity is below infrastructure and moderation ceilings.

## 12. V2 execution outline

### Economy and XP

Add immutable `parampoint_transactions`, `xp_transactions`, `reputation_events`, and a rebuildable progression summary. Every row needs source type, source ID, amount, idempotency key, occurrence time, and reversal reference.

Store a versioned level curve through level 50. Do not hard-code repeated multiplication in the UI. Maxed Out's temporary max-level presentation must not mint XP; after cancellation, show the earned level.

### Reputation

Use eligible ratings, confirmed reports, overturned reports, blocks, account age, and collusion detection. Require minimum sample sizes, rehabilitation, anti-brigading, broad user-facing explanations, and appeals. Do not infer protected characteristics.

### Quests

Add versioned quest definitions and assignments with reset period, objective, target, reward, eligibility, progress, claim state, and expiry. Count server-confirmed events only. Require minimum conversation duration and distinct counterpart rules to limit farming.

### Subscription grants

Add one idempotent grant per user and period. Document timezone and missed-day behavior. Reconcile subscription changes. Do not create pay-to-harass advantages.

### Ads

Ads remain blocked until an ad provider gives written approval for an 18+ random-video UGC service. Google AdSense is not a default option: its policy prohibits ads on screens where private messages, live chats, video chats, or private chatrooms are the primary focus, and it prohibits preset-time pre-roll gates. See [Google ad placement policies](https://support.google.com/adsense/answer/1346295).

If approved later:

- place ads only on provider-approved non-conversation surfaces;
- never load ad code while private chat or live media is visible;
- never send profile, message, match, or sensitive data to the provider;
- apply consent and regional opt-out;
- frequency-cap on the server;
- disable ads for Loaded/Maxed Out and reduce them for Lite;
- provide a provider kill switch;
- keep rewarded ads clearly voluntary.

### V2 rollout

Run the economy in shadow mode, analyze inflation and abuse, then enable internal progression, a small quest cohort, plan grants, and cosmetics. Add ads last. Compare conversation duration, ratings, safety, and retention against a control group. Roll back mechanics that worsen conversation quality or abuse.

## 13. Manual work register

Codex agents cannot complete these actions without a human:

- form and verify the business entity;
- pay providers or accept contracts;
- pass identity, bank, domain, OAuth, Stripe, and tax verification;
- supply production secrets securely;
- approve legal and policy text;
- decide lawful launch countries;
- hire, train, and schedule moderators and support staff;
- sign DPAs and vendor agreements;
- choose sanction, appeal, and refund authority;
- enroll physical/admin MFA factors;
- commission independent security/legal review;
- respond to incidents, disputes, legal requests, users, and appeals;
- approve launch.

For every manual step, the responsible agent must document the dashboard URL, exact fields, secret classification, verification, revocation/rollback, owner, and completion status. Never ask a human to paste a secret into chat or commit it.

## 14. Defaults and assumptions

- The current TypeScript architecture remains the production foundation.
- Legacy JavaScript stays as a behavior reference only.
- V1 is 18+ and English-only.
- Global access expands country by country.
- Four monthly USD plans ship in V1.
- Annual plans, trials, coupons, gifting, and lifetime plans are deferred.
- Ads, ParamPoints, XP, levels, reputation mechanics, and quests are V2.
- Likes and dislikes ship in V1 without rewards.
- Country, language, and interests are free filters; gender preference is Lite and above.
- Maxed Out sees a disclosed safe card, not an unrestricted private profile.
- No call recording or hidden screenshot capture.
- Automated detection creates reviewable risk signals, not permanent automatic sanctions.
- Existing direct friends, messages, and calls remain in V1 because they are already implemented.
- Managed TURN remains the production default. A vendor must be chosen after regional testing and cost modeling.
- Every production provider account is organization-owned.
- A missing legal approval, provider approval, moderator capacity, restore test, or critical security fix blocks public launch.

## 15. Progress ledger

Update this table after every completed task. Keep evidence concise and link repository files where useful.

| Task                      | Status      | Owner/agent | Evidence                                                  | Blocker or exact next action                            |
| ------------------------- | ----------- | ----------- | --------------------------------------------------------- | ------------------------------------------------------- |
| 0. Live inventory         | complete    | Codex       | July 12 inventory below                                   | Re-audit affected boundaries at the start of each task  |
| 1. Human owners           | blocked     | unassigned  | Required roles listed below                               | Humans assign accountable owners                        |
| 2. Launch and policies    | in_progress | Codex       | Run 2 country controls and policy gates                   | Humans approve countries and final policy documents     |
| 3. Environments           | in_progress | Codex       | Run 3 CI, validation, setup runbook                       | Humans create/configure production provider accounts    |
| 4. 18+ onboarding         | complete    | Codex       | Run 2 onboarding, contact guards, tests                   | Exercise database integration when services are running |
| 5. Matching preferences   | complete    | Codex       | Run 3 persistence, API, Redis, UI, tests                  | Exercise integration suite through CI or local services |
| 6. Text cooldown          | complete    | Codex       | Realtime lease, contracts, API, UI, tests                 | Exercise Redis integration when Docker is running       |
| 7. Ratings                | in_progress | Codex       | Run 4 migration, API/realtime/UI, tests                   | Human copy approval and staging integration validation  |
| 8. Safe-card reveal       | in_progress | Codex       | Run 4 scoped projection/revocation/UI                     | Human disclosure approval and staging validation        |
| 9. Reconnect              | in_progress | Codex       | Run 4 entitlement/offer/atomic accept flow                | Human lifetime/copy approval and staging validation     |
| 10. Media quality         | in_progress | Codex       | Run 5 server policy/adaptation/browser fallbacks          | H10 selects TURN and validates targets in staging       |
| 11. Stripe billing        | in_progress | Codex       | Run 5 migration/webhooks/Checkout/Portal/reconciliation   | H11 approval, IDs, tax decisions, sandbox/live tests    |
| 12. Entitlements          | in_progress | Codex       | Run 5 centralized grants/plan rights/audit/fair priority  | H11 approves grace and staging revocation tests         |
| 13. Premium UI            | in_progress | Codex       | Run 6 server catalog/status/comparison/Portal UX          | H11 catalog approval and real Stripe staging validation |
| 14. Moderation operations | blocked     | Codex       | Run 6 SLA queue/evidence/templates/sanction operations    | H12 policy approval, MFA choice, staffing, training     |
| 15. Anti-bot/spam         | in_progress | Codex       | Run 6 Turnstile validation/scoped limits/repeat detection | H13 widgets, thresholds, friction and staging approval  |
| 16. NSFW signals          | blocked     | unassigned  | None                                                      | Manual model/privacy approval                           |
| 17. Privacy operations    | not_started | unassigned  | Partial session/account foundations                       | Inventory gaps after Task 0                             |
| 18. Observability/cost    | not_started | unassigned  | Health endpoints exist                                    | Choose providers and implement redaction/metrics        |
| 19. Hardening             | not_started | unassigned  | Current quality foundation                                | Begins after feature-complete release candidate         |
| 20. E2E/load              | not_started | unassigned  | Basic Playwright/integration config                       | Expand throughout Tasks 4-19                            |
| 21. Deploy/rehearse       | not_started | unassigned  | Vercel/Render manifests exist                             | Requires staging providers and feature completion       |

### Current handoff

Tasks 0, 4, 5, and 6 are complete. Tasks 2-3 and 7-13 have complete agent implementations but remain `in_progress` on their recorded human approvals/provider staging work. Task 14's agent work is complete but the task remains blocked on H12 policy approval and staffed moderation operations. Task 15's agent work is complete and remains `in_progress` on H13 Turnstile configuration, threshold approval, and real-service validation. Paid plans remain disabled in the seeded catalog, and the UI labels them unavailable, until H11 is recorded. Task 16 remains blocked on H14 model/privacy approval. The exact next unblocked agent implementation task is Task 17, privacy operations.

## 16. Progress updates

### Run 6: premium UI, moderation operations, and anti-abuse controls

Date: July 13, 2026
Status: agent implementation complete; manual launch dependencies remain

#### Tasks 13-15 implementation

- Replaced the premium placeholder with a server-catalog-driven comparison page. It separates active V1 benefits from explicitly non-active V2 benefits; displays the current plan, provider status, renewal/cancellation date, processing state, Portal access, and honest unavailable states; and permits Checkout only when the server catalog marks a paid row purchasable.
- Changed the public catalog projection to return all stable plan rows with a server-derived `purchasable` flag. Seeded paid rows remain inactive and cannot start Checkout before H11.
- Ordered moderation work by urgent/high/standard priority and oldest-first within priority, added priority-specific escalation deadlines and overdue state, exposed provisional reason templates, included evidence expiry metadata, and enabled reason-gated sanction actions in the admin client. Existing AAL2, exact-origin, role, recent-reauthentication, minimum-evidence, append-only audit, and reviewer-separation controls remain enforced.
- Added Cloudflare Turnstile configuration and a server Siteverify boundary that checks success, expected action, exact allowed hostname, provider failure, and privacy-preserving hashed network-prefix attempt limits. Signup and password recovery now pass Turnstile tokens through Supabase's supported captcha boundary.
- Added account-and-route mutation limiting across guarded HTTP writes, dedicated queue/message/report limits, and normalized-content hashing to detect high-rate identical direct and random-chat messages without retaining message text in Redis keys. Existing queue churn limiting remains separate from the text Next cooldown.

Files changed: `apps/web/src/app.tsx`, `apps/web/src/pages.tsx`, `apps/web/src/app.test.tsx`, `apps/admin/src/pages.tsx`, `apps/admin/src/app.test.tsx`, `apps/api/src/app.ts`, `apps/api/src/realtime.ts`, `apps/api/src/abuse-service.ts`, `apps/api/src/abuse-service.test.ts`, `packages/database/src/entitlements.ts`, `packages/database/src/moderation.ts`, `packages/config/src/index.ts`, `.env.example`, and this plan.

Verification: `npm run check` passed on July 13, 2026: formatting, lint, workspace type checking, 65 current and legacy unit/UI/API tests, 10 migration validations, and the secret scan passed. Redis was not running, so API readiness correctly returned degraded status; real PostgreSQL/Redis, Stripe, Turnstile, and browser staging validation remains in H11-H13.

Remaining risks: Redis and PostgreSQL integration services were unavailable during the focused unit run; Turnstile and Stripe require real staging credentials and dashboards; moderation thresholds, taxonomy, sanction matrix, escalation targets, retention, and staffing are provisional until H11-H13 are approved. Generic guarded-write limits are conservative defaults and must be tuned from staging/load evidence without weakening safety exits.

Exact next agent task: Task 17, complete privacy operations. Task 16 must not start until H14 approves the model, license, privacy design, user notice, and enabled countries.

### Run 1: live inventory, ownership gate, and text cooldown

Date: July 12, 2026  
Status: complete, with one unavailable integration check recorded below

#### Task 0 inventory result

| Area                               | State found                                   | Evidence and remaining gap                                                                                                                                                        |
| ---------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Workspace and quality foundation   | implemented                                   | npm workspaces, strict TypeScript, ESLint, Prettier, Vitest, Playwright, migration and secret checks                                                                              |
| Authentication and accounts        | implemented, production configuration missing | Supabase token verification, account reconciliation, verified-email capability gates, sessions, encrypted birth date                                                              |
| 18+ launch rule                    | partial                                       | schema and queues still support `minor_16_17`; production onboarding currently derives cohorts instead of rejecting every under-18 user                                           |
| Profiles and avatars               | implemented                                   | profile privacy projection, visibility controls, upload quarantine and raster processing exist                                                                                    |
| Launch-country controls            | absent                                        | no deny-by-default country registry or registration/matching/billing switches                                                                                                     |
| Random matching                    | implemented core, preferences absent          | authenticated Redis cohort/mode queue, blocks, recent-pair exclusion, leases, and signaling exist; country/language/interests/gender are not applied by the matcher               |
| Random text/video UI               | implemented core                              | media acquisition, WebRTC offer/answer/ICE, text side channel, Next, Leave, Report, and Block surfaces exist                                                                      |
| Text Next cooldown                 | completed in this run                         | server-authoritative connected time, 25-second enforcement, accessible countdown, structured error, and extended connected lease                                                  |
| Encounter retention and blocks     | implemented                                   | encounters/messages, 48-hour cleanup, history hiding, and cross-domain block enforcement exist                                                                                    |
| Conversation ratings               | absent                                        | no rating table, contracts, repository, API, realtime events, summary, or UI                                                                                                      |
| Friends and presence               | implemented                                   | requests, friendships, mute, discovery, counts, privacy-aware presence, and UI exist                                                                                              |
| Direct messages and calls          | implemented                                   | persistent threads/messages/read state and direct voice/video signaling exist                                                                                                     |
| Reports and moderation             | implemented core, operations blocked          | report intake, cases, roles, AAL2 admin guard, sanctions, appeals, enforcement, and audit tables/routes/UI exist; approved taxonomy, staffing, and retention policy remain manual |
| Billing and entitlements           | absent                                        | Stripe config placeholders and a premium placeholder page exist; catalog, persistence, webhook processing, checkout, portal, and enforcement do not                               |
| Safe-card reveal and reconnect     | absent                                        | profile projection and encounter history are useful foundations, but no session reveal or paid reconnect contracts exist                                                          |
| Premium media policy               | partial                                       | WebRTC and TURN credential boundaries exist; tier-aware capture/sender/adaptation policy does not                                                                                 |
| Anti-bot and spam                  | partial                                       | generic Redis rate-limit primitive and moderation restriction checks exist; Turnstile and endpoint-specific limits are missing                                                    |
| Automated NSFW/fake-camera signals | absent                                        | requires manual model, privacy, and policy approval before implementation                                                                                                         |
| Privacy operations                 | partial                                       | session listing/revocation exists; export and full deletion orchestration are absent                                                                                              |
| Observability                      | partial                                       | live/ready health and structured Fastify logs exist; redaction tests, product/realtime metrics, alerts, budgets, and runbooks are missing                                         |
| Deployment                         | foundation only                               | Vercel/Render manifests and deployment runbook exist; no production provider configuration or rehearsed release is recorded                                                       |
| E2E and load coverage              | partial                                       | shell Playwright configuration and integration tests exist; real two-browser WebRTC, billing, safety, multi-instance, and load suites remain                                      |

#### Task 1 ownership gate

The following owners are still unassigned and block public registration: product approval, engineering release, safety/moderation, privacy/legal, billing/tax, customer support, incident command, and data protection. This is a manual input, not unfinished agent implementation.

#### Task 6 implementation record

Changed boundaries:

- `packages/contracts/src/index.ts`: added `cooldown_active`, error details, and authoritative connected/unlock timestamps.
- `apps/api/src/realtime.ts`: connected acknowledgement is atomic, keeps its first timestamp, and extends match/active leases to six hours instead of allowing the initial 20-second negotiation lease to expire mid-conversation.
- `apps/api/src/app.ts`: rejects early text Next commands without ending the match; Leave remains independent.
- `apps/web/src/pages.tsx`: disables Next during the server-provided window and announces the remaining time while keeping Leave, Report, and Block available.
- `apps/api/src/realtime.test.ts`: boundary and fail-closed unit tests.
- `packages/contracts/src/index.test.ts`: connected timing and cooldown error contract tests.
- `tests/integration/realtime.test.ts`: atomic connected timestamp and lease-extension coverage.

Verification:

- full `npm run check`: passed after the implementation and progress update;
- shared contracts build: passed;
- workspace typecheck: passed;
- API tests: 9 passed;
- web tests: 7 passed;
- contract tests: 8 passed after the final contract case was added;
- Redis integration execution: not run because the Docker daemon was unavailable; the test is committed and must be run with `npm run test:integration -- --run tests/integration/realtime.test.ts` once Redis is available.

Run 1 originally recommended Task 7 next. That handoff was superseded by the user's instruction to return to numbered Tasks 2 and 4; use the Current handoff above.

### Run 2: launch-country controls and adult-only beta

Date: July 13, 2026
Status: agent implementation complete; Task 2 remains manually gated

#### Task 2 implementation record

- Added migration `0007_launch_countries.sql` with deny-by-default `launch_countries` and private `user_country_state` tables.
- Added a repository for normalized ISO country codes, availability checks, user observations, separate registration/matching/billing switches, and audited admin updates.
- Added `GET /v1/launch/availability` and AAL2-protected admin list/update routes.
- Added versioned Privacy Policy acceptance beside Terms and Community Guidelines. The client reads all active versions from `GET /v1/policies/current`; activation requires all three records.
- Added an admin Launch countries screen. It treats each capability as a separate switch and requires an audit purpose.
- Onboarding requires an enabled registration country. Realtime tickets and both HTTP/WebSocket matchmaking paths require an enabled matching country.
- Production country resolution uses the configured trusted edge header. Missing or malformed production values become `ZZ` and are denied. Local development uses a separate header and fallback country.
- Added neutral public landing-page copy when registration is unavailable.
- Added deployment rules requiring the edge to overwrite the country header and the origin hostname to remain unsupported for direct clients.
- Repaired the migration journal to include migrations 0006 and 0007. Migration validation now fails when SQL files and journal entries drift.

Manual Task 2 blockers:

- assign the legal/privacy, safety, product, billing/tax, and release owners;
- choose the first countries for review;
- approve the prohibited/held-country list;
- provide approved Terms, Privacy Policy, Community Guidelines, cookie notice, subscription/refund terms, moderation/appeal policy, and retention schedule;
- configure a trusted production edge and prevent supported clients from reaching the Render origin directly;
- enable country switches only after the corresponding approval.

#### Task 4 implementation record

- Birth dates in the future are rejected.
- Onboarding rejects every user under 18 with the stable `age_restricted` error and non-specific public wording.
- Account activation requires an adult cohort.
- The shared contact guard rejects existing minor accounts across social/contact HTTP paths.
- Realtime identity creation independently requires `adult_18_plus`.
- Existing minor accounts may still inspect their account and submit reports or appeals. They are promoted automatically after their eighteenth birthday during account reconciliation.
- Public and onboarding copy now says 18+ and adult-only beta. The date input prevents selecting a date later than the current 18-year boundary.

Verification:

- full `npm run check`: passed;
- API tests: 10 passed;
- web tests: 7 passed;
- contract tests: 10 passed;
- database unit tests: 4 passed;
- migration validation: 7 SQL migrations and matching journal entries passed;
- secret scan: passed;
- database integration test was added for deny-by-default availability, audited enablement, user observation, and capability checks;
- database integration execution could not run because PostgreSQL was unavailable at `localhost:5432`; all 10 integration cases failed at the shared setup connection before executing assertions;
- the Run 1 Redis integration limitation also remains because the Docker daemon is not running.

Run 2 originally recommended Task 3 next. That work is recorded in Run 3 below.

### Run 3: environment hardening and matching preferences

Date: July 13, 2026  
Status: Task 5 complete; Task 3 agent work complete and manual setup pending

#### Task 3 implementation record

- Added a GitHub Actions workflow with immutable read-only repository permission, Node 22, `npm ci`, full checks/build, and a separate PostgreSQL/Redis integration job that applies migrations first.
- Production configuration rejects obvious local, example, development, and placeholder values for database, Redis, Supabase service role, birth-date encryption, TURN signing, and Stripe secrets.
- Added `docs/operations/environment-setup.md` with isolation rules for local, CI, staging, production, and preview environments; secret destinations; MFA/ownership requirements; rotation; and smoke verification.
- Preserved the server/client secret boundary and existing generated-bundle secret scan.
- Added migration 0008 and kept the SQL/journal consistency check active.

Manual Task 3 blockers:

- create organization-owned staging and production accounts for Supabase, Vercel, Render, TURN, Stripe, SMTP, DNS/edge, Turnstile, monitoring, analytics, and support;
- enable MFA, assign primary/backup owners, add billing/recovery methods, and record rotation procedures outside the repository;
- enter staging and production secrets in provider secret stores;
- configure exact OAuth, Auth, Stripe, CORS, WebSocket, and email callback/origin values;
- run the staging verification checklist and record evidence;
- push the repository so GitHub Actions can execute the new service-container integration job.

#### Task 5 implementation record

- Added private `matching_preferences` persistence for country, language, interest tags, self-described gender identity, gender preference, and opt-in relaxation.
- Added `entitlement_grants` as the durable entitlement boundary. `matching.gender_filter` is required for any preference other than Everyone. This table is partial Task 12 groundwork and will later receive Stripe-backed grants.
- Added authenticated GET/PUT matching-preference APIs and a settings UI. Gender identity is private and never inferred from a name, avatar, profile, or video.
- Server-built match criteria use the trusted observed country plus profile language/interests and stored preferences. The browser cannot grant itself a filter.
- Redis queue entries now contain bounded criteria. Pairing checks both users' preferences, blocks, recent pairs, cohort, and mode.
- Gender compatibility is hard and symmetric. It never relaxes.
- When both users opt in, interests relax after 15 seconds and country/language after 30 seconds. Narrow filters otherwise remain exact.
- Next/rematch reloads current server preferences. The client sends only the relaxation choice; the server loads every sensitive criterion.

Verification:

- full `npm run check`: passed;
- API tests: 12 passed, including cooldown and compatibility rules;
- web tests: 7 passed;
- contract tests: 11 passed;
- database unit tests: 4 passed;
- migration validation: 8 SQL migrations with matching journal entries;
- secret scan: passed;
- PostgreSQL integration coverage was added for paid gender enforcement and server criteria but could not execute locally because PostgreSQL and the Docker daemon are unavailable;
- Redis integration coverage was updated for criteria-aware queue calls but could not execute locally for the same Docker limitation;
- the new GitHub Actions integration job will run both suites with service containers after the repository is pushed.

#### Exact Task 2 completion checklist

Task 2 becomes `complete` only after a human records all of the following:

- [ ] Named product, legal/privacy, safety, billing/tax, engineering release, support, incident, and data-protection owners.
- [ ] A written approved-country list and prohibited/held-country list.
- [ ] Published immutable Terms, Privacy Policy, Community Guidelines, cookie/analytics notice, subscription/refund terms, moderation/appeals policy, and retention schedule.
- [ ] The three production policy version variables match those published documents.
- [ ] The trusted edge overwrites the country header and direct origin access is not a supported client path.
- [ ] An AAL2 admin enables registration only for legally approved countries.
- [ ] Matching and billing are enabled separately only after safety capacity and payment/tax approval.
- [ ] A staging user in an enabled country succeeds, while a disabled country and missing `ZZ` country fail safely.
- [ ] The approvers and evidence are recorded in the private operations register; no private legal or secret material is committed here.

That handoff was completed by Run 4 below.

### Run 4: conversation ratings, safe-card reveal, and reconnect

Date: July 13, 2026

Status: agent implementation complete; manual approvals and staging integration remain

#### Tasks 7-9 implementation record

- Added migration `0009_ratings_reveals_reconnect.sql` with authoritative encounter connected/rating timing, immutable per-rater conversation ratings, encounter/viewer/subject-scoped identity reveals, and expiring reconnect requests. Existing migrations were not rewritten.
- Added shared HTTP and realtime contracts for ratings, safe cards, timer/rating availability, identity reveal, and reconnect offer/resolution events.
- Added one account-service safe-card projection containing only avatar, username, display name, observed country, language, and interests. Exact birth date, email, bio, history, internal state, moderation, device, and billing data are not selected.
- Rating eligibility starts at exactly 120 server-measured connected seconds. Each participant has one immutable row, duplicate retries return the original result, the window closes 24 hours after an eligible encounter ends, and the other outcome remains hidden before resolution.
- Added a per-user total-like/total-rating projection and a moderator-only 24-hour anomaly projection for repeated pairs and coordinated all-like patterns. Ratings do not award XP, ParamPoints, quests, reputation, or any other reward.
- Free/Lite/Loaded reveal requires the subject to share their own card. `call_card.paid_override` permits a viewer-scoped Maxed Out override only while the grant remains active. Access is re-authorized for the exact encounter and revoked/denied on block, account state, sanction, encounter expiry, or lost entitlement.
- Added provisional onboarding, privacy-settings, and in-call disclosure plus realtime safe-card delivery. Human task H8 still owns final disclosure approval.
- Reconnect requires `matching.reconnect`, uses only the immediately previous connected eligible encounter, reveals no identity or presence in the offer, expires after a provisional two minutes, and requires recipient acceptance.
- Reconnect acceptance rechecks blocks, adult/active account state, and launch-country matching availability, then atomically reserves both users in Redis against concurrent queue/direct activity before persisting and publishing the new match. Decline returns both users to their existing idle/normal-matching path.
- Added conversation controls for safe-card sharing, two-minute Like/Dislike, ended-screen rating, and eligible-plan reconnect. Product copy and the two-minute offer lifetime remain provisional pending H7-H9.

Files changed:

- `packages/database/migrations/0009_ratings_reveals_reconnect.sql`, migration journal, schema, and `engagement.ts`;
- `packages/contracts/src/index.ts` and generated contract output;
- `apps/api/src/account-service.ts`, `app.ts`, and `realtime.ts`;
- `apps/web/src/pages.tsx`;
- `tests/integration/database.test.ts`;
- this execution plan.

Verification:

- `npm run typecheck`: passed across all workspaces;
- `npm run lint`: passed across all workspaces before the final projection refactor; the full check below is the final authority;
- `npm test`: passed (legacy 11, admin 3, API 12, web 7, config 4, contracts 11, database 4);
- `npm run migrations:check`: passed with 9 migrations;
- `npm run dev:services`: unavailable because the installed `docker` client does not provide Compose (`unknown shorthand flag: d`), so PostgreSQL/Redis integration scenarios could not execute locally;
- final `npm run check`: passed after the account-service projection refactor and plan update; formatting, lint, typecheck, all unit/API/UI/legacy tests, 9-migration validation, and secret scan passed.

Remaining risks and manual gates:

- H7 must approve rating labels, disclosure, resolution behavior, and safety implications.
- H8 must approve the Maxed Out disclosure and validate every safe-card revocation case in staging.
- H9 must approve the provisional two-minute reconnect lifetime and consent/notification copy.
- The new migration and multi-user flows require CI or staging verification with healthy PostgreSQL and Redis before Tasks 7-9 can move from `in_progress` to `complete`.
- Stripe-backed plan state does not exist yet. Staging validation must use audited, expiring grants; Task 11/12 must later issue and invalidate the same stable entitlement keys.

Exact next agent task: Task 10, media quality policies. Do not begin billing UI or market premium quality as guaranteed before the server media policy and browser fallbacks exist.

### Run 5: media quality, Stripe billing, and centralized entitlements

Date: July 13, 2026

Status: Tasks 10-12 agent implementation complete; provider approval, catalog configuration, and staging validation remain

#### Tasks 10-12 implementation record

- Added migration `0010_billing_entitlements.sql` without rewriting prior migrations. It seeds stable Free/Lite/Loaded/Maxed Out plan keys and USD list prices, while keeping paid rows inactive until H11 supplies approved environment-specific Stripe product/price IDs. It adds durable subscriptions, idempotent webhook events, payment-failure grace state, and immutable entitlement audit records.
- Added verified raw-body Stripe webhooks and event-first replay protection. Subscription, checkout completion, invoice paid/failed, refund, dispute, and subscription create/update/delete paths converge on one subscription projection. Older subscription object timestamps cannot overwrite newer state.
- Added authenticated Checkout and Billing Portal endpoints. Checkout uses a caller idempotency key and only returns a hosted provider URL; redirect/return state never provisions access.
- Added hourly scheduled reconciliation to retrieve Stripe subscription state and repair missed webhook delivery. Webhook payloads and card data are not persisted or logged.
- Centralized all stable V1 entitlement keys in `EntitlementService`. Gender filtering, online-status viewing, premium media, reconnect, capped matching priority, safe-card override, and the remaining cosmetic/support feature keys use the same durable grant boundary. Stripe plan changes sync subscription grants; audited manual grants require an expiry and recent AAL2 admin authorization.
- Preserved cancellation rights through the paid-through date. A provisional three-day `past_due` grace period is applied from the verified event timestamp; unpaid, paused, canceled, refunded, or disputed state removes plan rights. H11 must approve or replace this duration before live billing.
- Added a capped queue advantage for Maxed Out: its queue timestamp receives at most a five-second boost. The queue remains oldest-compatible-first after the cap, so continued paid arrivals cannot indefinitely displace a free user.
- Added server-owned standard (960x540, 24 fps, 900 kbps) and premium (up to 1920x1080, 30 fps, 2.5 Mbps) policy responses and realtime delivery. Browser capture constraints and sender parameters are best-effort; unsupported parameter APIs fail safely.
- Added five-second WebRTC statistics sampling and automatic bitrate/frame-rate reduction for high loss, high round-trip time, or TURN relay. Diagnostics describe measured/adapted conditions and never promise received resolution. Permission denial continues to offer text, missing media APIs fail clearly, and camera replacement stops old tracks.
- Presence projections and realtime presence events now require `presence.online_status`; browser claims cannot grant it. Media policy and queue priority are also resolved on the server.

Files changed:

- `packages/database/migrations/0010_billing_entitlements.sql`, migration journal, schema, `billing.ts`, `entitlements.ts`, matching export, and generated package output;
- `packages/contracts/src/index.ts` and generated contract output;
- `apps/api/src/billing-service.ts`, billing tests, `app.ts`, `realtime.ts`, `worker.ts`, and package dependencies;
- `apps/web/src/media.ts`, media tests, and conversation integration;
- this execution plan.

Verification:

- package builds for contracts and database: passed;
- full workspace typecheck: passed;
- final `npm run check`: passed; formatting, lint, workspace typecheck, all tests, 10-migration validation, and secret scan passed;
- API tests: 15 passed, including signed webhook processing, invalid signatures, and replay protection;
- web tests: 9 passed, including supported and unsupported sender-parameter behavior;
- contract tests: 11 passed;
- migration validation: 10 SQL migrations with matching journal entries passed;
- PostgreSQL/Redis integration was not executed locally because the services remain unavailable; CI/staging must exercise migration 0010, concurrent webhook delivery, out-of-order events, queue fairness, entitlement revocation during active queues/calls, and TURN-only adaptation.

Remaining risks and manual gates:

- H10 must choose/fund TURN, test representative browsers/networks/regions, set relay budgets, and approve or replace both quality targets.
- H11 must obtain Stripe and tax approval, approve the provisional three-day grace and five-second queue cap, populate sandbox/live catalog IDs outside source code, configure Portal/webhooks, and run the complete sandbox matrix.
- Paid catalog rows intentionally remain inactive. Checkout fails closed until an approved price ID and `active=true` are applied by controlled operational configuration.
- Reconciliation currently runs in the existing maintenance worker cadence and uses a one-hour staleness threshold. Operations must confirm the worker schedule and alerting before live billing.
- Safari, Firefox, Chromium, iOS, Android, camera switching, network handoff, and TURN-only behavior require real-device staging evidence; unit tests cannot certify browser/hardware behavior.

Exact next agent task: Task 13, replace the premium placeholder UI using the server catalog and entitlement/subscription projection. Do not activate paid catalog rows or present checkout as live until H11 is complete.

## 17. Human tasks

This is the canonical checklist for work that Codex agents cannot complete alone. Each item names the agent task it unblocks. Keep secrets, identity documents, contracts, private legal advice, employee details, and recovery codes outside the repository. Record only completion status, owner role, date, and a safe evidence reference here.

Use these status values:

- `not_started`: no human owner has begun the work;
- `in_progress`: an owner is actively working on it;
- `waiting_external`: submitted to a vendor, lawyer, bank, auditor, or authority;
- `complete`: evidence has been checked and the related gate passed;
- `not_applicable`: a named approver documented why it does not apply.

### Human task H1: assign accountable owners

Related agent tasks: Task 1 and every public-beta gate  
Status: `not_started`

1. Name one primary and one backup for product approval.
2. Name the engineering release owner.
3. Name the safety and moderation owner.
4. Name the privacy/legal owner.
5. Name the billing and tax owner.
6. Name the customer-support owner.
7. Name the incident commander and backup.
8. Name the data-protection contact.
9. Give each person a written responsibility and escalation boundary.
10. Store names and contact details in a private operations register, not this public repository.
11. Add a safe evidence reference below and change the status to `complete`.

Completion evidence: unassigned

### Human task H2: approve launch countries and policies

Related agent task: Task 2  
Status: `not_started`

1. Give qualified counsel the V1 product description: 18+ random text/video matching, profiles, reporting, blocking, subscriptions, English-only support, no call recording, and country-by-country availability.
2. Produce an approved-country list and a prohibited/held-country list.
3. For each approved country, record privacy, consumer, age-assurance, online-safety, advertising, payment, tax, and law-enforcement requirements.
4. Approve the legal entity name, physical/legal address, support contact, privacy contact, and governing-law language shown to users.
5. Publish immutable versions of the Terms of Service, Privacy Policy, Community Guidelines, cookie/analytics notice, subscription/cancellation/refund terms, moderation and appeals policy, and retention schedule.
6. Assign version identifiers for Terms, Privacy, and Guidelines. Enter those identifiers as `CURRENT_TERMS_VERSION`, `CURRENT_PRIVACY_VERSION`, and `CURRENT_GUIDELINES_VERSION` in staging first.
7. Verify `GET /v1/policies/current` returns the published versions.
8. Have a test adult accept all three documents and confirm three acceptance records are created.
9. Configure the trusted edge to overwrite the country header. Do not forward a browser-supplied value.
10. Confirm direct access to the Render origin is not a supported client path.
11. In the AAL2 admin screen, add the reviewed country with every switch off.
12. Enable registration only after legal approval.
13. Enable matching only after moderation capacity and safety approval.
14. Enable billing only after payment-provider and tax approval.
15. Test an enabled country, a disabled country, a malformed header, and missing-country `ZZ` behavior in staging.
16. Record approvers, dates, policy URLs, country decision references, and staging evidence in the private register.

Completion evidence: unassigned

### Human task H3: create and secure provider environments

Related agent task: Task 3  
Status: `not_started`

Follow `docs/operations/environment-setup.md` and complete these steps separately for staging and production:

1. Create organization-owned GitHub, Supabase, Vercel, Render, TURN, Stripe, SMTP, DNS/edge, Turnstile, monitoring, analytics, and support accounts/projects.
2. Do not create production infrastructure under a disposable personal account.
3. Enable MFA for every human operator. Store recovery codes in the approved password manager.
4. Assign least-privilege roles and primary/backup owners.
5. Add billing methods, billing alerts, and account-recovery contacts.
6. Create separate Supabase projects, databases, Auth configuration, storage buckets, and service-role keys for staging and production.
7. Configure custom SMTP, SPF, DKIM, DMARC, email templates, and disabled click tracking for Auth links.
8. Create separate Google OAuth clients and exact redirect URLs.
9. Create separate Vercel user/admin projects and set only approved `VITE_*` values.
10. Create Render API, worker, and Redis services. Enter server secrets only in Render secret storage.
11. Configure exact web, admin, and preview origins. Do not use a broad `*.vercel.app` production wildcard.
12. Configure the trusted country edge and restrict/avoid direct origin use.
13. Create staging and production monitoring projects and alert destinations.
14. Push the repository and confirm both GitHub Actions jobs pass, including PostgreSQL/Redis integration tests and migrations.
15. Run every verification step in `docs/operations/environment-setup.md` and `docs/operations/deployment.md`.
16. Record safe project identifiers, owners, verification date, and alert destinations in the private register. Never record secret values here.

Completion evidence: unassigned

### Human task H4: validate adult-only onboarding in staging

Related agent task: Task 4  
Status: `not_started`

1. Start or provision the staging PostgreSQL and Redis services.
2. Apply all migrations.
3. Test a birth date one day below the 18-year boundary; onboarding must fail.
4. Test the exact eighteenth birthday; onboarding may continue.
5. Test an invalid date, future date, and leap-day boundary.
6. Confirm an existing minor fixture cannot match, message, request, or call.
7. Confirm the same account may still inspect its account and submit a report or appeal.
8. Confirm the user-facing response does not reveal private cohort logic.
9. Save test evidence without retaining real identity documents or unnecessary birth dates.

Completion evidence: unassigned

### Human task H5: validate matching preferences with real services

Related agent task: Task 5  
Status: `not_started`

1. Run the GitHub integration job or start PostgreSQL and Redis locally.
2. Apply migration 0008.
3. Create two adult staging accounts in enabled countries.
4. Confirm free accounts can save country, language, interests, identity, and Everyone gender preference.
5. Confirm a free account cannot save a restricted gender preference.
6. Add a temporary, audited `matching.gender_filter` grant to one staging account through an approved administrative/database procedure.
7. Confirm the entitled account can save a gender preference.
8. Test symmetric gender compatibility. An incompatible pair must not match.
9. Test exact country, language, and interest matching.
10. Confirm interests broaden after 15 seconds only when both users consent.
11. Confirm country/language broaden after 30 seconds only when both users consent.
12. Confirm gender never broadens.
13. Revoke the temporary grant and confirm the paid filter is no longer effective.
14. Remove test grants and record non-secret test evidence.

Completion evidence: unassigned

### Human task H6: validate the text cooldown with Redis

Related agent task: Task 6  
Status: `not_started`

1. Run the Redis integration suite through GitHub Actions or a healthy local Redis instance.
2. Open a real random text conversation with two staging browsers.
3. Confirm Next is disabled for 25 connected seconds.
4. Attempt an early Next with a modified client; the server must reject it without ending the conversation.
5. Confirm reconnecting and changing the device clock do not bypass the timer.
6. Confirm Leave, Report and leave, and Block remain immediate.
7. Confirm video Next remains immediate.
8. Record the integration run and browser evidence.

Completion evidence: unassigned

### Human task H7: approve conversation-rating product copy

Related agent task: Task 7  
Status: `not_started`

1. Approve the exact Like and Dislike labels.
2. Approve the explanation that ratings become available after two connected minutes.
3. Approve whether users see the other response after both submit or only see their own submission status.
4. Confirm the 24-hour rating window.
5. Confirm V1 ratings award no XP, ParamPoints, quest progress, or reputation changes.
6. Review anti-brigading and appeal implications with the safety owner.
7. Review the provisional in-call and ended-screen copy implemented in Run 4, supply approved replacement copy, and have product and safety sign off before public beta.
8. In staging, test just before and at 120 connected seconds, duplicate submission, attempted outcome change, both-participant resolution, a block/report after rating, and the 24-hour expiry.

Completion evidence: unassigned

### Human task H8: approve the Maxed Out safe-card disclosure

Related agent task: Task 8  
Status: `not_started`

1. Review the safe-card fields: avatar, username, display name, country, language, and interests.
2. Confirm that bio, exact birth date, email, history, device, moderation, billing, and restricted fields never appear.
3. Approve onboarding, privacy-settings, call-room, and subscription-page disclosure explaining the Maxed Out override.
4. Review the rule with privacy/legal and product owners.
5. Confirm Block, deletion, sanction, encounter expiry, and lost entitlement revoke access.
6. Supply approved copy and a safe evidence reference to the implementing agent.
7. Review the provisional onboarding, privacy-settings, and call-room disclosure implemented in Run 4 and supply exact approved replacement text.
8. In staging, test subject consent for a free account, the scoped `call_card.paid_override` grant, grant expiry/revocation, encounter substitution, block, sanction, deletion-pending, and encounter expiry.
9. Inspect the actual response and confirm that exact birth date, email, bio, history, device, moderation, billing, and internal fields are absent.

Completion evidence: unassigned

### Human task H9: approve reconnect behavior

Related agent task: Task 9  
Status: `not_started`

1. Approve the reconnect-offer lifetime.
2. Approve the consent and notification copy shown to both users.
3. Confirm reconnect cannot expose a profile or online status before authorization.
4. Confirm blocks, sanctions, deletion, country changes, and lost entitlement invalidate the offer.
5. Test the final flow with two staging accounts after implementation.
6. Explicitly approve or replace the provisional two-minute offer lifetime implemented in Run 4.
7. In staging, verify Free/Lite denial, Loaded/Maxed Out access through an audited expiring grant, decline, expiry, simultaneous queue join, block, sanction, deletion-pending, and country disablement.
8. Confirm the offer notification exposes neither profile identity nor durable presence, and record product/safety approval in the private register.

Completion evidence: unassigned

### Human task H10: choose and fund TURN service

Related agent task: Task 10  
Status: `not_started`

1. Compare managed TURN vendors for regions, latency, reliability, credential API, abuse controls, DPA, support, and cost.
2. Run connection tests from representative launch regions and restrictive networks.
3. Estimate relay usage and cost for Free/Lite and premium quality targets.
4. Select a vendor and accept its contract/DPA.
5. Create separate staging and production credentials.
6. Store secrets in Render and record rotation/kill procedures.
7. Approve the initial free and premium quality targets based on measured results.
8. Set budget alerts and a maximum acceptable TURN cost per 1,000 conversations.
9. Validate or replace Run 5's provisional standard target (960x540/24 fps/900 kbps) and premium ceiling (1920x1080/30 fps/2.5 Mbps).
10. Test permission denial, no-camera/no-microphone devices, unsupported sender parameters, camera switching, Wi-Fi/cellular handoff, high loss/latency, and forced relay on current Safari, Firefox, Chromium, iOS, and Android.
11. Record the selected vendor dashboard URL, credential owner/scope, Render secret destinations (`TURN_URLS`, `TURN_CREDENTIAL_SECRET`), rotation/revocation procedure, test date, and safe evidence reference in the private operations register. Never copy credentials here.

Completion evidence: unassigned

### Human task H11: obtain Stripe approval and configure billing

Related agent tasks: Tasks 11, 12, and 13  
Status: `not_started`

1. Create and verify the business entity, bank account, tax identity, and Stripe account.
2. Disclose the 18+ random-video UGC model, countries, moderation controls, prohibited content, and subscription perks to Stripe.
3. Answer enhanced-review questions and wait for approval before live billing.
4. Obtain written confirmation when Stripe requests or provides product-specific approval.
5. Determine where sales tax, VAT, or GST registration is required. Register before collecting where required.
6. Approve the final Free, Lite, Loaded, and Maxed Out names, USD monthly prices, refund rules, cancellation behavior, grace period, proration, and support authority.
7. Create separate sandbox and live products/prices.
8. Configure the Billing Portal and webhook endpoint.
9. Store Stripe IDs as configuration/catalog data and secrets in Render, never in browser variables.
10. Run sandbox purchase, renewal, upgrade, downgrade, payment failure, cancellation, refund, dispute, duplicate webhook, and reconciliation tests.
11. Review and approve the final premium comparison page. V2-only benefits must say "coming in V2."
12. Record live approval, tax decisions, catalog IDs, and test evidence in the private register without recording secret keys.
13. In the [Stripe Dashboard](https://dashboard.stripe.com/), record separate test/live product and monthly price IDs against stable keys `lite`, `loaded`, and `maxed_out`; apply them to `subscription_plans` through a controlled operational change and activate a paid row only in its matching environment.
14. Approve or replace Run 5's provisional three-day payment-failure grace period and five-second capped Maxed Out queue advantage. Record user copy and refund/dispute revocation policy.
15. Configure the exact webhook endpoint `/v1/billing/webhooks/stripe` for subscription created/updated/deleted, checkout completion, invoice paid/payment failed, charge refunds, and charge disputes. Store `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` only in the matching Render environment and record rotation/rollback.
16. Confirm the maintenance worker is scheduled and monitored for hourly reconciliation; alert on failed webhook processing, stale subscription reconciliation, or a paid catalog with a missing/mismatched price ID.
17. Verify in staging that cancellation retains access only through the paid-through date, grace expiry removes access, active calls/queues refresh after revocation, duplicate/out-of-order webhooks do not re-grant, refunds/disputes revoke, manual grants expire with audit records, and free users are not starved by paid queue traffic.

Completion evidence: unassigned

### Human task H12: approve moderation policy and staff the queue

Related agent task: Task 14  
Status: `not_started`

1. Approve report reasons, severity, priority, and required evidence.
2. Approve sanction ranges for harassment, NSFW, spam, hate, fake camera, and underage use.
3. Define urgent escalation for threats, exploitation, illegal content, and underage reports.
4. Define appeal eligibility, reviewer separation, response targets, and reversal authority.
5. Define evidence and audit retention by severity.
6. Hire or assign moderators and support staff for the initial capacity and operating hours.
7. Train staff on privacy, minimum-necessary access, illegal-content handling, escalation, and account security.
8. Enroll every admin in MFA and test joiner/mover/leaver access removal.
9. Run a tabletop moderation exercise and record results.
10. Do not enable public matching above staffed moderation capacity.
11. Review Run 6's provisional escalation targets: urgent 15 minutes, high 60 minutes, and standard 24 hours; replace them where the approved policy differs.
12. In staging, verify urgent/high/standard ordering, oldest-first handling, overdue display, purpose-bound evidence reveal, evidence expiry display, assignment, every sanction type, recent-reauthentication rejection, audit creation, and appeal reviewer separation.
13. Approve or replace the provisional reason templates returned by `/v1/admin/moderation/templates`; ensure illegal-content and underage procedures point to private runbooks rather than sensitive instructions in the client.

Completion evidence: unassigned

### Human task H13: create Turnstile and approve anti-abuse friction

Related agent task: Task 15  
Status: `not_started`

1. Create separate staging and production Turnstile widgets under the organization account.
2. Configure exact production hostnames and keep local/test keys separate.
3. Store site keys in approved public config and secret keys in server secret storage.
4. Approve which risk conditions trigger a challenge.
5. Approve rate-limit thresholds and user-facing retry copy.
6. Test success, failure, expiry, replay, provider outage, and accessibility.
7. Review false-positive and appeal paths with safety/support.
8. Configure `VITE_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, and the exact comma-separated `TURNSTILE_ALLOWED_HOSTNAMES` independently in staging and production; never expose the secret key to Vite.
9. Confirm Supabase Auth CAPTCHA protection is enabled for signup and password recovery and uses the matching environment widget.
10. Validate expected action and hostname rejection, five-minute expiry, single-use replay rejection, provider outage, IPv4/IPv6 prefix behavior, keyboard/screen-reader operation, and an account moving between networks.
11. Review Run 6's provisional limits: 30 guarded writes per account/path/minute, 20 guarded writes per session/path/minute, 20 queue joins/minute, 60 direct messages/minute, four identical messages/minute, 10 reports/hour, and 20 challenge attempts/network prefix/five minutes. Approve replacements based on staging abuse/load evidence.
12. Confirm Block, Leave, Report, and Report and leave remain usable under unrelated message/queue friction; define the support path when a report-specific limit is reached.

Completion evidence: unassigned

### Human task H14: approve an NSFW/fake-camera risk model

Related agent task: Task 16  
Status: `not_started`

1. Decide whether V1 will enable automated visual risk signals at all.
2. Evaluate candidate models/providers for license, privacy, processing location, DPA, device performance, explainability, and cost.
3. Approve user notice and policy language before processing frames.
4. Confirm frames stay on-device under the default design and are never logged or uploaded.
5. Test accuracy across representative lighting, devices, skin tones, clothing, camera quality, and accessibility scenarios.
6. Define warning, local pause/blur, moderator visibility, retention, and kill-switch behavior.
7. Confirm the model cannot issue a permanent sanction by itself.
8. Approve enabled countries and record the review.

Completion evidence: unassigned

### Human task H15: approve privacy operations and retention

Related agent task: Task 17  
Status: `not_started`

1. Approve the final data inventory and retention schedule.
2. Define export scope, identity verification, delivery method, response target, and excluded internal data.
3. Define deletion reauthentication, cancellation window, billing handling, safety/legal holds, anonymization, and completion target.
4. Approve what records survive deletion, why, who can access them, and when they expire.
5. Test export and deletion with active friendships, calls, reports, sanctions, and subscriptions.
6. Define the process for privacy requests received through support or legal channels.
7. Record counsel/privacy-owner approval.

Completion evidence: unassigned

### Human task H16: choose monitoring, analytics, support, and budgets

Related agent task: Task 18  
Status: `not_started`

1. Select error monitoring, uptime monitoring, privacy-safe analytics, paging, and support providers.
2. Sign required DPAs and choose data regions/retention.
3. Create separate staging and production projects.
4. Add named alert recipients and an on-call schedule.
5. Approve privacy-safe event names and prohibited fields.
6. Set monthly and anomaly budgets for Render, Supabase, Redis, TURN, email, storage, Stripe, and monitoring.
7. Test every severity-one alert and escalation route.
8. Record provider ownership, dashboards, retention, and budget thresholds in the private register.

Completion evidence: unassigned

### Human task H17: commission independent security and accessibility review

Related agent task: Task 19  
Status: `not_started`

1. Publish a security contact and vulnerability-disclosure process.
2. Select an independent penetration-testing provider with WebRTC, realtime, Auth, billing, and privacy experience.
3. Define staging scope and safe test accounts.
4. Remediate every critical/high finding and obtain retest evidence.
5. Arrange a manual accessibility review covering keyboard, screen readers, contrast, reduced motion, permissions, call controls, and admin flows.
6. Record accepted lower-risk findings with owner and deadline.
7. Do not open unrestricted public traffic with an unresolved critical/high finding.

Completion evidence: unassigned

### Human task H18: approve capacity from load and moderation results

Related agent task: Task 20  
Status: `not_started`

1. Run the automated load tests in staging with approved provider limits.
2. Review socket, queue, database, Redis, worker, TURN, and cost results.
3. Compare the technical ceiling with staffed moderation/support capacity.
4. Choose a lower global and per-country launch ceiling.
5. Approve beta-full messaging and waitlist/support handling.
6. Record the ceiling, evidence, owner, and conditions for increasing it.

Completion evidence: unassigned

### Human task H19: configure domains and rehearse launch

Related agent task: Task 21  
Status: `not_started`

1. Purchase or transfer organization-owned product, API, admin, auth, and support domains.
2. Configure DNS, TLS, edge proxying, country-header overwrite, SPF, DKIM, and DMARC.
3. Enter exact production origins and callbacks in every provider dashboard.
4. Choose and approve recovery point and recovery time objectives.
5. Run backup restore, Redis loss, webhook replay, Auth outage, TURN outage, credential rotation, bad migration, compromised admin, and data-exposure rehearsals.
6. Run the internal alpha gate.
7. Run the closed-beta gate with invited adults.
8. Review safety backlog, uptime, match success, queue wait, TURN cost, support load, and billing behavior.
9. Obtain written product, safety, legal/privacy, billing, and engineering release approvals.
10. Enable the first approved country at a low capacity.
11. Monitor before raising capacity or enabling another country.

Completion evidence: unassigned

### Human task maintenance rule for future agents

Every agent that completes or changes a numbered task must review this Human tasks section before handoff.

If its work creates, changes, resolves, or discovers human work, the agent must:

1. Add or update the human task under the matching agent task number.
2. Write exact ordered steps, not a vague instruction such as "configure provider."
3. State who must approve or perform the work by role.
4. State what evidence proves completion without exposing secrets or private material.
5. Update the status and completion-evidence line.
6. Update the main progress ledger and Current handoff if the human work blocks another task or launch gate.
7. Preserve completed human-task history; do not delete it merely because the code changed.
8. Never mark a human task complete based on assumption, simulated data, or an agent's own judgment when external approval is required.

Future agents must treat this section as part of the definition of done.
