# Strangr beta implementation plan

Status: execution plan for Codex agents  
Source of truth: `plan.md`  
Prepared: July 11, 2026  
Execution order: highest-risk foundations first, launch polish last

## 1. How agents must use this document

This file is intended to be enough context for an implementation agent to complete one bounded unit of work without redesigning the product. Work from top to bottom. Do not start a unit until its listed prerequisites and the exit checks of the preceding unit are satisfied.

For every unit:

1. Read this file, `plan.md`, the current `README.md`, the root `package.json`, and every file that will be changed.
2. Check `git status` before editing. Preserve unrelated or pre-existing user changes. Never reset or overwrite them.
3. Keep the change limited to the named unit. If a required architectural decision is still open, write an ADR or clearly mark the blocker; do not silently invent product policy.
4. Prefer a thin end-to-end vertical slice over disconnected placeholders. A route is not complete unless its authorization, validation, persistence, tests, and client error state exist.
5. Treat all client input and all realtime messages as untrusted. Business rules live on the API/server, not only in React.
6. Add or update tests in the same change. Run the narrow tests first, then the repository-wide verification commands that exist at that point.
7. Update `.env.example`, relevant documentation, and generated contracts when configuration or public behavior changes. Never commit credentials.
8. End the unit with a short handoff recording changed files, commands run, results, migrations/configuration needed, and any known follow-up. Do not claim completion if the unit's exit criteria do not pass.

The implementation may refine filenames, but it must retain the domain boundaries and product invariants below. New dependencies require a concrete use in the same unit. Avoid speculative abstractions.

## 2. Product contract that must not drift

Strangr is an account-based, web-first social discovery product for users aged 16 and older. A user can enter random text or video matching, talk to a stranger, and mutually transition that encounter into a persistent friendship with direct messages and voice/video calls.

These beta rules are locked unless the product owner explicitly changes `plan.md`:

- Accounts are required. Login supports verified email/password and Google.
- Email/password users cannot match, message, call, or send friend requests before verification. A Google identity counts as verified.
- Onboarding records date of birth, terms acceptance, community-guideline acceptance, username, display name, avatar, and initial privacy choices.
- The exact date of birth is private. The server authoritatively derives the current matching cohort: `minor_16_17` or `adult_18_plus`.
- Random matching must never cross those cohorts. Paid filters, wait time, manual input, or admin configuration must never relax this boundary.
- Random matching supports text and video. Camera/microphone permission is requested only after video is selected.
- Reports do not automatically end an interaction. The UI offers “Submit report” and “Submit and leave.”
- A block ends the current interaction immediately and prevents all future matching, profile access, requests, messages, and calls in both directions.
- Friend requests can originate during an encounter or for 48 hours afterward. Persistent contact requires acceptance.
- Encounter metadata and random-chat text are user-visible for at most 48 hours. Only minimal evidence tied to a report can outlive that window.
- Strangr never records or stores video/audio. Calls store metadata only.
- Friend messages are persistent for beta with delete-for-me and a short, explicitly configured delete-for-everyone window. Beta does not claim end-to-end encryption.
- Free safety and privacy controls never depend on premium status.
- Premium can add language, broad-region, and interest filters, approved cosmetics, ad-free use, and small convenience features. It cannot add cross-cohort access or priority moderation.
- Ads never appear over or inside an active conversation, matching animation, report/block flow, login, safety, or account-deletion screen.
- Admin is a separate application and deployment. Admin MFA, least privilege, and append-only audit history are mandatory.
- No push, email, or SMS notifications are part of beta other than transactional authentication email handled by the auth provider.

If an implementation choice conflicts with “fast to meet, deliberate to keep,” data minimization, or the safety rules above, choose the safer and more privacy-preserving behavior and document it.

## 3. Current repository baseline

The repository currently contains a working anonymous prototype, not a production account system:

- Root package: JavaScript, Node 20+, Express 5, `ws`, and Node's built-in test runner.
- `public/`: a hand-written DOM application, WebRTC/media helpers, WebSocket client, state machine, and tokenized CSS.
- `server/`: separate Express HTTP and WebSocket servers, in-memory sessions, matchmaking queue, recent-pair exclusions, token-bucket rate limits, metadata-only report logging, heartbeat, and reconnect behavior.
- `test/`: behavior tests for queueing, signaling, reports, rate limits, and the current client session machine.
- HTTP defaults to port 3000 and WebSocket defaults to port 8080.
- There is no production data and no anonymous-user compatibility requirement.

Preserve as behavioral references:

- permission timing and text fallback;
- media track teardown;
- heartbeat and reconnect concepts;
- skip/next cleanup and recent-pair exclusion;
- plain-text message rendering;
- report reason UI and limited evidence collection;
- existing visual tokens and responsive brand direction;
- current tests that describe useful behavior.

Replace rather than extend indefinitely:

- manual DOM screen management;
- anonymous tab-scoped identity;
- in-memory durable state and report logs;
- separate public HTTP and WebSocket ports;
- unvalidated `env.js` runtime configuration;
- the single ephemeral conversation model.

## 4. Target repository and dependency rules

The intended layout is:

```text
apps/
  web/                 Vite + React + TypeScript user application
  admin/               Vite + React + TypeScript admin application
  api/                 Fastify + TypeScript HTTP, WebSocket, and worker entrypoints
packages/
  contracts/           Zod request/response/event schemas and inferred types
  database/            Drizzle schema, migrations, repositories, test helpers
  ui/                  design tokens and accessible shared primitives
  config/              shared TypeScript, lint, environment, and test configuration
render.yaml             Render API, maintenance cron, and Key Value Blueprint
infra/
  turn/                TURN configuration and runbooks
tests/
  e2e/                 Playwright journeys
  load/                queue, socket, message, and reconnect load tests
docs/
  architecture/        ADRs and system documentation
  product/             policy/versioned product copy
  safety/              moderation policy and operating guides
  operations/          deploy, incident, retention, and recovery runbooks
```

Use npm workspaces. The supported baseline is Node.js 22. Root commands must eventually include:

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run build
npm run e2e
```

The development command must show the web, admin, API, database, and Redis addresses and fail clearly on port collisions. HTTP and WebSocket share one API server and one public port; realtime connects at `/ws`.

Technology choices already made:

- React Router, TanStack Query, and narrowly scoped Zustand in clients;
- Fastify, `ws`, Zod, Pino, and generated OpenAPI in the API;
- Supabase Auth, Postgres, and Storage;
- Drizzle ORM and repository-owned SQL migrations;
- managed Redis-compatible storage for queues, leases, rate limits, tickets, presence, and pub/sub;
- WebRTC plus short-lived production TURN credentials;
- Vitest/Testing Library, integration tests against Postgres/Redis, and Playwright;
- Stripe Checkout, Billing, Customer Portal, and signed webhooks.

## 5. Priority map and dependency chain

Execution status as of July 12, 2026:

| Unit  | Status      | Evidence                                                                                                                                                                    |
| ----- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Complete    | `docs/architecture/prototype-baseline.md`, ADRs, open-decision register, and checked-in visual references                                                                   |
| 1     | Complete    | `docs/architecture/unit-01-foundation.md` and the workspace skeleton                                                                                                        |
| 2     | Complete    | Shared strict TypeScript, lint/format/test/coverage/integration/E2E foundations, CI, migration and secret checks                                                            |
| 3     | Complete    | Shared React UI primitives, routed user/admin shells, responsive conversation safety states, and component/shell tests                                                      |
| 4     | Complete    | `docs/architecture/unit-04-contracts-and-config.md`, shared Zod boundaries, validated environment configuration, and OpenAPI plumbing                                       |
| 5     | Complete    | `docs/architecture/unit-05-database.md`, Drizzle identity/profile schema, migration foundation, repositories, and encrypted birth-date boundary                             |
| 6     | Complete    | `docs/architecture/unit-06-08-identity-profile-assets.md`, Supabase JWKS authentication, identity/session reconciliation, capability guards, and authenticated web flows    |
| 7     | Complete    | `docs/architecture/unit-06-08-identity-profile-assets.md`, resumable onboarding, server-derived age cohorts, policy acceptance, profile projection, privacy, and session UI |
| 8     | Complete    | `docs/architecture/unit-06-08-identity-profile-assets.md`, quarantined raster processing, immutable signed avatar assets, replacement, and orphan cleanup                   |
| 9     | Complete    | Redis primitives, single-use realtime tickets, authenticated one-port sockets, leased presence, pub/sub, heartbeat, revocation, and shared limits                           |
| 10    | Complete    | Atomic cohort/mode Redis queues, eligibility rechecks, match leases/acks, recent-pair exclusion, next cleanup, and multi-instance delivery                                  |
| 11    | Complete    | Typed React session/media lifecycle, validated WebRTC relay, short-lived TURN credentials, sequenced random text, reconnect, and teardown                                   |
| 11A   | Complete    | Separate Vercel web/admin deployments, Render API/cron/Key Value Blueprint, exact origin enforcement, and deployment runbook                                                |
| 12    | Complete    | Durable encounters, random text, metadata-only calls, privacy-projected 48-hour history, and leased retention with minimal evidence copies                                  |
| 13    | Complete    | Persistent contact denial, block APIs/UI, queue/live-contact termination, generic revocation, and profile/history/realtime enforcement                                      |
| 14    | Complete    | Encounter-gated requests, canonical friendships/direct threads, mutes, counts, concurrency-safe consent, and request retention                                              |
| 15    | Complete    | History/friends/requests/profile journeys, exact discovery, privacy-aware projections, bounded pagination, and friend-only leased presence                                  |
| 16–28 | Not started | P1 is complete; Unit 16 is the next implementation unit                                                                                                                      |

| Priority | Units | Outcome                                                                               |
| -------- | ----- | ------------------------------------------------------------------------------------- |
| P0       | 0–8   | Safe repository migration, typed foundations, identity, and policy enforcement        |
| P1       | 9–15  | Random matching, WebRTC, encounters, blocks, and social graph                         |
| P2       | 16–20 | Persistent messages, direct calls, reports, sanctions, and admin operations           |
| P3       | 21–23 | Billing, premium matching filters, cosmetics, and compliant ads                       |
| P4       | 24–28 | Privacy operations, observability, security/load hardening, deployment, and beta gate |

The critical dependency chain is:

```text
workspace -> contracts/config -> database -> auth -> onboarding/profile
          -> realtime identity -> matching -> encounters/blocks -> friends
          -> messaging/direct calls -> moderation/admin -> monetization -> launch gate
```

Safety policy writing and legal/region decisions can run alongside engineering, but public registration must remain closed until their gates are satisfied.

---

## P0 — Foundation and account safety

## Unit 0 — Record the prototype baseline and decisions

**Goal:** make the migration reversible and remove ambiguity before moving files.

**Prerequisites:** none.

**Implementation:**

1. Run the current full test suite and production start/build smoke test. Record the commands and results in `docs/architecture/prototype-baseline.md`.
2. Record the current routes, ports, WebSocket client event types, server event types, and state-machine transitions. Link the corresponding existing source and test files.
3. Capture screenshots of the important current UI states for visual reference: landing, matching, video room, text fallback, report dialog, reconnect notice, and ended state. Store them under `docs/product/prototype-reference/` if repository policy permits binary references; otherwise document how to reproduce them.
4. Create ADRs for the already chosen stack: npm workspaces, Vite/React, Fastify plus `ws`, Supabase Auth/Postgres/Storage, Drizzle, Redis, one-port `/ws`, and managed-first TURN.
5. List unresolved ship-blocking decisions with an owner field: launch countries, policy versions, moderation taxonomy, delete-for-everyone duration, admin MFA method, TURN vendor, ad network/CMP, premium price, and capacity ceiling.
6. If authorized to create Git history, tag the last anonymous prototype commit. If not authorized or the worktree is dirty, document the exact commit hash and do not mutate Git history.

**Verification:** current tests still pass and the baseline document identifies all prototype behaviors that later units must preserve.

**Done when:** an agent can compare new behavior to a fixed baseline, and every open product decision has a named placeholder rather than an implicit guess.

## Unit 1 — Convert the repository to npm workspaces

**Goal:** create the new repository skeleton without yet rewriting product behavior.

**Prerequisites:** Unit 0.

**Implementation:**

1. Change the root `package.json` to private npm workspaces for `apps/*` and `packages/*`; require Node 22 and add root orchestration scripts.
2. Create `apps/web`, `apps/admin`, `apps/api`, `packages/contracts`, `packages/database`, `packages/ui`, and `packages/config`, each with a clear package name, private/version policy, scripts, and TypeScript configuration.
3. Add Vite React TypeScript entrypoints for web and admin. Add a Fastify TypeScript entrypoint for API. Initially expose only `/health/live`, `/health/ready`, and `/ws` upgrade plumbing.
4. Add a worker entrypoint in `apps/api` or a clearly named sibling process. It may initially perform only a heartbeat/self-check; it must be independently deployable later.
5. Add a root development orchestrator. Local Postgres and Redis should be represented in a checked-in Compose file or an equally reproducible local setup. Do not require cloud credentials to render the UI shell or run unit tests.
6. Use one API port for HTTP and WebSocket. Remove the new architecture's dependency on `WS_PORT`; a temporary legacy script may retain it until Unit 3.
7. Add `.nvmrc` or equivalent Node version declaration, workspace-aware lockfile, `.editorconfig`, and ignore entries for build/test artifacts.
8. Keep the legacy `public/`, `server/`, and `test/` trees unchanged during this unit. Add explicit `legacy:*` scripts if needed so their tests can still run.

**Verification:** fresh `npm install`, root development startup, workspace typecheck, and production builds for all three apps. Confirm `/health/live` responds and `/ws` shares the same server address.

**Done when:** one root install owns all packages, both Vite shells load, API boots on one port, legacy tests still pass, and no product behavior was accidentally deleted.

## Unit 2 — Establish shared TypeScript, quality, and CI foundations

**Goal:** make schema drift and broken workspaces fail early.

**Prerequisites:** Unit 1.

**Implementation:**

1. In `packages/config`, add strict shared TypeScript configs for browser, Node, and library packages. Enable strict null checking, no unchecked indexed access, exact optional properties where practical, and no emit for app typechecks.
2. Configure ESLint and formatting consistently. Add rules preventing unsafe `any`, unhandled promises, accidental browser use of server-only modules, and console logging outside approved logger/bootstrap locations.
3. Configure Vitest for packages and clients, and an integration-test project that can use disposable Postgres and Redis.
4. Add Testing Library setup, Playwright skeleton/configuration, and coverage reporting for security-critical pure logic without imposing arbitrary repository-wide percentage gates yet.
5. Add CI jobs for install, lockfile integrity, lint, typecheck, unit tests, integration tests, builds, migration validation, and secret/dependency scanning. Cache safely by lockfile.
6. Make CI output identify the failing workspace. Ensure generated files are either checked and verified or produced deterministically in CI.
7. Add root `check` command that runs the fast pre-commit-quality set; keep long browser/load suites separate.

**Verification:** introduce a temporary type/schema/test failure locally and confirm the correct job fails, then remove it. Run all root checks on a clean checkout.

**Done when:** every workspace participates in lint, typecheck, test, and build; CI can reject contract, migration, and secret mistakes.

## Unit 3 — Port the visual system and React application shells

**Goal:** replace manual screen orchestration with accessible React shells while retaining the Strangr visual identity.

**Prerequisites:** Units 1–2.

**Implementation:**

1. Move the reusable CSS tokens from `public/styles/tokens.css` into `packages/ui`. Preserve the near-black base, purple accent, typography, glass surfaces, spacing, radii, shadows, motion timing, and reduced-motion behavior.
2. Build shared accessible primitives only for immediate needs: button, icon button, input, textarea, select, dialog, alert dialog, toast/status region, avatar, badge, card, tabs, skeleton, and responsive app frame. Use semantic HTML and visible focus states.
3. In `apps/web`, add React Router boundaries for public landing, auth, onboarding, authenticated app, and active conversation. Add placeholder routes for Home, Friends, Messages, History, Profile, Premium, and Settings.
4. In `apps/admin`, add a separate login boundary and placeholder routes for Queue, Case, User lookup, Appeals, Catalog, Audit, and Health. Do not share user-app authentication state.
5. Add TanStack Query providers and error boundaries. Add Zustand only for transient device/call/dock state; do not place server entities, entitlements, age cohort, or authorization decisions in Zustand.
6. Port the landing and current room shell visually. Decompose it into route/layout components and state-driven views. Do not paste the old imperative `ViewController` into React.
7. Preserve permission-denied text fallback, keyboard operation, mobile safe areas, reduced motion, opaque fallback without `backdrop-filter`, and readable high contrast.
8. Add route-level loading, empty, offline, forbidden, and recoverable error surfaces from the start.

**Verification:** component tests for dialogs, focus restoration, navigation, error boundary, reduced-motion behavior, and mobile navigation. Perform screenshots at narrow phone, tablet, and desktop widths.

**Done when:** landing, user shell, call-room shell, and admin shell render from React/TypeScript with no dependency on legacy DOM controllers; visual regression references are recorded.

## Unit 4 — Create shared contracts and validated configuration

**Goal:** make HTTP, WebSocket, database-facing inputs, and environment configuration explicit and typed.

**Prerequisites:** Units 1–3.

**Implementation:**

1. In `packages/contracts`, define common IDs, timestamps, cursor pagination, stable error envelopes, request IDs, idempotency keys, and safe enum schemas.
2. Define initial account, onboarding, profile, visibility, session, realtime-ticket, and health request/response schemas. Keep schemas transport-neutral and infer TypeScript types from Zod.
3. Define a versioned WebSocket envelope with `type`, `requestId`, and validated `payload`. Reject unknown commands, oversized payloads, malformed IDs, and unsupported versions.
4. Reserve event namespaces from the product plan: `connection.*`, `presence.*`, `match.*`, `rtc.*`, `chat.*`, `friend.*`, `call.*`, `report.*`, and `error`. Implement schemas only as their units arrive; never accept an untyped catch-all payload.
5. Add server-only environment schemas for database, Redis, Supabase JWT verification, storage, encryption key IDs, TURN, Stripe, logging, and deployment metadata. Add client-public schemas containing only Vite-safe public values.
6. Fail at process startup with concise variable names and reasons. Never send secrets or raw environment values to the client.
7. Generate OpenAPI from Fastify route schemas and expose it only in local/staging or behind admin authorization.
8. Add a contract compatibility rule: additive server events may be optional; breaking changes require a protocol version or coordinated deployment.

**Verification:** contract round-trip tests, invalid-input tables, unknown-event tests, environment missing/invalid tests, and a build-time check that server secret names/values do not occur in client output.

**Done when:** there is one schema source for each implemented boundary and neither app can silently disagree with the API shape.

## Unit 5 — Build the Postgres/Drizzle data foundation

**Goal:** establish auditable durable storage and constraints before account features proliferate.

**Prerequisites:** Units 2 and 4; development Postgres available.

**Implementation:**

1. Configure Drizzle in `packages/database` with migrations committed to the repository. Separate schema definitions, repositories, transaction helpers, and test factories.
2. Add the initial identity/profile tables: `users`, `profiles`, `profile_field_visibility`, `user_settings`, `privacy_settings`, `terms_acceptances`, and `user_sessions`.
3. Use the Supabase auth subject as an external identity reference, not as a client-supplied user ID. Give internal entities non-enumerable IDs. Normalize usernames and enforce unique normalized username constraints.
4. Store exact birth date through an application encryption abstraction with key version metadata. Store derived cohort separately. Never expose birth date through a public repository method.
5. Define account states and valid values: pending verification, onboarding, active, limited, suspended, deletion pending, banned, and deleted. Centralize transition validation in domain code.
6. Add timestamps, foreign keys, check constraints, partial unique indexes, and deletion behavior deliberately. Do not use soft deletion by default.
7. Add a migration ledger/check in CI and documented local reset/seed commands. Production migrations must be explicit, forward-safe, and not execute automatically on arbitrary API process startup.
8. Add database role notes and RLS defense-in-depth policies where Supabase access/storage requires them. Business writes still go through the API.

**Verification:** migrate an empty database up, exercise repositories, test constraints and username races, and rebuild from zero. Test that raw birth date is encrypted at the application boundary and absent from normal profile serialization/logs.

**Done when:** identity/profile persistence is reproducible, constrained, and testable; a schema change cannot bypass migrations.

## Unit 6 — Integrate Supabase authentication and server authorization

**Goal:** establish verified, revocable account identity for every protected operation.

**Prerequisites:** Units 4–5; development Supabase project/local stack.

**Implementation:**

1. Configure email/password registration, verification, login, password reset, Google OAuth, logout, refresh, and callback handling in `apps/web`.
2. Validate Supabase access tokens in the API using current signing-key/JWKS support. Validate issuer, audience, expiry, and subject. Cache keys safely and handle rotation.
3. On first authenticated API access, reconcile the auth identity to an internal user through an idempotent transaction. Do not trust client email, provider, verification, account state, or role claims without server verification.
4. Add an auth pre-handler and capability guard that returns stable errors for `unauthenticated`, `email_unverified`, `onboarding_required`, `account_limited`, `account_suspended`, `account_banned`, and `deletion_pending`.
5. Permit unverified users only to finish non-contact profile setup, inspect their own state, resend verification through approved provider flow, and sign out. Deny matching, messages, calls, requests, and reports that require an encounter.
6. Create/update `user_sessions` using a server-issued device-session identifier; store last seen, approximate device label, and revocation status without invasive fingerprinting.
7. Implement `GET /v1/me`, `GET /v1/me/sessions`, and `DELETE /v1/me/sessions/:id`. Revocation must invalidate relevant realtime tickets/sockets as soon as Unit 9 exists.
8. Ensure protected route redirects preserve a safe internal return path and cannot become an open redirect.

**Verification:** email verification gates, Google verified flow, expired/wrong-audience token, logout, refresh, session revocation, duplicate first-login race, and direct API attempts that bypass React.

**Done when:** every protected HTTP request resolves to a server-owned internal user and capability state; unverified or sanctioned users cannot contact others.

## Unit 7 — Implement onboarding, age cohorts, policy acceptance, and profiles

**Goal:** create a complete account that exposes only user-approved profile information.

**Prerequisites:** Unit 6; approved initial terms/guidelines version identifiers.

**Implementation:**

1. Build a resumable onboarding flow for birth date, policy acceptance, username, display name, avatar, initial account privacy, and field visibility. Persist only completed server-validated steps.
2. Reject users younger than 16 using server date/time rules. Derive cohort on the server. Define how cohort changes on the eighteenth birthday: a scheduled/current-request reconciliation changes `minor_16_17` to `adult_18_plus` and removes the user from any minor queue before the change takes effect.
3. Record policy type, immutable version, timestamp, and source. Material updates can force reacceptance before contact features.
4. Add profile fields: normalized username, display name, avatar, bio, interests, language, general region, status, and account public/private mode. Define lengths, allowed character sets, and controlled vocabularies.
5. Implement visibility audiences: everyone, current/recent encounters, friends, and only me. Centralize a profile projection service that accepts viewer/relationship context and returns only permitted fields.
6. Implement `POST /v1/me/onboarding`, `PATCH /v1/profiles/me`, `PATCH /v1/profiles/me/visibility`, and `GET /v1/profiles/:username`. Exact-username discovery only; no broad people search.
7. A private stranger profile returns only the permitted safe preview. Email, birth date, auth provider, device, moderation, and payment data are never serializable profile fields.
8. Add initial settings/privacy screens for discoverability, encounter requests, presence, recent activity, accessibility, and history preferences.

**Verification:** under-16 rejection, birthday boundaries/time zones, policy versioning, username normalization/collision/race, every viewer × visibility combination, private profile, blocked viewer, and client/API validation disagreement.

**Done when:** a verified user can complete onboarding and view/edit a privacy-correct profile; all contact endpoints can rely on a server-derived cohort and acceptance state.

## Unit 8 — Secure avatar and cosmetic asset uploads

**Goal:** prevent profile uploads from becoming an execution, privacy, or resource-exhaustion path.

**Prerequisites:** Unit 7; development Supabase Storage.

**Implementation:**

1. Implement an authenticated upload-init/finalize flow or server-mediated upload with strict size, pixel, format, and count limits.
2. Accept a narrow raster allowlist. Decode and re-encode images server-side to strip metadata and reject polyglots, malformed images, animation if unsupported, and decompression bombs. Do not serve raw user filenames or user-controlled SVG/HTML.
3. Run malware scanning where the deployment pipeline supports it. Quarantine until processing completes.
4. Store immutable processed variants with generated object keys and controlled content types. Keep original uploads only if explicitly required; otherwise delete them after processing.
5. Enforce ownership in API and Storage policy. Use expiring signed access for private assets where appropriate.
6. Replace/delete the former avatar transactionally and add orphan cleanup. Moderate/remove an avatar without deleting audit evidence required by a case.
7. Add fallback avatar and failure/retry states in React.

**Verification:** wrong content type, spoofed extension, oversized dimensions/file, corrupt image, metadata stripping, unauthorized finalize/read/delete, abandoned upload cleanup, and cache behavior after replacement.

**Done when:** only processed safe variants can become active profile assets and private asset authorization matches profile projection rules.

---

## P1 — Realtime matching, calls, history, and relationships

## Unit 9 — Add Redis primitives and authenticated realtime tickets

**Goal:** bind every socket to an eligible account/session without placing long-lived tokens in URLs.

**Prerequisites:** Units 4, 6, and local Redis.

**Implementation:**

1. Create a Redis adapter with namespaced keys, TTL helpers, atomic scripts/transactions where needed, health checks, and test isolation. Do not store durable user/social/message data in Redis.
2. Implement `POST /v1/realtime/tickets`. After normal access-token authorization, create a cryptographically random, single-use ticket bound to internal user ID and device session, expiring in about 30 seconds.
3. Upgrade at `/ws?ticket=...` on the same Fastify HTTP server. Atomically consume the ticket once; reject missing, expired, reused, or revoked tickets without leaking account state.
4. Bind socket context server-side. Never accept user ID, cohort, premium, sanctions, friendship, or role from client events.
5. Implement heartbeat, bounded payloads, per-socket malformed-event limits, connection IDs, request IDs, reconnect backoff guidance, graceful shutdown, and session revocation.
6. Store connection ownership and presence in Redis with short leases. Add pub/sub routing so a later second API instance can target the correct socket.
7. Define duplicate-device/tab behavior explicitly. At minimum, prevent a user from entering conflicting queue/call states while allowing normal app browsing.
8. Log event names and internal IDs only. Redact ticket, token, query, SDP, ICE, and content values.

**Verification:** ticket single use/expiry/concurrency, wrong/revoked session, oversized/unknown messages, heartbeat expiry, reconnect, second-instance pub/sub simulation, and secret-redaction checks.

**Done when:** anonymous sockets are impossible and a revoked/sanctioned device loses realtime access without waiting for a page reload.

## Unit 10 — Implement Redis-backed account-aware matching

**Goal:** safely pair eligible users across instances with no stale or cross-cohort match path.

**Prerequisites:** Unit 9; block/sanction lookup interfaces may initially be empty adapters with deny-capable contracts until Units 13 and 20.

**Implementation:**

1. Implement `POST /v1/matches/tickets` or a server-authoritative `match.join` command, but do not create two competing entry mechanisms. The server rechecks eligibility at queue entry and pairing.
2. Eligibility includes active account, completed onboarding/current policy, verified identity, age >=16, cohort, no matching sanction, no current queue/match/direct call, supported mode, rate limits, and server-side filter entitlements.
3. Maintain distinct mode/cohort queue partitions. Store queue timestamps and leases in Redis. Use atomic pairing so two workers cannot pair the same entry.
4. Apply pairing in this order: hard exclusions, recent-pair exclusion, allowed paid filters, wait-time score, then weighted randomness among a small best-fit set. Never give premium users safety exceptions or general queue priority.
5. Filter relaxation is opt-in and can relax only paid preference matching, never cohort, block, sanction, mode, or current-state rules.
6. Create a unique short match lease and require acknowledgment from both clients. If acknowledgment expires, close it and safely requeue only still-eligible participants.
7. Make `next` close the old match atomically before queueing again. Clear old peer ID, RTC state, report token/context, chat state, typing, and media summary.
8. Add layered Redis rate limits for socket, user, device session, and coarse IP/network signals. Return a stable retry time.
9. Persist only the durable match/encounter result in Postgres after Unit 12. Until then, expose a repository interface and test fake; do not let temporary in-memory state become permanent architecture.

**Verification:** same-user, cross-cohort, block/sanction adapter denial, duplicate join, concurrent pair workers, ack timeout, disconnect during pair, next race, recent-pair TTL, rate-limit sharing across instances, and Redis restart behavior.

**Done when:** matching survives multiple API instances and no tested path crosses cohort, duplicates a user, or inherits stale peer state.

## Unit 11 — Port random text/video state machines and WebRTC

**Goal:** deliver the core stranger conversation loop in React with server-authoritative state.

**Prerequisites:** Units 3, 9, and 10.

**Implementation:**

1. Define and test explicit random-session transitions: idle, requesting media, queued, matched, connecting, connected, leaving, next, reconnecting, and ended. Illegal/out-of-order events must not corrupt client state.
2. Port the existing media manager and peer-connection concepts into typed modules/hooks. Acquire camera/microphone only after video selection. If unsupported or denied, clearly offer/enter text mode.
3. Implement validated `rtc.offer`, `rtc.answer`, `rtc.ice`, and `rtc.failed` relay events. Relay only between current match participants. Bound ICE buffering and reject stale match IDs.
4. Add `POST /v1/rtc/credentials` returning short-lived STUN/TURN configuration only to eligible users in a relevant call flow. Do not embed permanent TURN secrets in Vite output.
5. Implement mute/camera toggle, skip/next, leave, block placeholder/action, report dialog entry, connection status, peer media state, and mobile thumb-reachable controls.
6. Teardown must stop every local media track, detach media elements, close peer connection/data structures, clear timers/listeners, close match leases, and clear peer-specific UI.
7. Reconnect uses exponential backoff and the server lease. If restoration is not valid, end clearly; never attach a user to an arbitrary new peer.
8. Random text travels through authenticated realtime, receives a server sequence/ack, and renders as text only. URLs remain plain text until the safe-link unit.
9. Keep “Submit report” and “Submit and leave” distinct. Block immediately leaves.

**Verification:** two browser contexts for text and video, permission denied, no devices, offer glare, ICE-before-description, reconnect within/after grace, peer leaves, next during negotiation, duplicate/out-of-order events, route unload, and track teardown.

**Done when:** the prototype's core text/video loop works in React through authenticated one-port realtime and leaves no camera/socket/match state behind after exit.

## Unit 11A — Establish Vercel frontend and Render backend deployments

**Goal:** make the implemented clients and realtime foundation deployable without forcing long-running processes into serverless functions.

**Prerequisites:** Units 1–11.

**Implementation:**

1. Deploy `apps/web` and `apps/admin` as separate Vercel Vite projects with workspace-aware builds, `dist` outputs, SPA deep-link rewrites, baseline browser headers, isolated public configuration, and client secret-bundle checks.
2. Add frontend-specific root builds so a Vercel deployment never builds or deploys the Fastify API, database package, worker, or unrelated frontend.
3. Deploy the one-port Fastify HTTP and `/ws` API through a Render Web Service in Singapore. Accept Render's `PORT`, retain graceful `SIGTERM`, expose readiness, and never run migrations during startup.
4. Deploy Redis-compatible realtime state as Render Key Value in the same region. Treat free non-persistent state as private-testing infrastructure only.
5. Refactor maintenance execution into bounded `worker:once` and continuous `start:worker` modes. Use an hourly Render Cron Job during private testing; move latency-sensitive queue processing to a paid Render Background Worker and disable overlapping cron execution.
6. Configure comma-separated exact user, admin, and approved-preview origin lists. Apply the same policy to HTTP CORS and WebSocket upgrades; never allow arbitrary `*.vercel.app` origins.
7. Record environment ownership, project settings, release order, domains, migrations, smoke checks, cron-to-worker transition, and contract-compatible rollout in an operations runbook.

**Verification:** clean frontend-specific and API builds; secret scans; configuration parsing; allowed/denied CORS; rejected WebSocket origins; Vercel deep-link refreshes; Render liveness/readiness; bounded worker exit; authenticated HTTP and realtime smoke journey.

**Done when:** Web and Admin deploy independently to Vercel, the API/realtime service and shared Redis state deploy to Render, maintenance has a bounded deployment mode, and every deployed component has a documented owner and environment boundary.

## Unit 12 — Persist encounters, random messages, call metadata, and retention

**Goal:** support the 48-hour recovery window without creating permanent stranger surveillance.

**Prerequisites:** Units 5 and 11.

**Implementation:**

1. Add `encounters`, `encounter_participants`, `threads`, `thread_members`, `messages`, `calls`, and `call_participants` with explicit random/direct type distinctions and expiry fields.
2. Persist match start/end, mode, participant result, completion reason, connection diagnostics category, and call timing. Never persist SDP, ICE, raw IP data beyond approved security use, audio, video, frames, or screen captures.
3. Persist sanitized random text with server sequence, sender, timestamp, and expiry no later than 48 hours. Enforce body length and plain text on server.
4. Implement `GET /v1/encounters?window=48h` with cursor pagination and privacy-projected other-user preview. Include approximate time, mode, friendship/request state, and the viewing user's hide/report/block state.
5. Implement `DELETE /v1/encounters/:id/view` as hide-for-current-user, not deletion of another user's record or retained safety evidence.
6. Add a worker job that deletes expired random messages and removes user-visible encounter metadata at 48 hours. Use batches, idempotency, retry, lag metrics, and a dry-run/report mode.
7. If a report preserves evidence, copy only the approved minimal excerpt/reference into restricted evidence storage with its own retention reason/expiry; do not simply prevent the whole thread from expiring.
8. Test timezone-independent expiry and make history disappear immediately on block (Unit 13 integration).

**Verification:** exact boundary expiry, job rerun/failure recovery, pagination, hide-for-one-side, privacy projection changes, no-media-content schema/log assertion, and report-evidence exception.

**Done when:** recent encounters can be recovered for 48 hours and automated deletion is evidenced in code/tests rather than left as policy prose.

## Unit 13 — Implement blocks as a cross-domain safety primitive

**Goal:** make block enforcement immediate, bidirectional for contact, and impossible to bypass through alternate endpoints.

**Prerequisites:** Units 5, 9–12.

**Implementation:**

1. Add `blocks` with blocker, blocked user, reason category, timestamps, and appropriate uniqueness. Decide/document unblock and safety-retention semantics without exposing the reason to the blocked person.
2. Implement `POST /v1/blocks` and `DELETE /v1/blocks/:userId` with idempotent behavior and self-block rejection.
3. Centralize a block relation service that checks either direction. Use it in matching, profile projection/discovery, encounter history, friend requests, friendships, threads/messages, presence, and calls.
4. On block, atomically cancel pending requests, close current match/call/contact access, remove both users from queues involving the relationship, publish realtime revocation, hide relevant encounter/profile surfaces, and prevent future pair selection.
5. Do not notify the blocked user with the blocker's identity/reason. Return generic unavailable outcomes where disclosure could enable enumeration.
6. Define existing friendship/thread behavior: friendship becomes inaccessible; message history follows deletion/hide policy and is not available for new contact. Preserve restricted evidence only when law/policy requires it.
7. Add block-action UI to active call, profile, history, friend, and message surfaces with an appropriate confirmation that does not slow emergency exit from a live interaction.

**Verification:** block races with match creation, message send, friend acceptance, direct call invite, reconnect, and two simultaneous opposite-direction blocks. Test all endpoints for IDOR and generic response behavior.

**Done when:** one successful block terminates live contact and every future contact/discovery route denies the relationship, including after reconnect and across API instances.

## Unit 14 — Implement friend requests and friendships

**Goal:** turn a current/recent encounter into persistent contact only with mutual consent.

**Prerequisites:** Units 12–13.

**Implementation:**

1. Add `friend_requests` and `friendships`. Use canonical pair keys, unique active-request constraints, valid state checks, expiry, source encounter, and transaction-safe acceptance.
2. A request is allowed only from a current encounter or an encounter less than 48 hours old, unless a future explicit flow is approved. Respect recipient encounter-request preference and either-direction block.
3. Implement list/create/accept/reject/cancel endpoints. Define crossing requests: the second valid opposite-direction request may atomically create the friendship, or the API can expose one request for acceptance; choose one documented behavior and test it.
4. Acceptance creates exactly one friendship and one friend thread in one transaction. Duplicate requests, retries, or concurrent acceptance never duplicate either.
5. Rejection/expiry creates no persistent thread. Retain rejected/expired request data for at most 30 days for spam control, then delete/aggregate through a job.
6. Implement friends list, request inbox, unfriend, mute/unmute, and server-calculated in-app unread/request counts. Add `mutes` with scope and optional expiry.
7. Unfriend immediately denies new DMs/calls and updates realtime state. Existing history follows the message retention rules rather than being silently destroyed.
8. Use the profile projection service for request/friend cards. Friends receive friend-level fields; pending requests do not automatically grant full private-profile access.

**Verification:** request outside window, preference denial, block races, crossing requests, double accept, accept vs expiry, unfriend vs message/call, canonical pair uniqueness, and request cleanup.

**Done when:** every friendship has an eligible encounter and explicit mutual transition, all mutations are idempotent/concurrency-safe, and block remains dominant.

## Unit 15 — Finish history, friends, profile discovery, and in-app presence UI

**Goal:** expose the P1 social features as coherent, privacy-safe user journeys.

**Prerequisites:** Units 12–14.

**Implementation:**

1. Complete Home, Friends, Requests, History, and other-user Profile routes with cursor pagination, loading/empty/error/offline states, and responsive navigation.
2. Display 48-hour encounter items with approximate time, mode, permitted safe preview, and available request/profile/hide/report/block actions.
3. Add exact normalized username lookup only. Avoid suggestions, broad search, contact upload, or recommendation feeds.
4. Implement presence leases and `presence.changed` only for eligible friends/viewers and only when the subject permits it. Do not reveal last activity when disabled.
5. Add in-app counts through query invalidation or realtime delta plus authoritative refetch. Counts must recover after reconnect and not rely only on local optimistic state.
6. Ensure private/public and per-field visibility changes invalidate cached projections immediately. Remove inaccessible cached profile/history data on block/unfriend/privacy change.
7. Add accessible confirmation, toast, and undo only where the server semantics truly permit it.

**Verification:** viewer privacy matrix in browser tests, stale cache after privacy/block changes, pagination, reconnect count recovery, mobile navigation, keyboard/screen-reader critical actions, and empty account states.

**Done when:** users can find a recent stranger, manage requests/friends, and understand presence without seeing information they are not authorized to view.

---

## P2 — Persistent communication and moderation

## Unit 16 — Implement persistent friend messaging

**Goal:** provide ordered, recoverable one-to-one messaging between current friends.

**Prerequisites:** Units 14–15.

**Implementation:**

1. Finalize friend `threads`, membership, messages, server sequence, read cursor, hidden state, deletion state, and indexes for cursor pagination.
2. Implement thread list, `GET /v1/threads/:id/messages`, and `POST /v1/threads/:id/messages`. Recheck friendship, block, sanction, membership, and rate limit inside the write transaction.
3. Require client request ID/idempotency key. Assign server sequence exactly once and return an ack that lets optimistic UI reconcile retries.
4. Deliver over realtime when connected and recover through cursor-based HTTP after reconnect. Handle duplicate and out-of-order delivery in the client.
5. Render strict plain text. If linkification is enabled, use a controlled parser with only safe `http`/`https` URLs, safe attributes, no HTML injection, and a visible external destination.
6. Implement read state without revealing data disallowed by privacy settings. Do not write a database row for every presence-like event if a cursor update suffices.
7. Implement delete-for-me and the approved short delete-for-everyone window with explicit tombstone semantics. Authorization uses server time.
8. Never put message bodies in Pino logs, error tracking, traces, analytics, notifications, or admin account summaries.

**Verification:** concurrent sends/order, retry/idempotency, reconnect catch-up, pagination gaps, block/unfriend/sanction race, XSS/link protocols, delete windows, read cursor monotonicity, and content-redaction tests.

**Done when:** friend messages remain ordered and recoverable across reconnects and cannot be sent after relationship/safety access ends.

## Unit 17 — Implement direct friend voice/video calls

**Goal:** add in-session ringing and peer media calls that respect current relationship state.

**Prerequisites:** Units 11 and 16.

**Implementation:**

1. Define direct-call states: idle, inviting, ringing, connecting, connected, reconnecting, declined, missed, cancelled, and ended. Store call metadata only.
2. Implement `POST /v1/calls/direct` and realtime invite/accept/reject/end events. Invite only current unblocked friends with allowed account state; recheck on acceptance and reconnect.
3. Prevent conflicting queue, random match, or direct-call membership using server leases. Define how an incoming invite behaves while busy without revealing private activity.
4. Ring only active web sessions. Expire unanswered invites into a missed-call record. There is no push/email/SMS fallback.
5. Reuse the secure RTC relay/TURN path with call-specific authorization and stale-call rejection.
6. Add voice/video selection, local preview as appropriate, mute/camera, cancel, decline, end, reconnect, and missed-call UI. Stop media on every terminal path.
7. Persist call type, participants, invite/connect/end times, completion result, and approved diagnostic codes. Default metadata retention is 90 days pending privacy review; implement it as configurable policy plus cleanup job.

**Verification:** offline friend, multiple tabs, simultaneous invites, busy user, accept after unfriend/block/sanction, missed timeout, reconnect, TURN retrieval, and track teardown.

**Done when:** friends can reliably call inside active web sessions and no stale friendship or call ID grants media/signaling access.

## Unit 18 — Implement report intake and minimal evidence handling

**Goal:** create actionable cases without collecting recordings or unnecessary private content.

**Prerequisites:** Units 12–17 and approved initial report-reason taxonomy.

**Implementation:**

1. Add `reports`, `report_evidence`, `moderation_cases`, and append-only `moderation_actions` base tables with reason, references, state, priority, assignment, and retention fields.
2. Implement `POST /v1/reports` for eligible encounter/call/message context. Derive reporter/subject and ownership from server records; never accept an arbitrary subject/context combination.
3. Accept controlled reason enum and bounded optional note. Attach timestamps, internal context IDs, and approved technical metadata. Copy only a small relevant text window when the user specifically reports a message/context.
4. Never request or capture video screenshots, audio, browser frames, SDP, ICE, broad message history, payment details, or unrelated profile/device data.
5. Separate report submission from leave. A successful report leaves the interaction active unless `leaveAfterSubmit` was explicitly chosen. A block remains a separate action and immediately ends contact.
6. Add per-user/device/network abuse limits without preventing urgent safety reporting; flag spam for triage rather than silently dropping valid submissions.
7. Implement `GET /v1/reports/me` with safe status only; do not expose moderator notes, detection signals, or subject sanctions.
8. Add restricted evidence access methods that require admin role plus case purpose and generate audit events in Unit 19.

**Verification:** IDOR/context forgery, report vs report-and-leave, duplicate submission/idempotency, note/body limits, expired encounter with permitted report policy, minimal excerpt, redaction, and no-media-content assertions.

**Done when:** a report creates a triageable case with the minimum permitted evidence and never changes contact state unless the reporter chose leave/block.

## Unit 19 — Build the admin application, MFA, roles, and audit trail

**Goal:** allow least-privilege moderation in a separately secured surface.

**Prerequisites:** Units 6 and 18; selected admin MFA approach.

**Implementation:**

1. Deploy/admin-route the app separately from user web. Configure independent CSP, allowed origins, cookies/storage, error tracking, and no production user-app fallback routes.
2. Add `admin_roles` and `admin_audit_logs`. Roles are Support, Moderator, Admin, and Superadmin. Define a permission matrix per endpoint/data field/action; do not authorize from navigation visibility.
3. Require MFA before admin session capability. Add short idle/session lifetimes, reauthentication for high-risk actions, device/session revocation, and no shared accounts.
4. Implement case queue filters, assignment, case detail, minimal context reveal, evidence access, action form, appeals queue, and account lookup limited by role/purpose.
5. Every privileged read and mutation writes an append-only audit event containing actor, action, target type/ID, purpose/case, timestamp, result, and safe change summary. Never record raw message/report content in the audit body.
6. Prevent casual “view everything,” bulk exports, arbitrary SQL-like search, and account impersonation. Mask sensitive fields until specifically authorized and purpose-bound.
7. Add approved cosmetic catalog and service-health placeholders only if permissions are already defined; do not distract from the case workflow.
8. Alert on role changes, repeated sensitive reveals, audit failures, and high-risk sanctions. Audit write failure must fail closed for privileged mutation.

**Verification:** test every role × admin route/action, MFA missing/stale, cross-origin user token, direct API access, audit immutability/completeness, sensitive reveal, role-change reauth, and session revocation.

**Done when:** a moderator can investigate a test report end to end, every privileged operation is authorized/audited, and admin credentials cannot be used as normal user authorization.

## Unit 20 — Implement sanctions, appeals, and immediate enforcement

**Goal:** make granular moderation decisions effective across current and future HTTP/realtime activity.

**Prerequisites:** Unit 19 and approved sanction matrix/appeal policy.

**Implementation:**

1. Add `sanctions` and `appeals` with subject, scope/type, start/end, permanent flag, reason, evidence references, actor, state, reversal, and timestamps.
2. Support warning, temporary/permanent matching restriction, messaging/request restriction, temporary suspension, permanent full ban, profile/cosmetic removal, and verification challenge.
3. Centralize capability evaluation combining account state, active sanctions, verification, onboarding, block/relationship context, and feature. Use it in every HTTP route and realtime command.
4. Applying a restriction publishes a revocation event, removes queue entries, closes prohibited active match/call/socket state, and prevents reconnect/ticket issuance. Permanent matching bans survive session/device changes.
5. Require reason and evidence for permanent action. Require higher permission/reauth where the matrix says so. Reversal never deletes history; it appends a new audited action and recalculates capability.
6. Implement user-safe sanction notice and appeal submission. Do not expose reporter identity, internal evidence, network/device signals, or moderator identity.
7. Implement appeal review with separate reviewer rules where approved. Add expiry/reconciliation jobs so temporary sanctions lift consistently.
8. Add a full endpoint/event authorization inventory test to prevent newly added contact routes from forgetting capability checks.

**Verification:** sanction during queue/call/message, reconnect and new device, temporary expiry, overlapping sanctions, reversal, permanent matching ban, full ban, appeal IDOR, audit, and multi-instance propagation.

**Done when:** enforcement takes effect on existing and new sessions within seconds, survives reconnect, and is explainable/auditable without leaking safety data.

---

## P3 — Revenue and expression after the core is safe

## Unit 21 — Integrate Stripe subscription and entitlement ledger

**Goal:** derive paid capabilities from replay-safe provider events, never client flags.

**Prerequisites:** stable accounts; selected plan/product IDs and cancellation/refund policy.

**Implementation:**

1. Add `billing_customers`, `subscriptions`, `entitlements`, and processed-webhook/idempotency storage. Keep provider IDs unique and sensitive billing details out of general user tables.
2. Implement checkout, customer portal, and subscription status endpoints. Create/reuse one Stripe customer per user transactionally.
3. Verify webhook signatures against the raw body. Store event ID, process idempotently, tolerate retries/reordering, and reconcile subscription state from Stripe when sequence is ambiguous.
4. Use webhooks/reconciliation as access source of truth. Checkout redirect success is not entitlement proof.
5. Define server-readable entitlement keys with source, effective time, and expiry/grace behavior. Centralize checks for filters, cosmetics, ad-free, and convenience features.
6. Handle trialing/active/past-due/canceled/unpaid/incomplete states per written policy. Add periodic reconciliation and mismatch alerts.
7. Provide billing UI that clearly shows plan state, renewal/cancellation, portal link, and failure state without exposing provider internals.
8. Use Stripe test clocks/fixtures where useful and document refunds, chargebacks, webhook outage, and support procedures.

**Verification:** forged signature, replay, duplicate/reordered event, delayed webhook, checkout retry, customer race, cancellation/renewal/past due, reconciliation, and client premium-flag forgery.

**Done when:** entitlements match Stripe under failure/replay conditions and every paid API action independently checks the server ledger.

## Unit 22 — Implement premium filters and safe cosmetics

**Goal:** add paid choice and expression without weakening safety, fairness, readability, or trust signals.

**Prerequisites:** Units 10, 21, and approved initial catalog/filter vocabularies.

**Implementation:**

1. Implement language, broad-region, and interests preferences using controlled values and server entitlements. Exact location and gender filters are out of scope.
2. Apply filters inside the existing cohort/mode/block/sanction rules. Free users use the normal eligible pool. Premium does not jump queue priority.
3. Show honest wait implications and explicit opt-in relaxation. Safety exclusions can never be relaxed.
4. Add `cosmetic_items`, `user_cosmetics`, and `cosmetic_loadouts` with catalog availability, ownership/grant source, expiry, and versioned equipped slots.
5. Support only approved slots: avatar frame, profile theme tokens, nameplate, clearly cosmetic status badge, and reduced-motion-safe call reaction/entrance effect.
6. Render from catalog IDs and approved design tokens. Reject arbitrary CSS, HTML, SVG, URL, script, font, shader, or layout values. Reserve staff/verification namespaces and visual shapes.
7. Validate ownership and compatibility on every loadout mutation. Expired/revoked entitlement falls back gracefully without corrupting the saved loadout.
8. Add admin catalog workflow only through Unit 19 permissions/audit.

**Verification:** free-user API bypass, cross-cohort filter attempt, relaxation safety, queue fairness, unowned/expired item, malicious token payload, staff-badge imitation, contrast, reduced motion, and cache invalidation.

**Done when:** premium changes eligible preferences/cosmetic slots only through server authorization and cannot alter safety or obscure controls.

## Unit 23 — Add consent-aware, conversation-safe advertising

**Goal:** monetize free non-conversation surfaces only after provider and regional approval.

**Prerequisites:** approved ad provider, approved CMP, reviewed launch regions, and teen-treatment rules. If these are not complete, ship an ad interface returning no placement rather than guessing.

**Implementation:**

1. Add `ad_consents` with region basis, consent version/string, choice, timestamp, and expiry. Integrate the approved CMP according to region and age cohort.
2. Default 16–17 users to contextual/non-personalized treatment and send the provider's required teen flags. Do not infer sensitive interests from chat/profile content.
3. Centralize placement eligibility using authenticated premium entitlement, current route/surface, cohort, consent, region, and frequency cap.
4. Allow only Home/discovery, History between sections, and a capped post-conversation placement after leaving has fully completed.
5. Explicitly deny ad requests/renders in matching animation, active text/video/direct calls, messages, report, block, safety, auth, onboarding policy, billing interruption, and account deletion.
6. Premium clients make no ad request. Client hiding alone is insufficient; placement eligibility must deny server-side/provider initialization where feasible.
7. Use reserved layout space and accessible labels. Keep ads away from destructive/safety controls and prevent deceptive click targets.
8. Add provider-failure and consent-change behavior that fails closed without blocking core product use.

**Verification:** route eligibility matrix, premium no-request assertion, teen flags, consent decline/revoke/expiry, frequency caps across tabs, post-leave timing, provider failure, and screenshots proving no overlays.

**Done when:** the provider has accepted the product category/audience and automated tests prove ads cannot appear on conversation or safety surfaces.

---

## P4 — Privacy operations, hardening, and release

## Unit 24 — Implement account export, deletion, and remaining retention jobs

**Goal:** make privacy controls operational, observable, and irreversible where promised.

**Prerequisites:** all durable feature schemas through Unit 23.

**Implementation:**

1. Inventory every table, Redis key, Storage object, log/analytics identifier, Stripe mapping, backup implication, and third-party processor for a user.
2. Implement `POST /v1/me/export` as a rate-limited asynchronous job with reauthentication, status, secure short-lived delivery, and audit. Export user-provided/account/social data without exposing other users' private data or internal abuse signals.
3. Implement `DELETE /v1/me` with password/provider reauthentication. Immediately set deletion pending, deny contact, remove queue/call state, revoke sessions/tickets/sockets, and remove public profile/avatar access.
4. Execute a documented deletion/anonymization workflow across profiles/assets, social graph, messages, encounters, settings, analytics IDs, and provider integrations. Preserve only legally/policy-required billing, fraud, safety, consent, and audit records with restricted purpose and explicit expiry.
5. Implement and schedule remaining retention: rejected/expired requests 30 days, random text/encounters 48 hours, calls 90 days by default, security logs 30–90 days by category, admin audit at least one year, and case/sanction evidence per approved policy.
6. Make jobs idempotent, batched, retryable, measurable, and safe under partial failure. Add dead-letter/manual recovery without dumping private content.
7. Document backup erasure behavior honestly; prevent restored backups from resurrecting deleted accounts by replaying deletion tombstones as required.
8. Add a privacy operations report showing job lag/count/failure, not content.

**Verification:** deletion during queue/call/billing, repeated deletion, partial job retry, export IDOR, blocked relationships, Storage cleanup, Redis cleanup, third-party reconciliation, backup restore scenario, and retained-record access restriction.

**Done when:** staging evidence shows a user becomes unreachable immediately and their data is deleted/anonymized according to the complete inventory and schedule.

## Unit 25 — Add privacy-safe observability, health, and operational jobs

**Goal:** operate realtime services without leaking content or sensitive identity.

**Prerequisites:** representative end-to-end features exist.

**Implementation:**

1. Configure Pino structured logging with redaction for authorization, cookies, tickets, emails, birth dates, message/report bodies, SDP, ICE, IP where not specifically security-approved, payment data, and secret values.
2. Add OpenTelemetry-compatible traces/metrics around API latency/errors, Postgres, Redis, job queue, WebSocket lifecycle, matching wait/ack, WebRTC outcome, TURN relay, messages, report backlog, billing mismatch, and retention lag.
3. Use internal IDs and coarse safe labels. Do not add cohort/region combinations that create small identifiable groups in dashboards.
4. Implement liveness, dependency-aware readiness, realtime/pub-sub health, worker health, and graceful drain. Readiness failure must stop new work without abruptly killing existing calls where avoidable.
5. Configure error tracking with session replay disabled on calls/messages unless independently proven safe. Scrub breadcrumbs/request bodies.
6. Add alerts with owners and runbook links for auth, database, Redis, reconnect storm, TURN failure/cost, abuse spike, admin compromise, data exposure, Stripe mismatch, and retention lag.
7. Add staging synthetic checks for login, realtime ticket, and controlled matching without polluting real user queues/metrics.

**Verification:** seed sentinel secrets/content and prove they do not appear in logs, traces, errors, analytics, or client bundles. Test dependency failure/readiness and graceful shutdown.

**Done when:** operators can diagnose availability, capacity, safety backlog, and data-lifecycle failures without reading user content.

## Unit 26 — Complete security, accessibility, browser, and failure hardening

**Goal:** close cross-domain attack paths and make critical journeys usable on supported browsers/devices.

**Prerequisites:** feature-complete staging candidate.

**Implementation:**

1. Produce a threat model covering auth/account linking, IDOR/BOLA, username enumeration, WebSocket tickets/reconnect, matching abuse, WebRTC metadata, upload pipeline, XSS/links/cosmetics, admin, Stripe, deletion, and third parties.
2. Perform an authorization inventory of every HTTP endpoint, WebSocket command, worker action, and Storage path. Add automated negative tests for other-user IDs and stale relationships.
3. Configure CSP, HSTS in production, frame protection, strict CORS/origin checks, secure cookies/storage, OAuth redirect allowlist, CSRF protection where cookies are used, and safe error responses.
4. Test session fixation, provider account linking, token/key rotation, rate-limit evasion, queue spam, report spam, ban evasion signals, file decompression, webhook forgery, and dependency/secret scans.
5. Run accessibility automation plus keyboard and screen-reader checks for signup, onboarding, matching, call controls, report/block, friends, messages, billing, deletion, and admin case action. Meet contrast, focus, labels, announcements, target size, and reduced-motion needs.
6. Run current Safari, Chrome, Edge, Firefox, and Chromium-based browsers on desktop/mobile widths. Explicitly test Safari camera permissions, autoplay, track teardown, WebSocket reconnect, `backdrop-filter`, and safe-area behavior.
7. Test offline, high latency, packet loss, denied permissions, device removal, Redis/database/auth/TURN/Stripe outages, deployment reconnect, and stale cached client versions.
8. Commission an independent security review before the public gate and resolve all critical/high findings.

**Verification:** publish a dated test matrix and issue links/evidence. No critical/high security finding remains open.

**Done when:** critical journeys meet the browser/accessibility matrix, authorization inventory is complete, and independent review has no unresolved launch blocker.

## Unit 27 — Load test, deploy, back up, restore, and rehearse incidents

**Goal:** determine a defensible capacity ceiling and prove recovery before public traffic.

**Prerequisites:** Units 25–26; production-like staging and selected infrastructure.

**Implementation:**

1. Add load scenarios for connected sockets per instance, cohort/mode queue latency, match acknowledgment, messages/acks, reconnect storm, Redis failover/pub-sub resubscription, Postgres connections/writes, worker backlog, and TURN relay bandwidth/cost.
2. Establish acceptable latency/error/SLO thresholds before interpreting results. Record instance sizes, regions, dataset, client behavior, and bottlenecks so results are reproducible.
3. Set public registration/concurrency caps from measured infrastructure and moderator coverage. Add safe admission control and honest wait/capacity messaging.
4. Define local, staging, and production isolation. Staging never shares production auth, database, Storage, Redis, Stripe mode, or personal data.
5. Create deployment definitions for separate web/admin, one-port API/realtime, worker, Postgres/Supabase, Redis, and TURN. Store secrets only in platform secret management.
6. Implement CI-to-staging, smoke tests, approval-gated production deployment, reviewed migrations, health observation, rollback/forward-fix, and client/server protocol compatibility during rollout.
7. Configure backups/PITR as available. Perform and document a restore rehearsal, including deletion tombstone replay, auth/storage relationships, Redis rebuild expectations, billing reconciliation, and audit integrity.
8. Exercise incident runbooks for auth outage, database failure, Redis queue loss, reconnect storm, TURN outage/cost spike, abuse wave, underage/exploitation report, admin compromise, data exposure, Stripe outage, and ad/CMP incident.

**Verification:** attach load reports, selected caps, deploy/rollback transcript, successful restore evidence, and incident exercise findings/owners.

**Done when:** the team knows the supported load, can stop admission safely, can restore durable data, and has practiced the highest-risk failures.

## Unit 28 — Pass the invite rehearsal and public beta gate

**Goal:** release only when product, safety, engineering, legal, and operations evidence exists.

**Prerequisites:** all preceding units and all ship-blocking policy/legal decisions.

**Implementation:**

1. Publish final Terms, Privacy Policy, Community Guidelines, retention schedule, cookie/consent choices, appeal/support paths, and versions used by onboarding. Complete launch-region legal review.
2. Finalize moderation reason taxonomy, sanction matrix, operating guide, escalation/on-call, suspected exploitation procedure, emergency/law-enforcement request procedure, illegal-content handling, appeals targets, and staffing coverage.
3. Finalize Stripe business/tax/refund/cancellation/support configuration. Obtain written ad-provider acceptance of the 16+ random-chat UGC category and verify CMP behavior. If approval is missing, launch without ads.
4. Run a small invite-only rehearsal with explicit capacity. Measure onboarding, queue liquidity by safe cohort/mode, WebRTC/TURN success, reconnect, report backlog/response, support load, retention jobs, deletion, billing, and operator alerts.
5. Fix rehearsal blockers and repeat the affected journeys. Do not treat low traffic as proof that concurrency, moderation, or recovery work passes.
6. Review every checklist below with linked evidence and named approver. Open registration only after all must-pass items are satisfied.

**Product must pass:**

- registration, verification, login/reset/logout, onboarding, profiles, privacy, and session revocation;
- isolated 16–17 and 18+ random text/video matching;
- report versus report-and-leave, immediate block, friends, history, messages, direct calls, mutes, and deletion;
- server-authorized premium/cosmetics and conversation-safe ads if enabled.

**Safety must pass:**

- no cross-cohort path; block and permanent matching ban work across reconnect/new devices;
- admin MFA/least privilege/audit; complete report-to-appeal flow;
- staffed moderation/escalation and published policies reviewed for launch regions.

**Engineering must pass:**

- full automated suites in production-like staging; no open critical/high security issue;
- documented socket/queue/message/Postgres/Redis/TURN capacity;
- successful backup restore, deploy rollback, migration, deletion, and incident rehearsals;
- alerts have accountable recipients; logs/bundles/analytics contain no secrets or message content;
- Safari, responsive, accessibility, camera/permission, and teardown matrices pass.

**Business/support must pass:**

- approved price/copy and Stripe operations; provider-approved advertising if enabled;
- correct regional/teen consent behavior; support, abuse, and appeals ownership;
- registration ceiling does not exceed infrastructure or moderation capacity.

**Done when:** the invite rehearsal is stable, every required gate links to evidence, accountable owners approve, and public registration is deliberately enabled rather than becoming public by default.

---

## 6. Cross-cutting implementation requirements

These checks apply to every relevant unit, even if not repeated in its steps.

### Authorization and privacy

- Never authorize from a client-supplied user ID, role, cohort, relationship, premium flag, call/match ownership, or visibility choice.
- Fetch the current actor from the validated token/socket binding and the current capability from server state.
- Every resource lookup must constrain by viewer authorization, not fetch globally and filter casually afterward.
- Collection endpoints use opaque cursor pagination with bounded limits.
- Return stable machine codes and non-revealing user messages.
- Data returned to a viewer comes through a purpose-specific projection, not raw ORM objects.

### Idempotency and concurrency

- Client mutations carry a request ID; high-risk HTTP mutations accept an idempotency key.
- Create friendships, accept requests, pair queues, send messages, apply billing events, and apply sanctions inside appropriate transactions/atomic Redis operations.
- Add uniqueness/check constraints as the final defense. Test simultaneous opposite actions, retries, and out-of-order delivery.
- Workers are safe to rerun and use leases/claiming so multiple instances cannot double-process work.

### Content and logging

- User messages/bios/notes are bounded Unicode text and rendered through text nodes/React escaping.
- No arbitrary HTML, CSS, SVG, script, URL scheme, or user-defined design tokens.
- Do not log access/refresh tokens, cookies, realtime tickets, email, birth date, phone, message body, report note, SDP, ICE, payment data, or raw secrets.
- Do not enable replay/analytics capture on call, message, report, auth, billing, or deletion surfaces without proven field-level redaction and policy approval.

### Realtime correctness

- The server owns all state transitions. Clients may display optimism but must reconcile duplicate/out-of-order events.
- Every peer-scoped event checks current match/call membership and state.
- A disconnect does not imply a new identity or automatic new match. A bounded lease decides restoration.
- Deployment drains stop accepting new queue/call work, publish retry guidance, and close safely.

### Database and retention

- Every table has deliberate foreign keys, uniqueness, checks, indexes, and deletion behavior.
- Soft deletion is used only for a documented recovery/moderation/referential need.
- Retention is a scheduled, monitored, tested job with an expiry field and restricted exception path.
- Migrations use expand-and-contract changes for production and include rollback or forward-fix notes.

### User experience and accessibility

- Every route has loading, empty, recoverable error, offline, forbidden, and destructive-action behavior as applicable.
- Safety controls stay visible and reachable in active interaction. Cosmetics/ads cannot obscure them.
- Keyboard, focus restoration, live announcements, contrast, reduced motion, target size, and mobile safe areas are release requirements.
- Camera/microphone are requested at feature intent, not page load, and every terminal path stops tracks.

## 7. Required test layers by feature

An agent must add the layers that apply to its unit:

1. **Pure unit tests:** cohort/visibility/entitlement/capability/retention/state-machine rules.
2. **Schema/contract tests:** valid and invalid HTTP/WebSocket/provider payloads and compatibility.
3. **Database tests:** migrations, constraints, transactions, races, indexes/query behavior, and cleanup.
4. **Redis/integration tests:** tickets, leases, queues, limits, reconnect, pub/sub, and failure recovery.
5. **Component tests:** interaction, focus, async states, errors, and privacy projection display.
6. **Browser tests:** full user journeys using two or more isolated browser contexts where relationships/realtime are involved.
7. **Security tests:** unauthenticated, wrong user, wrong role, stale relationship, forgery, replay, injection, and rate-limit bypass.
8. **Operational tests:** retention/deletion/reconciliation jobs, provider outage, graceful shutdown, metrics, and redaction.

Tests must assert negative behavior, not only the happy path. “The button is hidden” is never sufficient authorization coverage.

## 8. Definition of done for an individual agent chunk

A chunk is complete only when all of the following are true:

- the unit's prerequisite contracts/migrations exist and no hidden TODO is standing in for required behavior;
- server authorization, validation, stable errors, and privacy projection are implemented;
- UI includes meaningful pending, success, empty, failure, reconnect/offline, and accessibility behavior where applicable;
- relevant unit, integration, browser, security, and migration tests pass;
- root lint, typecheck, test, and affected builds pass;
- environment examples and documentation match actual code;
- no secrets, sensitive content, or personal data were introduced into logs, fixtures, screenshots, bundles, or Git history;
- the handoff identifies migrations, environment settings, rollout order, known limits, and exact verification results.

If a unit cannot meet these conditions because of an open legal/product/vendor decision, complete the safe foundation, keep the feature disabled by default, document the blocker and owner, and do not invent a production value.

---

## 9. Implementation progress and next-agent handoff

Last updated: July 12, 2026  
Completed scope: Units 0–15 (P0 and P1 complete)
Next scheduled unit: Unit 16 — Implement persistent friend messaging

### Important repository state

The repository had a clean tracked baseline before Unit 11A deployment work began. Treat every existing file as user-owned work, check Git status before editing, and preserve unrelated changes.

### Unit completion summary

| Unit  | Status   | Main evidence                                                                                                                                                                                                       |
| ----- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0     | Complete | `docs/architecture/prototype-baseline.md`, ADRs 0001–0007, `docs/architecture/open-decisions.md`, and prototype reference screenshots                                                                               |
| 1     | Complete | npm workspace skeleton, one-port Fastify/`ws` foundation, worker, Compose services, root development orchestration, and `docs/architecture/unit-01-foundation.md`                                                   |
| 2     | Complete | strict shared TypeScript, ESLint/Prettier, Vitest/Testing Library/Playwright, integration configuration, CI and security checks, and `docs/architecture/unit-02-quality-foundation.md`                              |
| 3     | Complete | shared UI tokens/primitives, routed React user/admin shells, responsive conversation safety states, tests, and `docs/architecture/unit-03-react-shells.md`                                                          |
| 4     | Complete | Zod transport contracts, validated server/client configuration, versioned WebSocket validation, local OpenAPI, client secret-bundle check, and `docs/architecture/unit-04-contracts-and-config.md`                  |
| 5     | Complete | Drizzle schema/migration, identity/profile repositories, account-state domain validation, field encryption, database integration tests, local migration/reset workflow, and `docs/architecture/unit-05-database.md` |
| 6–8   | Complete | Supabase identity, onboarding/profile/privacy, safe avatar pipeline, and `docs/architecture/unit-06-08-identity-profile-assets.md`                                                                                  |
| 9–11  | Complete | Authenticated Redis realtime, cohort-safe matching, random text/video/WebRTC loop, and `docs/architecture/unit-09-11-realtime-matching-webrtc.md`                                                                   |
| 11A   | Complete | Vercel frontend projects, Render backend Blueprint, exact HTTP/WebSocket origin policy, bounded maintenance mode, and `docs/architecture/unit-11a-deployment-foundation.md`                                         |
| 12–13 | Complete | Durable encounters/random text, metadata-only calls, retention/evidence worker, persistent cross-domain blocks, history/live-block UI, and `docs/architecture/unit-12-13-encounters-blocks.md`                      |
| 14–15 | Complete | Encounter-gated mutual friendships, request retention, mutes/counts, exact discovery, privacy projections, friend presence and complete P1 UI in `docs/architecture/unit-14-15-friends-discovery-presence.md`       |

### Current Unit 4 boundary

- `packages/contracts/src/index.ts` is the schema source for common UUIDs, timestamps, request IDs, idempotency keys, cursor metadata, stable error envelopes, account/cohort/visibility enums, health, account, onboarding, profile, session, and realtime-ticket shapes.
- Realtime protocol version 1 implements connection, match, RTC, and random-chat commands/events as discriminated schemas. Reserved future namespaces remain rejected rather than acting as an untyped catch-all.
- `parseClientRealtimeMessage` rejects malformed JSON, unsupported/unknown commands, malformed IDs, and payloads larger than 16 KiB. The API also rejects binary WebSocket messages.
- `packages/config/src/index.ts` separates server-only and Vite-public schemas. Non-production has explicit local placeholders so foundation tests can run; production receives no secret defaults and fails startup with variable names/reasons without echoing raw values.
- OpenAPI is generated from Fastify route schemas and served at `/documentation` only outside production when enabled. Production exposure remains disabled until an admin-authorized path exists.
- `scripts/check-client-secrets.mjs` checks both client production outputs for server-only variable names and configured secret values. The root build runs this check after building web and admin.
- Compatibility rule: additive fields must remain optional for older clients; removals, renames, semantic changes, or new required fields need a protocol version and coordinated deployment.

### Current Unit 5 boundary

- The committed migration is `packages/database/migrations/0001_identity_foundation.sql`, tracked by `packages/database/migrations/meta/_journal.json`.
- Initial tables are `users`, `profiles`, `profile_field_visibility`, `user_settings`, `privacy_settings`, `terms_acceptances`, and `user_sessions`.
- Internal IDs are database-generated UUIDs. `users.auth_subject` is the external Supabase subject and has an active-row partial unique index. Clients must never supply an internal user ID as identity proof.
- Usernames are normalized with trimmed NFKC plus lowercase and protected by a unique `normalized_username` index. The database constraint, rather than a prior availability check, is authoritative in races.
- Exact birth dates are encrypted using the `FieldEncryptor` abstraction and AES-256-GCM implementation in `packages/database/src/encryption.ts`. Ciphertext and key version are stored together with the derived cohort under a completeness check constraint.
- The normal identity repository projection deliberately excludes birth-date ciphertext and key metadata. Future onboarding/age reconciliation code must use a restricted purpose-specific path rather than widening public repository serialization.
- Account states and allowed transitions live in `packages/database/src/account-state.ts`. `IdentityRepository.setState` locks the current user row in a transaction and validates the transition before updating it.
- Production migrations are explicit and forward-only; neither API nor worker startup runs migrations. Browser roles receive no business-table grants. Storage RLS is intentionally deferred to Unit 8, when the avatar flow exists.

### Configuration and local setup

Use Node 22.12 or newer. Copy `.env.example` to `.env` for local overrides. New server configuration includes Postgres, Redis, Supabase issuer/JWKS/storage, birth-date key ID and 32-byte base64 key, TURN, Stripe, logging, deployment metadata, and OpenAPI control. Never use the checked-in local placeholders in production.

For a fresh local database:

```bash
npm install
npm run dev:services
npm run db:migrate
```

`npm run db:reset` destroys the local Compose volumes and then restarts Postgres and Redis; it refuses `NODE_ENV=production`. Run `npm run db:migrate` afterward. Do not use the reset command against shared data.

### Verification history

The following passed on July 11, 2026:

```text
npm run check             formatting, lint, all workspace typechecks/tests,
                          11 legacy tests, migration validation, secret scan
npm run test:integration  5 tests against local Postgres/Redis
npm run build             all packages/apps plus client secret-bundle check
npm audit --omit=dev      0 production vulnerabilities
```

Database integration coverage includes encrypted birth-date storage/public omission, completeness constraints, repository behavior, and a simultaneous normalized-username collision in which exactly one insert succeeds. Migration `0001` was also applied successfully to a brand-new temporary database; all seven expected public tables were inspected, and the temporary database was removed afterward.

The local Compose Postgres and Redis containers were healthy during verification. Their continued availability must not be assumed by a later agent; check them before integration work.

### Exact starting point for Unit 16

Unit 16 should implement persistent messages only inside the direct threads created by `FriendRepository`. Every send/read/delete operation must recheck an active friendship and `BlockRepository.hasEitherDirection`; unfriend and block deny new messages immediately. Do not reuse or promote random encounter threads.

Request counts currently return `unreadMessages: 0`; Unit 16 must replace that placeholder with server-calculated unread state. Existing direct threads intentionally survive unfriend for later retention/deletion policy, but remain inaccessible for new contact. Unit 20 must apply the persistent block adapter to sanctions.
