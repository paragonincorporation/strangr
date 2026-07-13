# Paramingle V1 completion and V2 execution plan

| Field              | Current value                                                                 |
| ------------------ | ----------------------------------------------------------------------------- |
| Status             | Authoritative product and execution plan                                      |
| Last updated       | July 13, 2026                                                                 |
| Current position   | V1 agent implementation is complete; human acceptance and launch work remains |
| Next product track | Finish and accept V1; do not start V2 until the V1 completion gate passes     |

## 1. What this file is for

This file answers four questions:

1. What is locked for V1?
2. What is actually complete?
3. What still blocks the V1 beta?
4. What is the step-by-step V2 sequence after V1 is finished?

Use these files together:

- `mvp-plan.md`: product contract, engineering sequence, and progress ledger.
- `human-v1.md`: the ordered H1-H19 human launch runbook.
- `docs/architecture/`: implementation decisions and system boundaries.
- `docs/operations/`: deployment, load, monitoring, and rehearsal instructions.
- `README.md`: local setup and command reference.

`plan.md` and `implementation-plan.md` are historical design records. They contain earlier 16+ and single-plan assumptions that no longer describe the V1 beta. When they conflict with this file, this file wins.

### Rules for agents

Before changing code:

1. Read the relevant section here and inspect the current implementation.
2. Run `git status --short`. Preserve unrelated work.
3. Keep the change to one plan chunk or a tightly related set of chunks.
4. Add tests with the implementation.
5. Add a new forward migration for schema changes. Never rewrite an applied migration.
6. Do not implement V2 until the V1 completion gate in section 5 passes.
7. Run focused checks while working and `npm run check` before handoff.
8. Update only the progress table and short change log. Do not add another long agent diary.

Agents must not invent legal, safety, tax, provider, staffing, or launch approval. They must not weaken age checks, blocks, reports, sanctions, privacy, or billing authority to make a feature easier.

### Status labels

- `complete`: implemented and locally verified; no work remains inside the stated scope.
- `agent_complete`: code is complete, but human/provider acceptance remains.
- `in_progress`: active work exists and is not ready for handoff.
- `blocked`: a required decision, credential, provider, or earlier gate is missing.
- `not_started`: no implementation has begun.
- `not_applicable`: a named human approver documented why the item does not apply.

## 2. Locked V1 contract

V1 tests whether verified adults enjoy random conversations enough to return. It is not a progression game yet.

### Audience and availability

- V1 is 18+ and English-only.
- Accounts and verified email or verified Google identity are required.
- Date of birth is collected once, encrypted, and converted to server-owned adult eligibility.
- Registration, matching, and billing are separate server-controlled country switches.
- Every country starts disabled. Countries open only after legal, payment, safety, support, and capacity approval.
- Expansion is country by country. There is no global enable switch.

### Core conversation loop

1. Register, verify, accept current policies, and complete onboarding.
2. Choose text or video and save allowed preferences.
3. Enter authenticated matching.
4. Talk, use plain-text in-call chat, optionally reveal a safe card, or leave.
5. Report or block at any time.
6. After 120 server-measured connected seconds, submit one immutable Like or Dislike.
7. Optionally become friends, then use direct messages and calls.
8. Return to matching or end the session.

### Timing and identity rules

- Text Next unlocks after 25 connected seconds. The server owns the timestamp.
- Leave, Block, Report, and Report and leave are never delayed.
- Video Next remains immediate.
- Ratings unlock at 120 connected seconds and close 24 hours after the encounter ends.
- Free, Lite, and Loaded start anonymous and may reveal their own safe card.
- Maxed Out automatically sees the other participant's documented safe card after connection.
- A safe card may contain avatar, username, display name, country, language, interests, and reveal source.
- It never contains exact birth date, email, bio, device history, moderation data, billing data, or internal records.

### V1 plans

| Plan      | Monthly USD | Active V1 rights                                                                                                                   |
| --------- | ----------: | ---------------------------------------------------------------------------------------------------------------------------------- |
| Free      |          $0 | Text/video matching, country/language/interests preferences, profiles, reports, blocks, friends, direct messages, and direct calls |
| Lite      |          $3 | Free rights, gender preference, and online-status display                                                                          |
| Loaded    |          $9 | Lite rights, premium media target, reconnect, profile cosmetics, and supporter badge                                               |
| Maxed Out |         $19 | Loaded rights, capped queue priority, safe-card override, early-access flag, and direct support route                              |

Paid rights never bypass blocks, sanctions, country controls, compatibility, privacy, or safety. Stripe webhook state controls entitlements; browser redirects do not.

ParamPoints, XP, levels, quests, streak rewards, daily plan grants, reputation, and ads are not active V1 benefits. Product copy must call them V2 work.

### V1 safety and privacy rules

- Paramingle prohibits harassment, nudity, sexual behavior, hate, spam, scams, fake-camera abuse, and underage use.
- Paramingle does not record or store call audio/video.
- Reporting does not leave the conversation unless the user chooses Report and leave.
- Blocking ends current contact and prevents future matching, profile access, requests, messages, calls, reveals, and reconnect.
- Automated detection may create a reviewable signal. It may not issue a permanent sanction by itself.
- Analytics must not contain message bodies, media, exact birth dates, tokens, private profile fields, or moderation evidence.

## 3. Architecture that V1 uses and V2 must preserve

Current production shape:

- `apps/web`: public React/Vite client on Vercel.
- `apps/admin`: separate AAL2-protected admin client on Vercel.
- `apps/api`: Fastify HTTP, `/ws`, and the maintenance worker on Render.
- `packages/contracts`: Zod HTTP and realtime contracts.
- `packages/database`: Drizzle schema, repositories, encryption, and migrations.
- `packages/config`: validated browser/server configuration.
- `packages/ui`: accessible shared components.
- Supabase: Auth, PostgreSQL, avatar storage, and private export storage.
- Redis: queues, leases, cooldowns, rate limits, and presence.
- Browser WebRTC with managed TURN fallback.
- Stripe Checkout, Billing Portal, and signed webhooks.

System invariants:

1. PostgreSQL owns durable money, XP, points, rewards, moderation, ratings, and entitlements.
2. Redis owns short-lived realtime state. Redis loss must not destroy a financial or progression record.
3. The server decides eligibility, duration, cooldowns, matching rights, rewards, plan rights, and profile visibility.
4. Every retryable write has an idempotency key or database uniqueness rule.
5. Ledgers are append-only. Corrections use reversal rows.
6. A displayed balance or level must be rebuildable from authoritative transactions.
7. API startup never runs migrations.
8. Browsers never receive server secrets or authoritative reward amounts.
9. Logs do not contain tokens, raw Stripe payloads, exact birth dates, messages, media, SDP, ICE candidates, or private evidence.
10. Breaking realtime changes require a new protocol version.

## 4. Current V1 position

### Verification baseline

On July 13, 2026:

- `npm run check` passed.
- All workspaces built.
- 73 current and legacy unit/API/UI/contract tests passed.
- 11 migrations validated.
- Secret scans and built-client secret scans passed.
- Eight Chromium desktop/mobile E2E cases passed.

The local machine did not have PostgreSQL, Redis, or a working Docker daemon. Service-backed integration tests must run in CI and again in approved staging. This is a launch requirement, not an optional cleanup item.

### V1 task ledger

| Task | Scope                                    | Agent status   | Remaining human or external work                                                        |
| ---: | ---------------------------------------- | -------------- | --------------------------------------------------------------------------------------- |
|    0 | Live inventory                           | complete       | Recheck affected boundaries before each release                                         |
|    1 | Accountable owners                       | blocked        | H1 assigns primary and backup owners                                                    |
|    2 | Countries and policies                   | agent_complete | H2 legal/country/policy approval                                                        |
|    3 | Environments and CI                      | agent_complete | H3 creates and secures provider environments                                            |
|    4 | Adult-only onboarding                    | agent_complete | H4 stages boundary and real-service tests                                               |
|    5 | Matching preferences                     | agent_complete | H5 stages symmetric filter tests                                                        |
|    6 | Text cooldown                            | agent_complete | H6 runs Redis and cross-instance validation                                             |
|    7 | Ratings                                  | agent_complete | H7 approves copy and staging behavior                                                   |
|    8 | Safe-card reveal                         | agent_complete | H8 approves disclosure and leakage checks                                               |
|    9 | Reconnect                                | agent_complete | H9 approves lifetime/copy and stages revocation cases                                   |
|   10 | Media quality                            | agent_complete | H10 selects TURN and tests real devices/networks                                        |
|   11 | Stripe billing                           | agent_complete | H11 obtains approval, configures IDs/tax, and runs sandbox lifecycle                    |
|   12 | Entitlements and priority                | agent_complete | H11 approves grace/priority and stages revocation/fairness                              |
|   13 | Premium UI                               | agent_complete | H11 approves catalog and enables paid rows only after testing                           |
|   14 | Moderation operations                    | agent_complete | H12 approves policy, staffs, trains, and rehearses                                      |
|   15 | Anti-bot and spam                        | agent_complete | H13 configures Turnstile and approves thresholds                                        |
|   16 | Visual NSFW/fake-camera signals          | blocked        | H14 either approves disabled V1 behavior or selects a model for implementation          |
|   17 | Privacy operations                       | agent_complete | H15 approves retention, export, deletion, and legal-hold treatment                      |
|   18 | Observability and cost controls          | agent_complete | H16 selects providers, alerts, budgets, and named recipients                            |
|   19 | Security/accessibility/browser hardening | agent_complete | H17 commissions independent reviews and closes critical/high findings                   |
|   20 | Integration, E2E, and load               | agent_complete | H18 runs staging load/device/provider work and approves ceilings                        |
|   21 | Deploy and rehearse                      | agent_complete | H19 configures production, restores backups, rehearses incidents, and runs launch gates |

### Important V1 implementation facts

- Launch countries deny by default and split registration, matching, and billing.
- DOB is encrypted and write-once.
- Cooldown, rating eligibility, reveals, reconnect, quality policy, and queue priority are server-authoritative.
- Blocking revokes random/direct contact, Redis leases, safe-card access, and reconnect paths.
- Billing uses signed raw-body webhooks, idempotent event storage, reconciliation, and stale-event revocation protection.
- Paid catalog rows remain inactive until H11.
- Privacy exports use a separate private bucket; deletion has recent-reauthentication and cancellation handling.
- Global and country socket ceilings are enforced before ticket issuance and have an honest beta-full UI.
- Render automatic deploys are off. The protected workflow runs checks, integration/E2E gates, migrations, reviewed-SHA API/worker deployment, exact-revision readiness, client deployment, and smoke checks in order.

### V1 gates

Gate A, internal alpha, requires:

- automated checks and service-backed integration passing;
- two real devices matching by text and video;
- forced TURN success;
- cooldown, reveal, rating, report, block, and reconnect validation;
- all-plan Stripe sandbox provisioning and revocation;
- active sanction revocation;
- no production user data.

Gate B, closed beta, requires:

- production infrastructure and successful restore;
- approved policies, trained moderators, support, and on-call;
- Stripe/tax approval;
- no open critical/high independent-review finding;
- an invite-only observation period inside approved safety, cost, uptime, and quality limits.

Gate C, first country-limited public beta, requires:

- registration limited to approved countries;
- active capacity ceilings and kill switches;
- named owners for on-call, support, appeals, billing, privacy, and moderation;
- no severity-one incident;
- queue, connection, report, TURN cost, support, and moderation metrics inside launch thresholds.

Gate D is later country expansion. Each country repeats legal, privacy, payment, tax, safety, staging, low-ceiling production, and observation checks.

### V1 final acceptance checklist

- [ ] Adults can register, verify, onboard, export data, and delete accounts.
- [ ] Under-18 users cannot enter a communication flow.
- [ ] Text and video matching work across networks and API instances.
- [ ] TURN fallback works in production-like conditions.
- [ ] Text Next stays locked for 25 connected seconds while safety exits remain immediate.
- [ ] Rating unlocks at 120 connected seconds and cannot be forged, changed, or duplicated.
- [ ] Blocking revokes every communication, discovery, reveal, and reconnect path.
- [ ] Reports reach the approved staffed moderation workflow.
- [ ] Sanctions revoke active and future capabilities.
- [ ] Free, Lite, and Loaded remain anonymous until self-reveal.
- [ ] Maxed Out sees only the documented safe card.
- [ ] All plan lifecycle and failure paths provision and revoke correctly.
- [ ] Free users remain matchable under paid priority.
- [ ] Premium media degrades safely.
- [ ] Retention, export, deletion, backup, and restore work.
- [ ] Monitoring reaches a named person.
- [ ] No critical or high security defect remains open.
- [ ] Legal, safety, business, product, and engineering owners approve launch.
- [ ] Production capacity stays below infrastructure and staffed safety/support ceilings.

The human sequence for completing these items is in `human-v1.md`.

## 5. Finish V1 before starting V2

V1 and V2 will be developed one after the other. There is no parallel V2 lane, no `v2-development` branch, and no later reintegration task.

### Work sequence from now

1. Staff complete `human-v1.md` in order.
2. Codex agents fix every defect found during that work in the current codebase.
3. Staff retest each fix and rerun any affected gate.
4. The team completes Gates A, B, and C and the V1 final acceptance checklist.
5. The named owners record V1 approval and the first country-limited public-beta release date.
6. The team observes the release for the period chosen in H1. Any failed threshold returns the work to step 2.
7. When the V1 completion gate below passes, commit and tag the accepted V1 baseline.
8. Start V2 task V2-N0 on `main` from that baseline.

### V1 completion gate

V2 may start only when every statement below is true:

- H1-H19 are `complete` or formally approved `not_applicable` where the runbook allows it.
- Gates A, B, and C have passed.
- Every V1 final-acceptance checkbox in section 4 is checked.
- Every defect found during human testing has been fixed and retested.
- No severity-one incident or critical/high security issue is open.
- The country-limited beta has completed its approved observation period inside the written safety, quality, support, reliability, billing, and cost limits.
- Product, safety, legal/privacy, billing, and engineering have recorded dated approval.
- The accepted source revision is committed, tagged, reproducible, and deployed through the protected release workflow.

### Main-codebase rule

After the completion gate passes, V2 is implemented directly in the normal codebase:

1. Update local `main` from the accepted remote `main`.
2. Confirm the V1 tag and required checks are present.
3. Implement one numbered V2 task at a time.
4. Add migrations, tests, documentation, flags, and rollback controls required by that task.
5. Run the focused tests and the full repository check before marking the task complete.
6. Commit the reviewed task normally. Continue to the next task only after its dependencies pass.

There is no V2 branch-setup or reintegration task. Use the same review and commit workflow used for V1, with `main` as the single continuing product history. Agents must never merge, deploy, enable a live feature, or change a provider account unless the assigned task and human approval explicitly authorize it.

### Current Codex handoff: V1 only

Until the V1 completion gate passes, Codex agents must work only on V1 validation findings and V1 release support:

1. Read the staff finding and identify the affected H-task, gate, acceptance item, and code boundary.
2. Reproduce the failure with the smallest reliable test. Inspect logs without copying secrets or private user data.
3. Fix the root cause without weakening age, safety, privacy, billing, authorization, launch-country, or capacity controls.
4. Add or update an automated regression test.
5. Run focused checks, then `npm run check`. Run service-backed integration, E2E, load, or real-device checks when the defect touches those boundaries.
6. Give staff exact retest steps and expected results.
7. Update the V1 progress ledger and `human-v1.md` only when the finding changes the remaining human work.
8. Leave human approval boxes unchecked. Staff or the named owner records those results after retesting.

If a request asks an agent to start V2 before the completion gate, the agent must stop and report which V1 conditions are still open.

## 6. Locked V2 boundaries

V2 adds progression and a broader cosmetic economy after V1 proves the conversation loop.

Planned V2 capabilities:

- ParamPoints with an immutable transaction ledger;
- XP with a versioned level curve through level 50;
- explainable reputation and recovery work;
- daily/weekly quests and streaks;
- carefully controlled invite rewards;
- daily subscription grants;
- temporary Maxed Out max-level presentation without permanent XP minting;
- expanded cosmetics, ownership, loadouts, and spending;
- ads only after written provider approval and a separate rollout gate.

Non-negotiable rules:

1. V1 likes/dislikes do not retroactively mint live rewards without an approved replay policy.
2. Reward inputs come from server-confirmed events, never client claims.
3. One source event produces at most one reward transaction.
4. Reversals reference original transactions. Rows are never edited to hide a correction.
5. Farming controls use minimum duration, distinct counterpart, daily caps, and collusion checks.
6. Paid plans may add cosmetics and grants but may not buy harassment power, moderation priority, safety bypasses, or forced contact.
7. Reputation never uses inferred protected characteristics.
8. Reputation starts as a shadow score. It does not automatically ban or publicly shame users.
9. Start with earning modifiers and recovery tasks. Daily XP decay is out of scope until a later explicit decision.
10. Ads are last. They never load on matching, text/video/direct calls, messages, reporting, blocking, onboarding policy, billing interruption, or deletion surfaces.

### V2 dependency map

```text
V1 completion gate
└── V2-N0 start from accepted main
    ├── V2-N1 rollout controls ────────────────────────────────┐
    ├── V2-N2 immutable ledgers ── V2-N3 ledger service ──────┼── V2-N10 diagnostics/tests
    │                              ├── V2-N4 level curve       │
    │                              ├── V2-N7 quests/streaks ───┤
    │                              └── V2-N8 plan grants ──────┤
    ├── V2-N5 progression events ── V2-N6 reputation shadow ──┤
    │                              └── V2-N7 quests/streaks ───┤
    └── V2-N9 cosmetic ownership ──────────────────────────────┘

V2-N1 through V2-N10 complete
└── V2-P0 foundation acceptance
    └── V2-P1 real shadow events
        └── V2-P2 economy approval
            └── V2-P3 live points/XP/levels
                ├── V2-P4 quests/streaks
                ├── V2-P5 subscription grants
                ├── V2-P7 cosmetic spending
                └── V2-P8 invite rewards

V2-N6 shadow evidence + policy/appeal approval ── V2-P6 reputation effects
Written provider + legal/privacy approval ─────── V2-P9 optional ads
Approved P3-P9 feature set ────────────────────── V2-P10 V2 acceptance
```

## 7. V2 foundation tasks after V1 completion

Do not start this section before the V1 completion gate in section 5 passes. Work through these tasks in the normal codebase, starting from accepted `main`. New behavior defaults off and uses synthetic data unless a task says otherwise.

### V2-N0: start V2 from the accepted V1 baseline

Goal: begin V2 from the exact V1 revision that passed human acceptance.

Steps:

1. Confirm the V1 completion gate in section 5 is signed and dated.
2. Confirm the accepted revision is merged into remote `main` and has an immutable V1 release tag.
3. Pull the accepted `main` into a clean working tree.
4. Run `npm run check`, `npm run build`, and `npm run test:e2e`.
5. Run the PostgreSQL/Redis integration suite in CI or an approved service-backed environment.
6. Confirm production is running the recorded V1 revision and the release evidence is stored.
7. Record the V1 tag and starting SHA in the progress table.
8. Mark V2-N0 complete. Start V2-N1 and V2-N2 only after this point.

Verify:

- Local and remote `main` point to the accepted V1 history.
- The V1 tag resolves to the recorded acceptance SHA.
- Clean-checkout automated and service-backed tests pass.
- No V2 migration, flag, worker, API, or UI has been added before this task.

Done when: the accepted V1 release is reproducible and `main` is ready for the first V2 change.

### V2-N1: define disabled rollout and shadow-mode controls

Goal: give every V2 subsystem a server-owned off switch before it exists.

Steps:

1. Define stable flag keys for economy shadowing, live economy, reputation shadowing, quests, subscription grants, cosmetics, invite rewards, and ads.
2. Add an additive `feature_flags` table with environment, key, enabled state, rollout percentage, optional country/cohort constraints, version, reason, and timestamps.
3. Add an append-only flag-change audit table.
4. Build one server service that resolves flags. Do not let browsers decide eligibility.
5. Default every V2 flag to disabled when a row is missing or malformed.
6. Add a short cache with explicit invalidation. A stale cache may delay enablement but must not delay a kill switch beyond the approved bound.
7. Add AAL2 admin read-only diagnostics. Write controls may exist only if they create an audit row and fail closed.
8. Add environment safety: ads and live reward minting cannot turn on in production without separate prerequisite records.

Verify:

- Missing database and Redis/cache states resolve to disabled.
- A browser cannot forge a flag.
- Country, plan, account, or percentage rollout is deterministic for a user.
- Every change records actor, old state, new state, reason, and time.
- Kill-switch tests disable each subsystem.

Done when: V2 code can be present without becoming user-visible or minting value.

### V2-N2: add immutable ParamPoint and XP schemas

Goal: create durable ledgers before reward rules are written.

Steps:

1. Add a migration for `parampoint_transactions` and `xp_transactions`.
2. Give each row user ID, signed amount, source type, source ID, idempotency key, occurrence time, creation time, rule version, and optional reversal reference.
3. Use integer units. Do not use floating point for balances.
4. Add uniqueness for `(ledger, idempotency_key)` and the approved source identity.
5. Add checks that amount is non-zero and a reversal cannot reference itself.
6. Require reversal rows to belong to the same user and ledger as the original.
7. Add rebuildable `progression_summaries` for cached point balance, lifetime XP, level projection, version, and rebuild time.
8. Do not store an authoritative mutable balance on the user/profile row.
9. Add indexes for user timeline, source lookup, reversal lookup, and bounded rebuild jobs.
10. Document retention: financial-like reward ledgers are not deleted as casual analytics; deletion/anonymization policy needs H15/V2 legal approval before live use.

Verify:

- Duplicate retries create one row.
- Concurrent different events both apply.
- Update/delete paths are absent from the application repository.
- Invalid amount and cross-user reversal fail.
- Rebuilding a summary from transactions returns the same result repeatedly.

Done when: additive migrations and database integration tests prove an append-only, replayable ledger.

### V2-N3: build the ledger service and reversal engine

Goal: provide one safe server API for all future rewards.

Depends on: V2-N2.

Steps:

1. Create typed reward source and rule-version contracts.
2. Implement `applyTransaction` inside a database transaction.
3. Accept a server-created source record, not a client-supplied amount.
4. Return the existing transaction on an idempotent retry.
5. Implement `reverseTransaction` as one new negative/positive compensating row, depending on the original.
6. Prevent double reversal with a unique constraint.
7. Rebuild and compare summaries in a bounded worker job.
8. Record safe mismatch diagnostics without usernames, message content, or private event payloads.
9. Add a dry-run repair command that reports intended changes but writes nothing.
10. Keep HTTP reward-minting endpoints out of scope.

Verify:

- Retry, race, reversal race, worker retry, and stale-summary tests.
- Property tests over mixed grants/reversals keep the rebuilt total deterministic.
- A malformed or unsupported source type grants nothing.
- Ledger errors cannot partially update the summary.

Done when: synthetic callers can apply and reverse rewards exactly once, with no public route and no live flag.

### V2-N4: create the versioned level-curve engine

Goal: calculate levels without hard-coded client math.

Depends on: V2-N2 and V2-N3.

Steps:

1. Add `level_curve_versions` and `level_curve_steps` for levels 1-50.
2. Store minimum lifetime XP for each level and validate strictly increasing thresholds.
3. Allow one draft version and one active version per environment.
4. Build a pure projection function returning level, XP into level, XP to next level, and curve version.
5. Build a bounded summary rebuild for a new curve version.
6. Model Maxed Out's temporary max-level presentation separately from earned level.
7. Ensure plan cancellation reveals the earned level immediately and does not write negative XP.
8. Keep draft thresholds synthetic. Final tuning happens in V2-P2 after shadow evidence exists.

Verify:

- Exact threshold, below-threshold, above-level-50, zero, and large-integer tests.
- Invalid or non-monotonic curves cannot activate.
- Switching curve version rebuilds projections without changing XP transactions.
- Temporary Maxed presentation never changes ledger totals.

Done when: every level display can name its curve version and be rebuilt from lifetime XP.

### V2-N5: define server-confirmed progression events

Goal: create a stable input boundary without wiring rewards into V1 hot paths yet.

Steps:

1. Define versioned event types such as eligible conversation completed, rating submitted, friendship accepted, confirmed moderation outcome, subscription period started, and quest progress.
2. Add `progression_events` with source type/ID, subject user, occurrence time, schema version, processing state, and deduplication key.
3. Keep payloads minimal. Do not copy messages, reports, profile text, or media into progression storage.
4. Add a consumer checkpoint or per-rule processing record so a new rule version can replay safely.
5. Build fixture producers and replay tools using synthetic encounters/subscriptions.
6. Define which events may later be reversed and which moderation outcome triggers that reversal.
7. Do not hook these producers into live repositories until V2-P0 approves real shadow processing.

Verify:

- Duplicate source events collapse to one canonical event.
- Schema-version mismatch fails closed.
- Replay is bounded, resumable, and idempotent.
- Logs and fixtures contain no prohibited fields.

Done when: reward engines can consume synthetic authoritative events without reading V1 tables ad hoc.

### V2-N6: build reputation shadow foundations

Goal: make reputation explainable and testable before it affects a person.

Depends on: V2-N5.

Steps:

1. Add versioned `reputation_models`, `reputation_events`, and rebuildable `reputation_summaries`.
2. Limit inputs to approved server outcomes: eligible ratings, confirmed reports, overturned reports, blocks, account age, and detected collusion.
3. Keep raw user text and protected characteristics out of the model.
4. Add minimum sample sizes and confidence state. A score without enough data is `insufficient_data`.
5. Add caps so one peer or coordinated group cannot dominate a score.
6. Model recovery through time and approved tasks. Do not add daily XP decay.
7. Produce reason codes suitable for later user explanations.
8. Keep the score hidden and unable to change matching, sanctions, rewards, or profile display.

Verify:

- Sparse data, brigading, mutual-rating rings, overturned reports, recovery, and model-version replay.
- The same input set produces the same score and reason codes.
- Removing an invalidated event rebuilds through a compensating event, not history editing.

Done when: synthetic shadow scores are reproducible, explainable, and powerless.

### V2-N7: build quest and streak foundations

Goal: model quests without choosing live reward amounts.

Depends on: V2-N3 and V2-N5.

Steps:

1. Add versioned quest definitions with objective type, target, reset period, eligibility, start/end, and disabled reward reference.
2. Add quest assignments, progress records, claims, and expiry.
3. Make assignment deterministic and auditable.
4. Count server-confirmed events only.
5. Add rule fields for minimum conversation duration, distinct counterpart count, daily cap, and excluded sanctioned/blocked encounters.
6. Add one idempotent progress update per source event.
7. Add one idempotent claim record. Keep reward minting disconnected.
8. Model streak timezone and missed-day behavior explicitly; use a user setting only after product approval.
9. Provide synthetic daily/weekly definitions for tests, not product defaults.

Verify:

- Reset boundary, timezone, expiry, duplicate event, duplicate claim, distinct-peer, block/report, and replay cases.
- Progress never comes from a browser-supplied counter.
- A disabled or expired quest cannot claim.

Done when: fixtures can assign, progress, complete, expire, and claim a zero-value quest exactly once.

### V2-N8: build subscription-grant foundations

Goal: prepare daily plan grants without changing Stripe or live entitlements.

Depends on: V2-N3 and the existing V1 billing projection.

Steps:

1. Add versioned grant rules keyed by stable plan key and period.
2. Add `subscription_grant_periods` with user, subscription, plan, period date, rule version, and idempotency key.
3. Calculate eligibility from server subscription state at the approved cutoff.
4. Define cancellation, upgrade, downgrade, past-due grace, refund, dispute, and missed-worker behavior.
5. Build a dry-run worker against fake subscription fixtures.
6. Have the worker call the shared ledger service only through a disabled adapter.
7. Keep Maxed Out temporary level presentation separate from daily grants.
8. Do not add or change Stripe webhook behavior in this chunk.

Verify:

- Duplicate worker run, delayed run, upgrade day, downgrade day, cancellation, refund, dispute, grace expiry, and timezone boundary.
- One user/plan/period produces at most one grant record.
- Ineligible fixtures produce no ledger transaction.

Done when: dry-run output is deterministic and no live subscription can mint a reward.

### V2-N9: build safe cosmetic ownership foundations

Goal: prepare a larger cosmetic catalog without creating a store.

Steps:

1. Add `cosmetic_items`, `user_cosmetics`, and `cosmetic_loadouts` if the final schema does not already exist.
2. Support approved slots only: avatar frame, profile theme tokens, nameplate, cosmetic badge, and reduced-motion-safe call effect.
3. Reserve staff, moderator, safety, and verification visual namespaces. Paid items cannot imitate them.
4. Store asset references from an approved processed-asset pipeline. Never render arbitrary HTML, CSS, SVG, script, or remote code.
5. Track ownership source, source ID, validity, revocation, and catalog version.
6. Make loadout changes versioned and idempotent.
7. Build a server projection that returns only owned, active, compatible items.
8. Keep catalog management read-only and hidden. No purchase/spend route yet.

Verify:

- Ownership expiry/revocation, unowned equip, conflicting slots, unsafe asset type, reserved badge, reduced motion, and XSS payloads.
- Block/report/call controls remain visible with every test cosmetic.

Done when: synthetic grants can equip safe cosmetics without money, points, or public UI.

### V2-N10: add shadow diagnostics and foundation tests

Goal: give engineers a safe way to inspect V2 foundations before integration.

Depends on: V2-N1 through V2-N9.

Steps:

1. Add AAL2 admin diagnostics for flags, ledger counts, rebuild mismatch counts, event lag, model version, quest processing, and grant dry runs.
2. Show internal IDs and aggregate counts only. Do not expose private event payloads.
3. Add bounded rebuild/replay commands with `--dry-run`, limit, cursor, and explicit environment output.
4. Add metrics for duplicate suppression, processing failure, replay lag, rebuild mismatch, and kill-switch state.
5. Add database integration tests for every new constraint and race.
6. Add a V2 foundation test script suitable for CI.
7. Write short operator notes for clearing synthetic data and stopping a runaway worker.
8. Keep all production flags disabled.

Verify:

- Unauthorized/non-AAL2 users cannot access diagnostics.
- Dry runs write nothing.
- Bounded jobs resume after failure.
- The V1 test suite remains unchanged and passing.

Done when: the full disabled V2 foundation can be inspected and tested without affecting a V1 account.

## 8. V2 integration and rollout tasks

Start this section after V2-N1 through V2-N10 are complete. Continue in the same normal codebase. A V1 regression blocks the affected V2 task until it is fixed and retested.

### V2-P0: accept the disabled V2 foundation

Goal: prove the V2 foundation is safe before processing real progression events.

Steps:

1. Confirm V2-N1 through V2-N10 are complete and reviewed on `main`.
2. Confirm migration ordering from the V1 tag through the current revision without rewriting applied migrations.
3. Run the full clean-checkout check, PostgreSQL/Redis integration suite, E2E suite, and builds.
4. Deploy the current revision to staging with every V2 flag off.
5. Run Gate A's real-device text/video and forced-TURN regression.
6. Test auth, billing, matching, moderation, privacy, worker, and realtime behavior against the accepted V1 result.
7. Run ledger rebuilds, bounded dry runs, authorization tests, and kill-switch tests using synthetic data.
8. Confirm no V2 balance, level, quest, reputation effect, cosmetic grant, invite reward, or ad is visible to a V1 user.
9. Record engineering, safety, privacy, and operations approval for real shadow processing.

Done when: the disabled foundation passes its tests, V1 behavior is unchanged, and real shadow processing is approved.

### V2-P1: wire real progression events in shadow mode

Goal: observe real eligible events without minting points or XP.

Depends on: V2-P0 and V2-N5.

Steps:

1. Approve the minimal event list with product, safety, privacy, and engineering.
2. Wire event creation into durable server-confirmed boundaries.
3. Prefer a transactional outbox where event loss would break correctness.
4. Make progression failure non-destructive to the underlying V1 action while alerting on lag/loss.
5. Turn on economy/reputation shadow flags for staff accounts only.
6. Compare source table counts with progression event counts.
7. Replay a bounded window and prove it creates no duplicate processing records.
8. Expand shadow observation to a small beta cohort after privacy approval.

Verify:

- Conversation/rating/friend/subscription source reconciliation.
- Blocked, sanctioned, short, duplicate, and ineligible encounters do not become eligible reward events.
- Shadow processing adds no user-visible balance, level, quest, or reputation.

Done when: event completeness and duplicate rates stay within approved thresholds for the observation period.

### V2-P2: calibrate the economy and approve reward rules

Goal: choose amounts from measured behavior instead of guesses.

Depends on: V2-P1 observation data.

Steps:

1. Measure eligible events per active user/day and distribution by cohort, plan, country, and account age.
2. Simulate candidate ParamPoint and XP rules against shadow events.
3. Calculate expected daily/monthly issuance, level speed, quest completion, and subscription share.
4. Run abuse simulations for pair farming, account rings, rapid reconnect, rating exchange, and invite fraud.
5. Choose daily caps, distinct-peer rules, minimum durations, reversal rules, and support boundaries.
6. Approve the level curve through level 50.
7. Approve what points can buy and whether a balance may go negative after reversal.
8. Obtain product, safety, finance, support, privacy, and engineering sign-off on a versioned rule set.
9. Publish plain user explanations before live rollout.

Done when: one immutable rule version and rollback threshold set has written approval.

### V2-P3: launch ParamPoints, XP, and levels to a small cohort

Goal: expose the first live progression loop without quests or ads.

Depends on: V2-P2.

Steps:

1. Activate the approved curve and reward rule version in staging.
2. Run source-to-ledger, reversal, rebuild, and plan-cancellation acceptance tests.
3. Add authenticated APIs for the user's own balance, XP, level, and recent safe transaction descriptions.
4. Add profile/progression UI with loading, empty, error, and reduced-motion states.
5. Never return another user's private transaction history.
6. Enable live minting for staff, then an invited percentage cohort in one approved country.
7. Compare live issuance with shadow prediction every day.
8. Stop minting through the kill switch if mismatch, farming, support load, or retention thresholds fail.
9. Reconcile and repair through reversal/replay tools, never manual balance edits.

Done when: the cohort completes the approved observation period with correct ledgers, acceptable abuse, and no V1 regression.

### V2-P4: launch quests and streaks

Goal: add structured goals after the base ledger is trusted.

Depends on: V2-P3.

Steps:

1. Approve a small first catalog of daily and weekly quests.
2. Avoid goals that reward excessive skipping, mass messaging, reporting, or unsafe contact.
3. Attach approved reward references to versioned definitions.
4. Add user APIs for assignments, progress, expiry, and claim.
5. Add accessible UI with timezone/reset explanation.
6. Enable one quest type for staff and verify server-only progress.
7. Roll out to a small cohort and monitor completion distribution, farming, conversation quality, reports, and retention.
8. Add streaks only after reset/missed-day support cases are understood.
9. Reverse rewards for invalidated source events using the ledger service.

Done when: quests improve the approved outcome without increasing low-quality conversations or abuse.

### V2-P5: launch subscription grants and Maxed presentation

Goal: turn approved V2 plan benefits on without weakening billing authority.

Depends on: V2-P3 and H11's stable live billing evidence.

Steps:

1. Approve daily grant amounts, cutoff/timezone, missed-worker behavior, grace behavior, and plan-change rules.
2. Approve Maxed Out's temporary level presentation copy.
3. Activate grant rules in Stripe test mode and run the complete lifecycle matrix.
4. Confirm webhook replay/out-of-order events cannot duplicate grants.
5. Confirm refunds/disputes/cancellation apply approved future-grant and reversal policy.
6. Enable staff accounts, then a small paid cohort.
7. Reconcile grant periods against subscription periods daily.
8. Confirm loss of Maxed Out reveals earned level without changing XP.
9. Update the premium page only after the benefits are live.

Done when: every plan transition produces the approved grant exactly once and user copy matches reality.

### V2-P6: introduce reputation effects and recovery

Goal: use reputation carefully without turning it into an opaque punishment score.

Depends on: a stable V2-N6 shadow observation and approved moderation/appeal operations.

Steps:

1. Review model outcomes for bias, sparse data, brigading, and country/cohort differences.
2. Approve minimum samples, explanation codes, recovery tasks, appeal/review path, and retention.
3. Start with earning modifiers or access to positive recovery tasks.
4. Do not use reputation for permanent sanctions or paid queue priority.
5. Add a private user explanation that avoids exposing reporter identity or anti-abuse thresholds.
6. Give support/moderation the minimum diagnostics needed to review disputes.
7. Roll out to a small cohort with a control group.
8. Monitor false positives, appeal overturns, safety outcomes, reward issuance, and retention.
9. Disable effects while preserving shadow calculation if thresholds fail.

Done when: independent review finds the effects explainable, appealable, and acceptably fair.

### V2-P7: launch the cosmetic catalog and point spending

Goal: provide a safe use for ParamPoints after issuance is stable.

Depends on: V2-P3 and V2-N9.

Steps:

1. Approve initial items, prices, availability, expiry, refund rules, and reserved visual namespaces.
2. Add an immutable spend transaction linked to cosmetic ownership creation in one database transaction.
3. Make purchase idempotent and reject insufficient balance server-side.
4. Define reversal/refund behavior without deleting ownership history.
5. Add catalog, owned-items, purchase, and loadout APIs.
6. Add accessible preview and reduced-motion behavior.
7. Security-test asset processing, CSS/token bounds, XSS, IDOR, price forgery, and concurrent purchase.
8. Enable a small non-paid catalog cohort first.
9. Monitor support/refund load and whether cosmetics obscure safety controls.

Done when: spend, ownership, refund, and loadout records reconcile and every item renders safely.

### V2-P8: add invite rewards only after fraud/legal approval

Goal: reward legitimate referrals without creating spam or account farming.

Depends on: V2-P3, approved country/privacy terms, and anti-abuse capacity.

Steps:

1. Obtain product, legal/privacy, safety, support, and fraud approval.
2. Define a qualified referral using verified adult accounts and meaningful activation, not signup alone.
3. Add referral codes/tokens with expiry, one attribution, and no contact-list upload.
4. Add device/network/payment abuse signals using privacy-approved coarse data.
5. Delay reward until the qualification window completes.
6. Cap rewards by inviter, invitee, device/network risk, and time period.
7. Add reversal for fraud or deleted qualification events.
8. Add clear user terms and an appeal/support route.
9. Roll out to staff and a very small country cohort.

Done when: measured legitimate acquisition value exceeds fraud, support, reward, and moderation cost.

### V2-P9: evaluate and, if approved, integrate ads

Goal: add optional ad revenue without placing ads inside private conversations or safety work.

Depends on: written ad-provider acceptance, legal/privacy approval, consent tooling, and stable V2 core metrics.

Steps:

1. Give candidate providers the exact 18+ random text/video UGC product description and planned placements.
2. Obtain written acceptance. If no provider accepts, mark ads `not_applicable` and ship V2 without them.
3. Approve countries, consent basis, age treatment, data fields, retention, and opt-out/revocation behavior.
4. Create a server-owned placement eligibility matrix.
5. Deny ads on matching, active/recent conversation, direct messages/calls, report, block, auth, policy, billing interruption, and deletion surfaces.
6. Ensure ad-free plans make no ad request; hiding a loaded ad is insufficient.
7. Add frequency caps across tabs/sessions and a global provider kill switch.
8. Reserve accessible layout space and label ads clearly.
9. Keep profile, match, message, safety, and sensitive identifiers out of provider requests.
10. Start with ordinary approved placements. Rewarded ads need a separate sub-gate: participation must be voluntary, the reward must be server-confirmed and idempotent, and no ad may interrupt or gate a conversation.
11. Test consent decline/revoke, provider outage, cap races, navigation races, premium transitions, rewarded-ad replay, and every denied route.
12. Start with a tiny eligible cohort and compare revenue with latency, retention, support, and safety impact.

Done when: provider, legal/privacy, product, safety, and engineering approve the evidence and denied surfaces make zero ad requests.

### V2-P10: pass V2 acceptance and expand gradually

Goal: make V2 a measured release, not a collection of permanently half-enabled flags.

Steps:

1. Re-run V1 Gate A regression with all intended V2 features enabled in staging.
2. Run ledger rebuild and source reconciliation at production-like scale.
3. Run economy, quest, billing-grant, reputation, cosmetic, referral, and optional ad abuse suites.
4. Complete privacy/export/deletion tests for all new V2 records.
5. Complete accessibility and independent security review of new public/admin surfaces.
6. Confirm alerts, budgets, worker capacity, support scripts, moderation effects, and kill switches.
7. Roll out by feature, country, and percentage. Do not enable every V2 feature at once.
8. Hold each step for its approved observation window.
9. Expand, hold, or disable based on conversation quality, safety, retention, cost, support, and ledger correctness.
10. Record final product, safety, privacy/legal, finance, support, and engineering approval.

Done when: the approved V2 feature set completes its observation period without an open severity-one incident, critical/high security issue, ledger mismatch, or breached safety/cost threshold.

## 9. V2 test matrix

Every V2 implementation must cover the relevant rows below.

### Ledger and concurrency

- duplicate and out-of-order source events;
- concurrent reward and reversal;
- worker retry after partial dependency failure;
- rebuild during new writes;
- double claim, double spend, and refund race;
- large integer and boundary values;
- version change and replay;
- stale summary detection and repair.

### Abuse and fairness

- repeated peer farming and closed rating rings;
- many accounts on one device/network risk group;
- rapid short conversations;
- collusive quests and referrals;
- report/block used as a reward strategy;
- paid-plan transitions timed around grants;
- reputation brigading and sparse samples;
- free-user outcomes compared with paid cohorts.

### Authorization and privacy

- IDOR across ledgers, quests, cosmetics, referrals, and admin diagnostics;
- client-forged amounts, levels, claims, prices, plan keys, and eligibility;
- deleted, suspended, sanctioned, minor, or wrong-country accounts;
- export scope and cross-user leakage;
- deletion/anonymization/legal-hold behavior;
- log/analytics redaction;
- unsafe cosmetic assets and reserved trust signals;
- ad requests on every prohibited route.

### Failure and rollback

- PostgreSQL, Redis, worker, Stripe, monitoring, and optional ad-provider outage;
- disabled/missing/malformed feature flags;
- kill switch during active processing;
- bad rule or curve version;
- migration rollback/forward-fix compatibility;
- shadow/live mismatch;
- support repair without direct balance editing.

## 10. V2 rollout gates

### V2 Gate 1: foundation integrity

- All V2-N migrations and tests pass.
- Flags default off and kill switches work.
- Ledgers rebuild exactly.
- No V1 regression exists.

### V2 Gate 2: shadow confidence

- Real event capture reconciles with source records.
- Duplicate/loss/mismatch rates meet approved thresholds.
- Reputation remains powerless and private.
- Privacy and monitoring owners approve the event boundary.

### V2 Gate 3: limited live economy

- Versioned reward rules and curve are approved.
- Staff and invited cohort ledgers reconcile.
- Farming, support, safety, and cost remain inside thresholds.
- Rollback uses flags and reversals, not row edits.

### V2 Gate 4: engagement and plan benefits

- Quests/streaks do not reduce conversation quality.
- Subscription grants pass every billing transition.
- Reputation effects pass fairness, explanation, and appeal review.
- Cosmetics pass security/accessibility review.

### V2 Gate 5: optional monetization expansion

- Referral rewards have fraud/legal approval.
- Ads have written provider and privacy/legal approval, or are marked not applicable.
- Denied surfaces make no ad request.
- Full V2 acceptance and observation windows pass.

## 11. Progress ledger

Update this table, not the body of completed task definitions.

### V1 release track

| Item                 | Status      | Evidence or next action                                             |
| -------------------- | ----------- | ------------------------------------------------------------------- |
| Agent implementation | complete    | Tasks 0-21 audited; Task 16 remains conditional on H14              |
| Human runbook        | not_started | Begin Phase 1 in `human-v1.md`                                      |
| Gate A               | not_started | Run internal alpha after required provider setup                    |
| Gate B               | blocked     | Requires Gate A, production operations, and closed-beta observation |
| Gate C               | blocked     | Requires Gate B and launch thresholds                               |
| Gate D               | blocked     | Repeated post-V1 country expansion                                  |

### V2 foundation, wait until V1 completion

| Chunk                               | Status  | Blocker                                      |
| ----------------------------------- | ------- | -------------------------------------------- |
| V2-N0 start from accepted main      | blocked | V1 completion gate in section 5              |
| V2-N1 rollout controls              | blocked | N0                                           |
| V2-N2 immutable schemas             | blocked | N0                                           |
| V2-N3 ledger service                | blocked | N2                                           |
| V2-N4 level curve                   | blocked | N2-N3                                        |
| V2-N5 progression events            | blocked | N0; synthetic until shadow approval          |
| V2-N6 reputation shadow             | blocked | N5                                           |
| V2-N7 quest/streak foundation       | blocked | N3 and N5                                    |
| V2-N8 subscription-grant foundation | blocked | N3                                           |
| V2-N9 cosmetic ownership            | blocked | N0; no store or live grant during foundation |
| V2-N10 diagnostics/tests            | blocked | N1-N9                                        |

### V2 integration and rollout

| Chunk                       | Status  | Blocker                                     |
| --------------------------- | ------- | ------------------------------------------- |
| V2-P0 foundation acceptance | blocked | N1-N10                                      |
| V2-P1 real shadow events    | blocked | P0                                          |
| V2-P2 economy calibration   | blocked | P1 evidence and human approvals             |
| V2-P3 live points/XP/levels | blocked | P2                                          |
| V2-P4 quests/streaks        | blocked | P3                                          |
| V2-P5 subscription grants   | blocked | P3 and stable billing                       |
| V2-P6 reputation effects    | blocked | Shadow/fairness/appeal approval             |
| V2-P7 cosmetic spending     | blocked | P3 and safe catalog approval                |
| V2-P8 invite rewards        | blocked | Fraud/legal/privacy approval                |
| V2-P9 ads                   | blocked | Written provider and legal/privacy approval |
| V2-P10 V2 acceptance        | blocked | Intended P3-P9 set complete                 |

## 12. Short change log

Keep at most ten current entries. Move older detail to Git history or an ADR.

- July 13, 2026: rewrote this plan after V1 code-gap closure; removed obsolete inventories, duplicated human instructions, and agent diaries.
- July 13, 2026: stopped parallel V2 work. V2 now starts only after the V1 completion gate and is implemented directly on the normal `main` codebase.
- July 13, 2026: V1 verification passed formatting, lint, typecheck, 73 tests, 11 migration validations, secret scans, all builds, and eight browser E2E cases.
- July 13, 2026: created the ordered H1-H19 operator runbook in `human-v1.md`.
