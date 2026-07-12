# Paramingle product and engineering plan

Status: working product plan  
Last updated: July 11, 2026  
Product line: **Meet strangers, keep the ones you like.**

## 1. What Paramingle is now

Paramingle is no longer an anonymous, disposable Omegle clone. It is an account-based social discovery platform where people can meet a random stranger, talk by text or video, and choose whether that person becomes part of their social circle.

The core loop is:

1. Create an account and complete the one-time safety onboarding.
2. Build a profile with user-controlled visibility.
3. Enter random matching for text or video.
4. Talk, skip, block, or report.
5. Send a friend request during the conversation or within the 48-hour encounter window.
6. If both people accept, continue through persistent messages and direct voice or video calls.

Accounts change the product in an important way. Sessions are no longer disposable, bans can follow an account, social connections can persist, and users can control who sees their profile. The product should still feel immediate. Account creation should be short, and random matching should remain one tap away after onboarding.

## 2. Product principles

These principles should be used when scope or design choices conflict:

- Fast to meet, deliberate to keep. Random matching is immediate; persistent contact requires consent.
- Identity without forced exposure. Every person has an account, but they choose which profile fields are visible.
- Safety is part of the matching system. It is not a report modal added after the fact.
- No nudity or sexual content. Paramingle is a 16+ social product, not an adult platform.
- Clear controls. People must be able to leave, skip, block, report, remove a friend, clear visible history, and delete their account without hunting through settings.
- Paid features improve choice and expression, not basic safety. Blocking, reporting, age-safe matching, and core privacy controls stay free.
- Ads never interrupt an active conversation. Revenue should not make the call room feel cheap or unsafe.
- Collect the least data needed for the feature, abuse prevention, and legal obligations.

## 3. Decisions locked for the first public beta

| Area                  | Beta decision                                                                            |
| --------------------- | ---------------------------------------------------------------------------------------- |
| Minimum age           | 16+                                                                                      |
| Accounts              | Required                                                                                 |
| Sign-in methods       | Email and password, plus Google                                                          |
| Email verification    | Required before random matching or messaging                                             |
| Phone verification    | Optional and risk-based, not required for every user                                     |
| Age notice            | One-time onboarding acceptance, not a checkbox before every call                         |
| Profile visibility    | Public or private account, plus per-field visibility                                     |
| Random matching       | Text and video modes                                                                     |
| Age safety            | 16–17 and 18+ users are placed in separate random-matching cohorts                       |
| Premium               | Filters, cosmetics, ad-free use, and selected convenience features                       |
| Friends               | Mutual friend requests, persistent direct messages, direct voice/video calls             |
| Encounter history     | Available for 48 hours, subject to blocks and privacy rules                              |
| Random chat text      | Retained for at most 48 hours for encounter history and report review, then deleted      |
| Video and audio       | Never recorded or stored by Paramingle                                                   |
| Friend messages       | Persistent until deletion under the beta retention policy                                |
| End-to-end encryption | Not in beta                                                                              |
| Reports               | Do not automatically end the conversation                                                |
| Blocks                | End contact and prevent future matching, requests, messages, and calls                   |
| Admin sanctions       | Matching suspension, feature restriction, temporary suspension, or permanent account ban |
| Notifications         | In-app unread state only; no push, email, or SMS notifications in beta                   |
| Monetization          | One premium subscription plus carefully placed ads for free users                        |
| Client                | Vite, React, and TypeScript                                                              |
| Launch                | Web-first, publicly accessible when the beta gate is passed                              |

### Why email verification should be required

The initial idea was to allow unverified email accounts. That would make account recovery unreliable and would weaken spam control, ban enforcement, and report investigation. The recommended beta rule is:

- Email/password accounts must verify their email before matching, messaging, or sending requests.
- Google sign-in counts as a verified identity for this purpose.
- An unverified account can finish its profile and resend its verification email, but cannot contact other users.
- Phone verification is reserved for suspicious activity, account recovery, appeals, selected trust features, or future higher-trust badges.

Phone verification should not be presented as proof of identity. Phone numbers can be recycled, shared, or obtained temporarily. It is a useful anti-abuse signal, not a guarantee about the person.

### Why the two age cohorts are required

A 16+ product can support both minors and adults, but unrestricted random adult-minor video matching creates a serious safety and moderation risk. For beta, random matching must keep users aged 16–17 separate from users aged 18 and older.

The exact date of birth is private. Other users see an age band only when the user allows it. Premium preferences can narrow matches inside the permitted cohort but can never bypass the cohort boundary.

This is a product recommendation, not legal advice. Before public launch, counsel should review age assurance, consent, privacy, advertising, and child-safety obligations for every launch region.

## 4. Beta scope

### Included

- Email/password registration, Google login, sign-out, password reset, and session management.
- One-time onboarding with date of birth, terms acceptance, community-guideline acceptance, and profile setup.
- Public and private profiles.
- Per-field visibility for bio, age band, interests, language, general region, online state, and recent activity.
- Username, display name, avatar, bio, interests, status, and a small beta cosmetic set.
- Random text matching and random video matching.
- Premium matching filters for language, broad region, and interests.
- Separate 16–17 and 18+ random matching.
- Skip, next, mute, camera, leave, report, and block.
- Friend requests during a conversation and for 48 hours after an encounter.
- Friends list, request inbox, unfriend, block, and mute.
- Persistent one-to-one direct messages between friends.
- Direct voice and video calls between friends.
- In-app unread counts and presence where the user permits it.
- Encounter history for the previous 48 hours.
- Friend message history and call metadata.
- Report intake, report evidence, moderation cases, sanctions, appeals, and audit logs.
- A separate admin application from the beginning.
- One premium subscription, Stripe checkout, billing portal, entitlements, and webhook handling.
- Ad-free premium accounts and restrained ads for free accounts.
- Privacy settings, session/device list, account export request, and account deletion.
- Responsive support for current Safari, Chrome, Edge, Firefox, and Chromium-based browsers.

### Explicitly deferred

- Native iOS and Android apps.
- Push, email, and SMS notifications.
- End-to-end encrypted messaging or calls.
- Group chats, group calls, servers, and communities.
- Followers as a separate relationship model.
- A cosmetic marketplace, trading, gifting, virtual currency, loot boxes, or creator economy.
- Detailed cosmetic progression and rarity systems.
- Automated face or government-ID age verification.
- Video recording, call replay, and stored video evidence.
- Public live streams.
- Advanced recommender systems.
- Multi-plan billing and family plans.
- Gender-based matching until the policy, safety, and privacy implications are reviewed.
- Fully automated moderation decisions for permanent sanctions.

## 5. Main user journeys

### Account creation and onboarding

1. User selects email/password or Google.
2. Email/password user verifies the email address.
3. User enters date of birth. The server derives an age cohort; the exact date is never shown publicly.
4. User accepts the terms and community guidelines once. The acceptance version and timestamp are stored.
5. User chooses a username, display name, avatar, and initial visibility.
6. User lands on the home screen with text chat and video chat as the main actions.

The onboarding should explain the no-nudity rule, the age cohort, and the consequences of abuse in short, direct language. A material policy update can require reacceptance at login. There is no repeated age checkbox before each match.

### Random matching

1. User chooses text or video.
2. If video is selected, camera and microphone are requested at this point, not on page load.
3. Client requests a match ticket from the API.
4. Server checks account state, age cohort, blocks, rate limits, current sessions, and entitlements.
5. The user enters a Redis-backed queue.
6. Matching applies hard safety exclusions, then paid filters, recent-pair exclusions, and wait-time scoring.
7. Both clients receive the same match and establish a WebRTC connection for media.
8. Text messages use the authenticated realtime channel and are retained under the random-chat policy.
9. Either person can skip, leave, block, report, or send a friend request.

Reports do not force the call to end. The report interface presents two clear actions: “Submit report” and “Submit and leave.” A block ends the interaction immediately because continued contact would conflict with the block.

### From stranger to friend

- A request can be sent during the conversation or from encounter history for up to 48 hours.
- A private profile does not prevent a request from a current or recent encounter, unless the user disables encounter requests.
- Requests are mutual-consent transitions. Until accepted, neither side gets friend messaging or direct-call access.
- If accepted, a one-to-one thread is created and both users appear in each other’s friends list.
- If rejected or expired, no persistent thread is created.
- Blocking either account cancels pending requests and removes contact access.

### Friend messaging and direct calls

- Friends can send direct messages, see read state, and make voice or video calls.
- Presence, online state, and activity are controlled by privacy preferences.
- Direct calls ring only inside the active web session in beta. There are no push notifications, so an offline person will see a missed-call record later.
- Unfriending closes new direct messaging and calls. Existing history follows the retention and deletion rules.
- Muting suppresses in-app attention without removing the friendship.

### Profile privacy

Each profile has an account-level setting:

- Public: discoverable by exact username and visible according to field permissions.
- Private: only the safe preview is shown to strangers; accepted friends receive the friend-level view.

Each field can be set to one of:

- Everyone
- Current and recent encounters
- Friends
- Only me

The random-call surface always needs a small safe identity card, even for private accounts. It can include username, avatar, age band, interests, and language only when the user permits those fields. Exact date of birth, email address, phone number, device details, moderation state, and payment data are never profile fields.

### Encounter history

Encounter history exists to let someone recover the connection they just made. It is not a permanent browsing trail.

- Keep encounter records for 48 hours.
- Show approximate time, mode, the other person’s permitted profile preview, friendship state, and report/block state.
- Allow a friend request or profile visit during the window.
- Keep random text messages for no more than the same 48-hour window, then delete them with a scheduled job.
- Never store video, audio, still frames, or screen captures as ordinary history.
- Hide an encounter immediately when either side blocks the other or when moderation requires it.
- Let a user hide an item from their own history without deleting internal abuse records that must be retained.

### Account deletion

Deletion should be a visible settings action with password or provider reauthentication.

1. Mark the account as deletion-pending and immediately disable matching and new contact.
2. Revoke active sessions and realtime tickets.
3. Remove the public profile and avatar access.
4. Delete or anonymize user data according to the retention schedule.
5. Preserve only legally required billing, fraud, safety, and audit records with restricted access and explicit expiry.

## 6. Data retention and privacy policy for beta

Retention must be implemented in code and scheduled jobs, not left as a policy document.

| Data                             | Beta retention                                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Exact date of birth              | Until account deletion, encrypted at the application layer; derive and separately store cohort              |
| Email and auth provider identity | Account lifetime plus provider/legal deletion period                                                        |
| Public profile                   | Account lifetime or until edited/deleted                                                                    |
| Random encounter metadata        | 48 hours for user access; limited abuse metadata may be retained longer when tied to a report               |
| Random text messages             | Maximum 48 hours, unless a minimal excerpt is preserved as report evidence                                  |
| Video/audio content              | Not stored                                                                                                  |
| Friend direct messages           | Stored until deletion policy applies; beta supports delete-for-me and a short delete-for-everyone window    |
| Direct and random call records   | Metadata only; 90 days by default, then aggregate statistics only                                           |
| Blocks                           | Until the user unblocks or either account is deleted, with safety exceptions                                |
| Rejected/expired requests        | 30 days for spam control, then delete or aggregate                                                          |
| Reports and sanctions            | Duration set by the safety policy; permanent-ban evidence requires a documented restricted retention period |
| Security logs                    | 30–90 days depending on sensitivity and purpose                                                             |
| Billing records                  | As required by Stripe, accounting, tax, and applicable law                                                  |
| Consent records                  | While the consent is relied upon, plus the required compliance period                                       |
| Admin audit records              | At least one year for beta, access restricted                                                               |

Friend-message auto-expiry needs deeper product work because a thread has two people with potentially different preferences. For beta, use simple deletion controls rather than pretending each person’s retention preference can independently erase the other person’s copy. A later disappearing-message mode should be agreed at thread level and clearly shown to both participants.

There is no end-to-end encryption in beta. Data must still use TLS in transit, managed encryption at rest, field-level encryption for sensitive values, short-lived credentials, and strict service access. Product copy must not imply that messages are invisible to Paramingle.

## 7. Moderation and trust model

### Community rules

The short rules shown during onboarding should prohibit:

- Nudity and sexual content.
- Sexual interaction involving anyone under 18.
- Grooming, coercion, exploitation, or requests to move minors into unsafe contexts.
- Harassment, threats, hateful conduct, and non-consensual sexual behavior.
- Sharing another person’s private information.
- Scams, impersonation, spam, and ban evasion.
- Recording or redistributing another person’s call without consent.

A longer policy should define examples, enforcement ranges, evidence handling, and appeals.

### User controls

- Report: sends a case to moderation and does not end the current interaction by itself.
- Report and leave: files the same report, then exits.
- Block: immediately ends contact and prevents future matching, profile access, requests, DMs, and calls.
- Mute: suppresses attention from an existing friend without blocking.
- Unfriend: removes mutual friend access without creating a safety sanction.

### Report evidence

The report form collects a reason, optional note, encounter/call/message identifiers, timestamps, and relevant technical metadata. It may attach a small text excerpt around a reported message. Raw message bodies should not be copied indiscriminately.

Paramingle should not ask users or browsers to silently capture call screenshots. Storing user-generated call imagery creates severe privacy and illegal-content handling risks. Video reports rely on account metadata, repeated-report patterns, network signals, user notes, and moderator decisions. A future evidence feature requires a separate legal and safety design.

### Sanctions

Moderators need granular actions:

- Warning.
- Temporary matching restriction.
- Permanent matching ban.
- Messaging or friend-request restriction.
- Temporary full suspension.
- Permanent full account ban.
- Avatar, bio, username, or cosmetic removal.
- Verification challenge.

The user requirement says a banned person is permanently removed from matching. The implementation should support permanent matching bans, but also support narrower and time-bound actions so admins are not forced to choose between doing nothing and deleting an account.

Permanent sanctions require a reason, moderator identity, timestamp, evidence references, and appeal state. Administrators can reverse a sanction, but the reversal is also audited.

### Admin application

The admin application is part of beta, not a later dashboard. It runs as a separate deployment with mandatory multifactor authentication.

Roles:

- Support: account lookup and non-sensitive support actions.
- Moderator: reports, content decisions, and predefined sanctions.
- Admin: policy configuration, moderator review, and account sanctions.
- Superadmin: role management and high-risk configuration.

Every privileged action writes an append-only audit event. Sensitive data is revealed only when the role and case purpose require it. Admins should not have a casual “view everything” screen. Account impersonation is deferred; if ever added, it must be consented, time-limited, visually obvious, and audited.

### Moderation work still required before beta

- Final reason taxonomy and sanction matrix.
- Moderator operating guide and escalation path.
- Underage-user and suspected-exploitation procedure.
- Emergency disclosure and law-enforcement request procedure.
- Appeals process and target response times.
- Coverage plan for a publicly accessible service.
- Policy and tooling for illegal-content reports without exposing staff unnecessarily.

## 8. Monetization plan

### Premium subscription

Start with one plan. The exact name and price can be decided after test data.

Recommended beta entitlements:

- Matching filters for language, broad region, and interests.
- Expanded profile cosmetics and saved loadouts.
- Ad-free use.
- Additional profile themes or effects that do not reduce readability.
- A small convenience allowance such as more saved cosmetic presets.

Premium must not include stronger blocking, better report priority, access across age cohorts, invisibility from moderation, or guaranteed matches. The server checks entitlements for every paid action. A client-side premium flag is never trusted.

Stripe Checkout handles purchase, the Customer Portal handles payment-method and cancellation management, and Stripe webhooks update a local subscription and entitlement ledger. Webhooks must be signed, idempotent, replay-safe, and the source of truth for access changes.

### Cosmetics

Beta cosmetics should stay narrow while the full Discord-like system is designed:

- Avatar frames.
- Profile card themes using approved flat-color tokens.
- Nameplate treatments.
- Status badges that are clearly cosmetic and never confused with verification.
- Call-room reactions or entrance effects that can be disabled for reduced motion.

All cosmetics are catalog items with an ownership record and an equipped loadout. This leaves room for subscription items, earned items, direct purchases, or events later without changing profile storage.

The beta should avoid random paid rewards, tradable items, and virtual currency. Those introduce additional policy, accounting, fraud, and age-related work before the underlying social product is proven.

### Ads

Ads are for free users, but never inside or over an active text or video conversation.

Allowed placements:

- Home or discovery screen.
- History screen between content sections.
- A frequency-capped placement after leaving a conversation, never before the leave action completes.

Not allowed:

- Over remote or local video.
- Inside message bubbles.
- During the matching animation.
- On report, block, safety, login, or account-deletion screens.
- Deceptive placements near call controls.

Use contextual or non-personalized advertising by default for 16–17 users. Regional consent must be captured through an approved consent-management platform before personalized advertising or applicable storage access. Store the consent version, region basis, timestamp, and choice. Premium users receive no ad requests.

The final ad network is still a decision. Before integration, confirm that the network accepts the product’s user-generated random-chat format and 16+ audience. The publisher account must be controlled by an adult or business entity that is eligible to contract with the provider.

## 9. Recommended technology stack

### Repository layout

Use an npm-workspaces monorepo so the existing `npm` workflow remains familiar:

```text
paramingle/
  apps/
    web/                 # Vite + React + TypeScript user app
    admin/               # Vite + React + TypeScript moderator app
    api/                 # Node.js + TypeScript API and realtime server
  packages/
    contracts/           # Zod schemas and shared event/API types
    database/            # Drizzle schema, migrations, and repositories
    ui/                  # shared tokens and accessible primitives
    config/              # lint, TypeScript, environment validation
  infra/
    render/              # service definitions and deployment notes
    turn/                # TURN configuration and runbooks
  tests/
    load/
    e2e/
  docs/
    product/
    safety/
    operations/
  plan.md
```

One root command should remain available:

```bash
npm install
npm run dev
```

The development command starts web, admin, API, and required local dependencies, with clear port output and port-collision errors.

### Web and admin clients

Recommended:

- Vite, React, and TypeScript.
- React Router for route and layout boundaries.
- TanStack Query for API cache, mutations, and invalidation.
- A small Zustand store for transient call, device, and dock state only.
- Zod schemas from the shared contracts package.
- CSS variables and component CSS for the existing Paramingle visual system.
- Vitest and Testing Library for component and behavior tests.
- Playwright for browser journeys.

React is the right move because the pivot adds authenticated layouts, profiles, settings, social state, admin workflows, billing, and many long-lived realtime states. The current hand-written DOM layer will become hard to reason about. Vite provides the development and production build setup without imposing a server-rendered framework that the realtime app does not currently need.

Close alternatives:

- Next.js: useful if public profile SEO becomes central. It adds server-rendering and deployment complexity that the beta does not need.
- Remix/React Router framework mode: strong for server-driven forms, but it does not remove the need for the realtime API.
- Vue: capable, but would add a new ecosystem without a product-specific advantage here.

### API and realtime server

Recommended:

- Node.js 22 and TypeScript.
- Fastify for HTTP routes, validation integration, plugins, and structured lifecycle hooks.
- `ws` for authenticated WebSocket signaling and realtime events.
- Shared Zod contracts at every external boundary.
- Pino structured logs with automatic secret and personal-data redaction.
- OpenAPI generated from route schemas for internal documentation.

Express is the closest alternative and would reduce short-term migration work from the prototype. Fastify is preferred because the new API has many authenticated modules and benefits from explicit schemas and plugin encapsulation. NestJS is an option for a larger team but is more framework than beta requires.

HTTP and WebSocket traffic should share one public server and one port. The realtime endpoint is `/ws`; deployment no longer needs a separate public port 8080. This also removes the port conflict that occurred during local development.

### Authentication and primary database

Recommended:

- Supabase Auth for email/password and Google OAuth.
- Managed Supabase Postgres as the system of record.
- Drizzle ORM and SQL migrations in the repository.
- Supabase Storage for processed avatars and cosmetic assets.

The web client uses Supabase only for authentication flows. Business data goes through the Paramingle API, which validates the JWT and applies domain rules. This prevents critical matching, friendship, billing, and moderation rules from being split between clients and database policies. Row-level security remains useful as defense in depth and for Storage access.

Drizzle keeps the schema close to SQL and makes constraints and indexes visible. Prisma is the closest alternative and has a mature client, but its abstraction and migration workflow are less direct for the queue, moderation, and retention work planned here.

Auth alternatives:

- Clerk: very polished account UI and device/session features, but it creates a separate identity vendor and can become expensive as active users grow.
- Auth0: mature enterprise controls, but heavier and typically more expensive for an early consumer beta.
- Fully custom auth: maximum control, but password reset, provider linking, session security, and incident handling are not good uses of beta engineering time.

### Redis

A managed Redis-compatible service is required before public beta, even if the API starts with one instance.

Use it for:

- Match queues and queue timestamps.
- Presence and connection ownership.
- Recent-pair exclusions.
- Match and call leases.
- Per-user, per-session, and per-IP rate limits.
- Short-lived realtime connection tickets.
- WebSocket pub/sub when more than one API instance is running.
- Idempotency and small temporary state.

Persistent user, friendship, message, report, billing, and sanction data belongs in Postgres, not Redis.

### WebRTC and TURN

- Keep WebRTC for peer media.
- Use browser-compatible STUN for development.
- Issue short-lived TURN credentials from the API for production.
- Start with a managed TURN service such as Twilio Network Traversal Service for operational simplicity.
- Keep a documented coturn option for cost control once traffic is predictable.

TURN credentials are never committed or placed permanently in the web bundle. The API obtains or signs temporary credentials for an authenticated, eligible user. Collect relay usage, connection success, and region metrics because TURN bandwidth may become a major operating cost.

### Payments, ads, and analytics

- Stripe Billing, Checkout, Customer Portal, and signed webhooks for premium.
- A consent-management platform and an approved ad network after policy review.
- Privacy-respecting product analytics with stable internal user IDs and no chat bodies.
- Sentry or an equivalent error tracker with replay disabled on call and message surfaces unless redaction is proven.
- OpenTelemetry-compatible traces and metrics for the API.

## 10. Service architecture

```text
Browser web app             Admin web app
       |                         |
       | HTTPS                   | HTTPS + MFA
       v                         v
              API + realtime service
        REST /v1             WebSocket /ws
             |        |          |        |
             v        v          v        v
         Postgres    Redis      Storage   TURN
             |
             v
        background jobs
    retention, email, billing, moderation
```

The API is divided by domain rather than transport:

- `auth`: JWT validation, onboarding, account state, sessions.
- `profiles`: profile data, visibility, avatars, cosmetics.
- `matching`: tickets, queues, eligibility, pairing, skips.
- `realtime`: authenticated connections, presence, event routing.
- `rtc`: offer, answer, ICE relay, call state, TURN credentials.
- `social`: friend requests, friendships, blocks, mutes.
- `messaging`: conversations, messages, read state, retention.
- `history`: encounters and call metadata.
- `moderation`: reports, evidence, cases, sanctions, appeals.
- `billing`: subscriptions, webhooks, entitlements.
- `ads`: consent state and placement eligibility, not ad rendering logic.
- `admin`: role-protected moderation and support endpoints.
- `jobs`: expiry, cleanup, webhooks, deletion, and reconciliation.

Background work can begin as a worker process using a Redis-backed job queue. It should be deployable separately from the API so expensive cleanup and webhook retries do not delay live calls.

## 11. Authentication and realtime security

Browser WebSockets cannot reliably attach a normal authorization header. Do not place a long-lived access token in the WebSocket URL.

Use this flow:

1. Authenticated client calls `POST /v1/realtime/tickets` with its access token.
2. API checks account state and creates a single-use random ticket in Redis.
3. Ticket expires in roughly 30 seconds.
4. Client connects to `/ws?ticket=...`.
5. Server consumes the ticket exactly once and binds the socket to the user and device session.
6. Normal heartbeat, reconnect, and session-revocation rules apply.

Every client command has a request ID. Commands that can charge money, create friendships, send messages, or change moderation state must be idempotent. The server never trusts client-supplied user IDs, premium flags, age cohorts, call ownership, or friendship state.

## 12. Core data model

The following is the starting schema, not a final column-by-column migration.

### Accounts and profiles

- `users`: auth identity, account state, private birth date, derived age cohort, locale, timestamps, deletion state.
- `profiles`: username, display name, bio, avatar asset, status, public/private mode.
- `profile_field_visibility`: field, audience, user.
- `user_settings`: matching, device, accessibility, message, and history preferences.
- `privacy_settings`: discoverability, encounter requests, presence, activity visibility.
- `terms_acceptances`: policy type, version, timestamp, source.
- `user_sessions`: device label, last seen, revocation state.

### Social graph

- `friend_requests`: requester, recipient, source encounter, state, timestamps, expiry.
- `friendships`: canonical pair, creation time, current state.
- `blocks`: blocker, blocked user, reason category, timestamps.
- `mutes`: muting user, muted friend, scope, expiry.

The database must prevent duplicate active requests and duplicate friendships. Pair keys should be canonical so `(A, B)` and `(B, A)` cannot exist as separate friendships.

### Matching and calls

- `encounters`: mode, match timestamps, completion reason, expiry.
- `encounter_participants`: encounter, user, connection result, friend-request eligibility.
- `calls`: random or direct type, state, start/end, connection result, no media body.
- `call_participants`: user, join/leave, media state summaries, diagnostic codes.
- `recent_pair_exclusions`: normally Redis; durable rows only when needed for abuse or analytics.

Live queue membership, socket ownership, and call leases stay in Redis. Postgres stores the durable encounter result, not every transient ICE event.

### Messaging

- `threads`: friend or random-encounter type, state, retention policy.
- `thread_members`: user, role, joined/left, read cursor, hidden state.
- `messages`: sender, server sequence, sanitized body, timestamps, deletion state, expiry.
- `message_reports`: relationship between a report and a minimal message window.

Message rendering always uses text nodes or a strict plain-text renderer. No user HTML is accepted. URLs can become links only through a controlled parser with safe protocols and attributes.

### Moderation

- `reports`: reporter, subject, encounter/call/message references, reason, note, state.
- `report_evidence`: typed metadata and small approved text excerpts.
- `moderation_cases`: assignment, priority, workflow state.
- `sanctions`: subject, type, scope, start/end, permanent flag, reason.
- `appeals`: sanction, statement, state, reviewer.
- `moderation_actions`: append-only action trail.
- `admin_roles` and `admin_audit_logs`: authorization and immutable audit history.

### Premium and cosmetics

- `billing_customers`: user to Stripe customer mapping.
- `subscriptions`: provider state, period, cancel state, webhook version.
- `entitlements`: server-readable current capabilities with source and expiry.
- `cosmetic_items`: catalog metadata and availability.
- `user_cosmetics`: ownership or granted access.
- `cosmetic_loadouts`: equipped items and version.
- `ad_consents`: region, consent string/version, timestamp, expiry.

All important tables need explicit foreign keys, uniqueness constraints, check constraints, appropriate partial indexes, and an auditable migration. Soft deletion is used only where recovery, moderation, or referential integrity requires it; it is not a substitute for actual retention deletion.

## 13. Matching design

The current prototype already has queue cleanup, skip requeue, heartbeat, recent-pair exclusion, and request limits. Those concepts remain useful, but matching must become account-aware and Redis-backed.

### Eligibility checks

Before queue entry:

- Account is active and onboarding is complete.
- Email or provider identity is verified.
- User is at least 16.
- Matching is not restricted by sanction.
- User is not already in a queue, match, or direct call.
- Requested mode is supported by the browser and current permissions.
- Rate limits permit the action.
- Premium filters correspond to active server-side entitlements.

### Pairing order

1. Hard exclusions: same user, age-cohort boundary, either-direction block, sanctions, incompatible mode, active relationship conflicts.
2. Recent-pair exclusion: avoid immediate rematches after a skip or disconnect.
3. Required paid filters: apply only those supported and allowed for the cohort.
4. Wait-time priority: older eligible queue entries gain priority.
5. Weighted random choice among a small best-fit set so the system does not become deterministic.

Filter relaxation happens only when the user explicitly permits it. Safety rules and blocks are never relaxed. Free users receive the default eligible random pool; premium users buy choice, not queue priority over free users.

### Match lease

Pairing creates a short server-side lease with a unique match ID. Both participants must acknowledge it. If one disappears before acknowledgement, the other is safely requeued without inheriting stale peer, RTC, chat, or request state. `next` closes the current match transactionally before creating the new queue entry.

### Rate limits

Use layered limits:

- Per socket for malformed or high-frequency events.
- Per authenticated user for matching, requests, reports, messages, and calls.
- Per device/session for reconnect abuse.
- Per IP/network range as a coarse signal, with care for shared networks.

Limits should return a retry time and never reveal private enforcement information. Redis-backed limits keep behavior consistent across API instances.

## 14. Realtime events and state machines

Shared contracts define all client and server events. Example namespaces:

- `connection.ready`, `connection.heartbeat`, `connection.revoked`
- `presence.changed`
- `match.join`, `match.queued`, `match.found`, `match.cancel`, `match.next`
- `rtc.offer`, `rtc.answer`, `rtc.ice`, `rtc.failed`
- `chat.send`, `chat.ack`, `chat.message`, `chat.read`
- `friend.request`, `friend.accept`, `friend.reject`, `friend.changed`
- `call.invite`, `call.accept`, `call.reject`, `call.end`
- `report.created`
- `error`

State transitions are server-authoritative.

### Account state

```text
pending_verification -> onboarding -> active
active -> limited | suspended | deletion_pending
limited -> active | suspended | banned
suspended -> active | banned
deletion_pending -> deleted
```

### Random session

```text
idle -> requesting_media -> queued -> matched -> connecting -> connected
queued -> cancelled
matched/connecting/connected -> leaving -> idle
matched/connecting/connected -> next -> queued
any live state -> reconnecting -> previous state | ended
```

### Direct call

```text
idle -> inviting -> ringing -> connecting -> connected -> ended
inviting/ringing -> declined | missed | cancelled
connecting/connected -> reconnecting -> connected | ended
```

### Friend request

```text
pending -> accepted | rejected | cancelled | expired | blocked
```

### Report

```text
submitted -> triaged -> reviewing -> actioned | closed | escalated
```

The client may show optimistic feedback, but it reconciles to server state and handles duplicate or out-of-order events.

## 15. API outline

All routes live under `/v1` and require authentication unless marked public.

### Account and profile

- `GET /me`
- `PATCH /me/settings`
- `POST /me/onboarding`
- `GET /me/sessions`
- `DELETE /me/sessions/:id`
- `POST /me/export`
- `DELETE /me`
- `GET /profiles/:username`
- `PATCH /profiles/me`
- `POST /profiles/me/avatar`
- `PATCH /profiles/me/visibility`

### Social and messaging

- `GET /friends`
- `GET /friend-requests`
- `POST /friend-requests`
- `POST /friend-requests/:id/accept`
- `POST /friend-requests/:id/reject`
- `DELETE /friends/:userId`
- `POST /blocks`
- `DELETE /blocks/:userId`
- `GET /threads`
- `GET /threads/:id/messages`
- `POST /threads/:id/messages`
- `DELETE /messages/:id`

### Matching, history, and calls

- `POST /matches/tickets`
- `DELETE /matches/current`
- `GET /encounters?window=48h`
- `DELETE /encounters/:id/view`
- `POST /calls/direct`
- `GET /calls/history`
- `POST /rtc/credentials`
- `POST /realtime/tickets`

### Reports and billing

- `POST /reports`
- `GET /reports/me`
- `POST /appeals`
- `POST /billing/checkout`
- `POST /billing/portal`
- `GET /billing/subscription`
- `POST /webhooks/stripe` (provider authenticated, not user authenticated)

### Admin

- Queue, assign, and resolve report cases.
- View the minimum required account and encounter context.
- Apply, revoke, and review sanctions.
- Review appeals.
- Manage approved cosmetic catalog entries.
- View service health and moderation metrics.
- Manage roles through high-assurance actions.

Every collection endpoint is cursor-paginated. Error responses use stable machine codes. Sensitive mutations support idempotency keys.

## 16. Interface and design direction after the pivot

The existing visual direction remains valid: near-black base, one saturated purple accent, flat colors, liquid-glass surfaces, heavy type, soft geometry, and quick tactile motion. The pivot changes the information architecture, not the brand.

Primary application areas:

- Public landing.
- Authentication and onboarding.
- Home and random match launcher.
- Matching and call room.
- Friends and requests.
- Direct-message thread and direct call.
- 48-hour encounter history.
- Own profile and other-user profile.
- Cosmetics and premium.
- Privacy, safety, devices, and account settings.
- Admin moderation workspace.

Mobile navigation should center the four most-used destinations: Home, Friends, Messages, and Profile. History can live from Home or Profile. The active call room temporarily replaces normal navigation and keeps leave, block, and report within thumb reach.

Cosmetics must operate through design tokens and approved slots. User choices cannot inject CSS, upload arbitrary HTML/SVG, reduce contrast below accessibility requirements, imitate staff badges, or hide safety controls.

## 17. Migration from the current prototype

The current build is a useful interaction prototype. It is not the foundation for storing account and social data without major changes.

### Keep or adapt

- The Paramingle visual tokens and overall brand direction.
- Camera and microphone permission timing.
- WebRTC peer-connection concepts and device teardown behavior.
- Heartbeat, reconnect, skip cleanup, and recent-pair exclusion concepts.
- Report reason UI patterns and plain-text sanitization.
- Existing queue and signaling tests as behavior references.

### Replace

- Vanilla DOM screen and component management with React and TypeScript.
- Anonymous session state with verified account identity.
- In-memory queue and rate limits with Redis.
- In-memory report logs with Postgres cases and admin workflows.
- Separate HTTP and WebSocket ports with one API service and `/ws`.
- Static `env.js` runtime assumptions with validated build/runtime configuration.
- Ephemeral peer chat model with explicit random and friend conversation types.

### Data migration

There is no production user data to migrate. Do not create compatibility layers for anonymous users. Archive the current prototype in a tag or branch, then migrate behavior in vertical slices with tests.

## 18. Delivery phases

There is no fixed launch date, so progress should be gated by capability and evidence rather than calendar promises.

### Phase 0: freeze the new contract

Deliverables:

- Approve this plan’s locked decisions.
- Write the beta community rules and first retention schedule.
- Define launch regions and begin legal review.
- Record the current prototype as a tagged baseline.
- Create architecture decision records for auth, database, Redis, hosting, and TURN.

Exit condition: product, safety, and engineering agree on age cohorts, verification, report behavior, history, and beta scope.

### Phase 1: repository and React foundation

Deliverables:

- Create the npm-workspaces monorepo.
- Add Vite React TypeScript web and admin applications.
- Add shared contracts, database, UI, and config packages.
- Port design tokens and core responsive shells.
- Add linting, formatting, type checks, unit tests, and CI.
- Make `npm run dev` start the full local stack without port ambiguity.

Exit condition: landing, auth shells, user app shell, and admin shell build and deploy to a private development environment.

### Phase 2: accounts, onboarding, and profiles

Deliverables:

- Supabase Auth with verified email/password and Google.
- One-time terms and guideline acceptance.
- Private birth date and server-derived age cohort.
- Username reservation and profile editor.
- Public/private profile setting and per-field visibility.
- Avatar upload pipeline with type, size, malware, and image-reprocessing checks.
- Session/device management and initial account deletion flow.

Exit condition: an authenticated user can safely create, edit, view, and delete an account in staging; restricted accounts cannot bypass checks through the API.

### Phase 3: account-aware random matching

Deliverables:

- Redis queue, presence, recent-pair exclusions, and rate limiting.
- Authenticated realtime ticket exchange.
- Random text and video queues.
- Strict age-cohort separation.
- WebRTC signaling, reconnect, heartbeat, TURN credentials, and clean teardown.
- Skip/next without stale state.
- Match and call state machines reflected in React UI.
- Durable encounter metadata and 48-hour cleanup.

Exit condition: browser and network test matrix passes; no known cross-cohort, block, stale-session, or duplicate-match path exists.

### Phase 4: social graph and history

Deliverables:

- Friend requests during and after a conversation.
- Request acceptance, rejection, cancellation, and expiry.
- Friends list, unfriend, block, and mute.
- Encounter history with its 48-hour window.
- Privacy-aware profile cards and exact-username discovery.
- In-app unread and request counts.

Exit condition: all relationship transitions are idempotent, block-safe, privacy-safe, and covered by concurrency tests.

### Phase 5: persistent messaging and direct calls

Deliverables:

- Friend message threads, delivery acknowledgment, read state, and pagination.
- Plain-text sanitization and safe link handling.
- Direct voice/video invitations, ringing, missed records, and teardown.
- Presence preferences and offline behavior.
- Message deletion controls and retention jobs.

Exit condition: message delivery is ordered and recoverable across reconnects, direct calls respect friendship/block state, and no message bodies enter application logs.

### Phase 6: moderation and admin

Deliverables:

- Report intake with controlled evidence excerpts.
- Admin case queue, assignment, actions, sanctions, and appeals.
- Mandatory admin MFA and role-based authorization.
- Append-only admin audit logs.
- Permanent matching ban and full-ban enforcement across HTTP and realtime.
- Safety operations guide and escalation runbooks.

Exit condition: a test report can be investigated end to end; sanctions take effect on existing and new sessions; every admin read and action is authorized and auditable.

### Phase 7: premium, cosmetics, and ads

Deliverables:

- Stripe subscription, webhook reconciliation, portal, and entitlements.
- Language, broad-region, and interest filters.
- Initial cosmetic catalog, ownership, loadout, and safe rendering.
- Ad consent state and approved placements for free users.
- Ad-free premium enforcement.
- Billing support and refund/cancellation runbook.

Exit condition: webhook and billing failure tests pass, entitlements cannot be forged, and ads never render on active conversation or safety surfaces.

### Phase 8: hardening and public beta gate

Deliverables:

- Threat model and independent security review.
- Load and soak tests for queues, WebSockets, messaging, and TURN.
- Database backup restore rehearsal.
- Browser/device and accessibility pass.
- Moderation staffing and incident rotation.
- Privacy policy, terms, community guidelines, cookie/consent handling, and account deletion verified in production-like staging.
- Production observability, alerts, status page, and incident templates.
- Small invite-only operational rehearsal before enabling public registration.

Exit condition: every item in the launch checklist is evidenced, not merely marked complete.

## 19. Testing strategy

### Automated tests

- Unit tests for visibility, cohorts, entitlements, retention, sanction checks, and state machines.
- Database tests for constraints, concurrent friend requests, block races, message ordering, and migrations.
- Contract tests for every HTTP and WebSocket schema.
- Integration tests with Postgres and Redis for match leases, reconnect, skip, expiry, and bans.
- Browser tests for onboarding, permissions denied, text fallback, matching, friends, DMs, reports, billing, and deletion.
- WebRTC tests between separate browser contexts and, before launch, real devices on different networks.
- Admin authorization tests for every role and action.
- Stripe webhook replay, reordering, duplication, and failure tests.
- Accessibility tests plus keyboard and screen-reader checks on critical journeys.

### Security tests

- Authentication and session fixation.
- Username and profile enumeration.
- IDOR/BOLA checks on profiles, threads, reports, calls, and admin routes.
- Cross-site scripting through messages, names, bios, cosmetics, and links.
- WebSocket authorization after reconnect and sanction.
- Rate-limit evasion and queue abuse.
- File upload validation and image decompression limits.
- OAuth redirect and account-linking attacks.
- Payment webhook forgery.
- Secret scanning and dependency review.

### Load tests

No credible peak concurrency target exists yet. First establish and publish baselines:

- Maximum connected sockets per API instance at acceptable latency.
- Queue matching latency at several concurrency levels.
- Message throughput and acknowledgment latency.
- Redis behavior during instance failure and resubscription.
- Reconnect storm behavior after a deployment.
- TURN relay percentage, bandwidth per call, and cost per call-hour.
- Postgres connection and write pressure from messages and presence-adjacent events.

Set the public-beta capacity limit from these results. Do not quietly accept unlimited signups when operational limits are unknown.

## 20. Hosting and deployment

### Recommended beta topology

- User web app: Render static site or another CDN-backed static host.
- Admin web app: separate private deployment and hostname.
- API/realtime: Render web service in Singapore initially, sharing one HTTP/WebSocket port.
- Database/Auth/Storage: Supabase managed project in the closest suitable region.
- Redis: managed Redis-compatible service in the same region as the API.
- TURN: managed global TURN service initially.
- Billing: Stripe.
- DNS and TLS: managed provider with `app`, `api`, `admin`, and auth subdomains.

Render is a reasonable first host because it supports long-lived WebSocket connections, health checks, managed TLS, and Singapore deployment. Once the API has multiple instances, Redis pub/sub and connection ownership route realtime messages to the correct socket. Deployments will disconnect some sockets, so the client’s exponential reconnect and server-side match leases are required operational features.

Close alternatives:

- Fly.io: stronger control over regional placement and long-running services, with more operations work.
- AWS ECS/Fargate: best long-term infrastructure control, but premature for a small beta team.
- Railway: convenient development experience, but production limits and regional needs must be checked against measured load.

### Environments

- Local: local Postgres and Redis containers, Supabase local stack where practical, test Stripe keys, mock ad provider.
- Staging: separate auth, database, storage, Redis, billing test mode, and hostname. Never shares production personal data.
- Production: protected credentials, reviewed migrations, backups, alerts, and restricted admin access.

Secrets are stored in the host’s secret manager. Client environment variables contain only intentionally public values. Production migrations run as an explicit deployment step, use expand-and-contract changes, and include rollback or forward-fix instructions.

### Deployment flow

1. Pull request runs lint, type checks, unit, integration, migration, and build checks.
2. Merge deploys to staging.
3. Automated smoke tests run against staging.
4. Production deploy requires approval while the team is small.
5. API health and realtime connection metrics are watched during rollout.
6. Use gradual rollout or rapid rollback for high-risk server changes.

## 21. Operations and maintenance

### Monitoring

Track service health without putting private content in telemetry:

- Registration, verification, and onboarding completion.
- WebSocket connections, reconnects, heartbeat expiry, and connection duration.
- Queue size by safe cohort and mode.
- Median and high-percentile match wait time.
- Match acknowledgment and WebRTC connection success.
- ICE failure, TURN relay usage, reconnect recovery, and call duration.
- Message send, acknowledgment, delivery, and failure counts.
- Friend request acceptance, rejection, expiry, block, and report rates.
- Report backlog age and moderator action time.
- Subscription webhook delay and entitlement mismatch.
- Retention/deletion job lag.
- API latency, error rate, Postgres health, Redis health, and job queue depth.

Logs use internal IDs and event types. Do not log access tokens, cookies, email addresses, dates of birth, message bodies, report notes, SDP payloads, ICE candidates, or payment details.

### Health checks

- Liveness confirms the process event loop and HTTP server respond.
- Readiness confirms required Postgres and Redis access and that the instance can accept new work.
- Realtime metrics confirm heartbeat processing and pub/sub subscription.
- A synthetic test account checks login, ticket creation, and a controlled matching path in staging.

### Backups and recovery

- Managed daily database backups plus point-in-time recovery if the provider tier supports it.
- Storage versioning or recovery for approved assets.
- Quarterly restore rehearsal at first, moving to monthly as usage grows.
- Written recovery-time and recovery-point targets before public beta.
- Exportable audit and billing reconciliation data.

### Regular maintenance

- Weekly dependency and security update review.
- Monthly access review for admins and service accounts.
- Monthly moderation-policy review using aggregate trends.
- Quarterly restore, incident, and credential-rotation exercises.
- Retention job reports reviewed automatically and on failure.
- Capacity review before campaigns, press, or opening a new region.

### Incident runbooks required

- Authentication provider outage.
- Database unavailable or read-only.
- Redis failure and queue recovery.
- WebSocket reconnect storm.
- TURN outage or unexpected bandwidth bill.
- Spam or coordinated abuse wave.
- Suspected underage or exploitation incident.
- Compromised admin account.
- Personal-data exposure.
- Stripe webhook outage or entitlement mismatch.
- Ad or consent-provider policy incident.

## 22. Public beta launch checklist

### Product

- Account creation, verification, login, reset, logout, and session revocation work.
- One-time 16+ onboarding and policy acceptance are present.
- Public/private profiles and every visibility setting behave as described.
- Random text and video work on the supported browser matrix.
- 16–17 and 18+ matching are demonstrably isolated.
- Friend requests work during a conversation and within 48 hours afterward.
- Friends, DMs, direct calls, history, blocks, and mutes work.
- Premium filters and cosmetics are server-authorized.
- Ads stay off active conversation and safety surfaces.
- Account deletion and privacy controls are usable.

### Safety and moderation

- Report does not end the call unless the user chooses to leave.
- Block immediately prevents all continued contact.
- Permanent matching bans terminate current eligibility and survive reconnects.
- Admin roles require MFA and obey least privilege.
- Reports, evidence access, sanctions, reversals, and appeals are audited.
- Moderator coverage and escalation ownership exist.
- Community guidelines, terms, privacy policy, and retention schedule are published.
- Launch-region legal review is complete.

### Engineering

- No known critical or high-severity security issue is open.
- Automated suites pass against a production-like environment.
- WebSocket, WebRTC, Redis, Postgres, and TURN load baselines are documented.
- Backups have been restored successfully in a rehearsal.
- Deploy, rollback, migration, and incident runbooks have been exercised.
- Alerts reach an accountable person.
- No secrets or personal message content appear in client bundles, logs, or analytics.
- Safari camera, autoplay, permission, and CSS behavior are explicitly tested.
- Responsive and accessibility checks pass on mobile and desktop.

### Business and support

- Stripe business, tax, refund, cancellation, and support settings are complete.
- Ad provider has approved the product category and audience.
- Consent handling is correct for launch regions and age cohorts.
- Premium price and entitlement copy are final.
- Support inbox, abuse intake, appeal intake, and response ownership exist.
- Public capacity and registration controls match measured limits.

## 23. Main risks and mitigations

| Risk                                        | Mitigation                                                                                               |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Adult-minor random interaction              | Separate 16–17 and 18+ cohorts, private DOB, legal review, strong reporting and sanctions                |
| Ban evasion                                 | Verified email/provider, risk-based phone challenge, device/session signals, rate limits, admin review   |
| Public beta outgrows moderation             | Invite rehearsal, capacity controls, report queue metrics, staffing gate before public registration      |
| Random video abuse without recordings       | Fast block/report, repeat-signal analysis, account enforcement, clear policy, trained moderation         |
| Ads conflict with a 16+ UGC product         | Provider approval, consent platform, teen treatment, contextual defaults, no in-call ads                 |
| History creates stalking risk               | 48-hour limit, visibility controls, hide on block, no global encounter browsing                          |
| Persistent messages increase privacy burden | Clear retention, deletion jobs, no content logs, access controls, E2E kept as an explicit future project |
| WebRTC fails behind restrictive NAT         | Managed TURN, short-lived credentials, device/network tests, relay monitoring                            |
| TURN and realtime costs are unknown         | Cost per call-hour metric, caps, load tests, managed-first then coturn evaluation                        |
| Filters reduce match liquidity              | Limited beta filters, wait-time UI, opt-in relaxation, measure queue size by cohort                      |
| Paid cosmetics imitate trust signals        | Reserved staff/verification namespace and catalog validation                                             |
| No push notifications hurts friend calls    | Clear in-app presence and missed-call behavior; notifications remain a measured follow-up                |
| Cold-start network effects                  | Quiet invite rehearsal, controlled cohort opening, honest wait estimates, text mode fallback             |

## 24. Decisions still open

These do not stop engineering foundations, but each needs an owner and decision record before its feature ships.

| Decision                         | Recommended starting point                                                                   |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| Launch countries                 | Start in one or a small set of legally reviewed regions near the chosen infrastructure       |
| Premium price                    | Test one monthly plan; do not add annual until cancellation and value are understood         |
| Final premium name               | Keep it plain during beta; branding can follow validated benefits                            |
| Cosmetic economy                 | Subscription catalog plus a few earned items; no currency or trading                         |
| Ad network                       | Choose only after written acceptance of 16+ random-chat UGC                                  |
| Consent provider                 | Use a Google-certified CMP if Google ads are selected                                        |
| Phone challenges                 | Trigger on risk, recovery, appeals, or repeated abuse; do not require universally            |
| Friend-message expiry            | Persistent in beta with deletion controls; design mutual disappearing messages later         |
| Exact direct-call history period | Start at 90 days and confirm through privacy review                                          |
| Gender filters                   | Exclude from beta until policy, safety, and data-handling review                             |
| Profile discovery                | Exact username search only at beta; no broad people recommendation feed                      |
| Capacity ceiling                 | Set from load tests and moderator coverage, not guesses                                      |
| E2E encryption                   | Separate v2 architecture project covering identity keys, multi-device, reports, and recovery |

## 25. Immediate next actions

1. Approve or amend the locked decisions in sections 3 and 4, especially email verification, age-cohort separation, and random-message retention.
2. Archive the current anonymous prototype as a tagged baseline.
3. Create the React/TypeScript monorepo and port the design system without changing the existing server yet.
4. Set up development Supabase and Redis projects, then implement verified auth and onboarding.
5. Write the initial community guidelines, retention policy, and moderation reason taxonomy alongside the account work.
6. Replace anonymous signaling with authenticated realtime tickets and Redis-backed matching.
7. Build the admin shell before reports begin entering the new database.
8. Run an invite-only operational rehearsal before any public announcement or open registration.

## 26. Reference documentation

These sources support the current technical recommendations. Product and legal decisions still need review for the actual launch regions.

- [Vite guide and React TypeScript templates](https://vite.dev/guide/)
- [Supabase Auth overview](https://supabase.com/docs/guides/auth)
- [Supabase password authentication](https://supabase.com/docs/guides/auth/passwords)
- [Supabase Google login](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase password security](https://supabase.com/docs/guides/auth/password-security)
- [Supabase phone MFA](https://supabase.com/docs/guides/auth/auth-mfa/phone)
- [Stripe subscription lifecycle](https://docs.stripe.com/billing/subscriptions/overview)
- [Render WebSocket hosting](https://render.com/docs/websocket)
- [Render web services and public ports](https://render.com/docs/web-services)
- [Render health checks](https://render.com/docs/health-checks)
- [Render regions](https://render.com/docs/regions)
- [Twilio Network Traversal Service](https://www.twilio.com/docs/stun-turn)
- [coturn TURN server](https://github.com/coturn/coturn)
- [Google consent requirements for ads](https://support.google.com/adsense/answer/7670013?hl=en)
- [Google tag for child- and teen-directed treatment](https://support.google.com/adsense/answer/17042704?hl=en)
- [Google AdSense publisher age requirement](https://support.google.com/adsense/answer/14230?hl=en)
