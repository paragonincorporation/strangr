# Paramingle V1 human launch runbook

This is the work people must finish before Paramingle V1 can open as a country-limited public beta. Follow it from top to bottom. Do not treat a checked box as proof by itself. Each phase needs a dated evidence link in a private operations register.

While this runbook is active, all engineering work is V1 validation or V1 defect repair. Do not begin any V2 task. The V2 start condition and ordered implementation plan are in `mvp-plan.md`.

The repository must never contain passwords, API keys, identity documents, contracts, legal advice, user data, recovery codes, or private staff details.

## How to use this runbook

1. Create a private operations register in the company workspace. A spreadsheet is enough.
2. Add these columns: `Task`, `Primary owner`, `Backup owner`, `Status`, `Date`, `Evidence link`, `Problem found`, and `Next action`.
3. Use only these statuses: `not_started`, `in_progress`, `waiting_external`, `complete`, or `not_applicable`.
4. Save evidence in a private company drive. Evidence may include a dashboard screenshot, test report, approval memo, ticket, or meeting record. Remove tokens and user data first.
5. If a test fails, stop that launch path. Open an engineering or operations issue, fix it, rerun the test, and then record the new result.
6. Never paste a secret into chat or commit one to Git. Put secrets directly into the matching provider's secret manager.

## Phase 1: put people in charge

This completes H1.

- [ ] Name one primary owner and one backup for product decisions.
- [ ] Name the engineering release owner.
- [ ] Name the safety and moderation owner.
- [ ] Name the privacy and legal owner.
- [ ] Name the billing and tax owner.
- [ ] Name the customer-support owner.
- [ ] Name the incident commander and a backup.
- [ ] Name the data-protection contact.
- [ ] Write what each person may approve, what they must escalate, and how to contact them during an incident.
- [ ] Put the names and contact details in the private register, not this repository.
- [ ] Ask every primary and backup owner to acknowledge their responsibility in writing.

Phase 1 is complete when every role has a primary, a backup, and a written escalation boundary.

## Phase 2: decide where and under what rules V1 may operate

This completes H2.

- [ ] Give qualified counsel an accurate product description: an English-language, account-based, 18+ random text/video service with profiles, direct friends/messages/calls, reporting, blocking, and monthly subscriptions. Paramingle does not record calls.
- [ ] Ask counsel to produce an approved-country list and a held/prohibited-country list.
- [ ] For every proposed country, record the privacy, age-assurance, consumer, online-safety, payment, tax, and law-enforcement requirements.
- [ ] Approve the legal entity name, business address, support contact, privacy contact, and governing-law text shown to users.
- [ ] Approve the Terms of Service, Privacy Policy, Community Guidelines, cookie/analytics notice, subscription and refund terms, moderation and appeals policy, and retention schedule.
- [ ] Give the Terms, Privacy Policy, and Community Guidelines immutable version IDs.
- [ ] Put those IDs into staging as `CURRENT_TERMS_VERSION`, `CURRENT_PRIVACY_VERSION`, and `CURRENT_GUIDELINES_VERSION`.
- [ ] Open `GET /v1/policies/current` in staging and confirm it returns the same three IDs.
- [ ] Create an adult test account, accept the three documents, and confirm the database has one acceptance record for each document.
- [ ] In the AAL2-protected admin screen, add the first approved country with registration, matching, and billing switched off.
- [ ] Record the legal approval and country decision in the private register.

Phase 2 is complete when counsel and the named legal/privacy owner have approved the documents and the first launch country in writing.

## Phase 3: create and secure staging and production

This completes H3. Follow [environment-setup.md](docs/operations/environment-setup.md) and [deployment.md](docs/operations/deployment.md) while doing this phase.

### 3.1 Company accounts

- [ ] Create organization-owned GitHub, Supabase, Vercel, Render, DNS/edge, TURN, Stripe, SMTP, Turnstile, monitoring, analytics, and support accounts.
- [ ] Create separate staging and production projects wherever the provider supports it.
- [ ] Add a company payment method and budget alert to every paid provider.
- [ ] Enable MFA for every human operator and store recovery codes in the approved password manager.
- [ ] Give each person the smallest role they need. Record who can add users, change billing, read production data, or rotate credentials.

### 3.2 Supabase and authentication

- [ ] Create separate staging and production Supabase projects.
- [ ] Configure Auth, PostgreSQL, and Storage separately in each project.
- [ ] Create a private avatar bucket and a different private privacy-export bucket. The export bucket must only be reachable by the service role.
- [ ] Configure custom SMTP and the approved email templates.
- [ ] Disable click tracking for authentication links.
- [ ] Configure exact site URLs and redirect URLs for email and Google OAuth. Do not use broad wildcards.
- [ ] Create separate Google OAuth clients for staging and production.

### 3.3 Render, Redis, and Vercel

- [ ] Create separate Render API, maintenance-worker, and Redis services for staging and production.
- [ ] Create separate Vercel Web and Admin projects for staging and production.
- [ ] Enter only public `VITE_*` values into Vercel. Never put database, Redis, service-role, encryption, TURN credential, or Stripe secret values into a `VITE_*` variable.
- [ ] Enter server secrets directly into Render. Include `SUPABASE_PRIVACY_EXPORT_BUCKET`, `GLOBAL_CONCURRENCY_CEILING`, and `COUNTRY_CONCURRENCY_CEILINGS`.
- [ ] Keep the initial ceilings very low until Phase 8 produces approved numbers.
- [ ] Confirm Render automatic deploys are off for the API and maintenance job. Releases must go through the protected GitHub workflow after migrations.

### 3.4 Trusted country edge

- [ ] Put the public API hostname behind the trusted edge.
- [ ] Configure the edge to overwrite `COUNTRY_HEADER_NAME` with its own country result. It must discard a country header sent by the browser.
- [ ] Do not publish the Render origin as a supported client endpoint.
- [ ] Test a forged browser country header. The API must use the trusted edge value, not the forged value.

### 3.5 Basic environment check

- [ ] Push a reviewed branch and confirm the GitHub CI check, PostgreSQL/Redis integration job, and browser E2E job pass.
- [ ] Apply all migrations to staging.
- [ ] Confirm `/health/live` reports the expected environment and revision.
- [ ] Confirm `/health/ready` reports PostgreSQL and Redis as up.
- [ ] Record safe project IDs, dashboard links, owners, and verification dates in the private register.

Phase 3 is complete when both environments exist, staging passes its basic checks, and no production service is owned by a disposable personal account.

## Phase 4: test the core product with real staging accounts

This completes H4 through H9. Use fake people and test data. Every account used here must be a verified adult staging account.

### 4.1 Adult-only onboarding, H4

- [ ] Try a birth date one day below the 18-year boundary. Entry to communication must fail.
- [ ] Try the exact 18th birthday. Onboarding may continue.
- [ ] Try an invalid date, a future date, and a leap-day boundary.
- [ ] Try to change the birth date after it has been saved. The API must reject the change.
- [ ] Confirm a minor fixture cannot match, message, request, or call.
- [ ] Confirm that minor fixture can still inspect its account and submit a report or appeal.

### 4.2 Matching preferences, H5

- [ ] Create two adult accounts in the enabled staging country.
- [ ] Confirm a Free account can save country, language, interests, identity, and the Everyone gender preference.
- [ ] Confirm a Free account cannot save a restricted gender preference.
- [ ] Add a temporary audited `matching.gender_filter` grant to one test account.
- [ ] Confirm the entitled account can save and use a gender preference.
- [ ] Test symmetric gender compatibility, country, language, and interests.
- [ ] Confirm interests broaden only after 15 seconds when both users consent.
- [ ] Confirm country and language broaden only after 30 seconds when both users consent.
- [ ] Confirm gender never broadens.
- [ ] Remove the temporary grant.

### 4.3 Text Next cooldown, H6

- [ ] Match two accounts in text mode.
- [ ] Press Next before 25 connected seconds. It must be rejected and show the remaining time.
- [ ] At 25 connected seconds, press Next again. It must work once.
- [ ] During the cooldown, confirm Leave, Report, Report and leave, and Block still work immediately.
- [ ] Repeat across two API instances that share Redis.

### 4.4 Ratings, H7

- [ ] Approve the words "Like" and "Dislike" and the surrounding explanation.
- [ ] Confirm rating is unavailable at 119.999 connected seconds.
- [ ] Confirm rating is available at 120 seconds.
- [ ] Submit one rating, retry the same request, and confirm only one record exists.
- [ ] Try to change Like to Dislike. The change must fail.
- [ ] Confirm one participant cannot read the other participant's private rating.

### 4.5 Safe-card reveal, H8

- [ ] Approve the exact Maxed Out disclosure shown during onboarding, in privacy settings, and in the call room.
- [ ] Confirm Free, Lite, and Loaded remain anonymous until the person shares their safe card.
- [ ] Give one viewer a temporary audited `call_card.paid_override` grant.
- [ ] Confirm the Maxed Out viewer receives only username, display name, avatar, country, language, interests, and reveal source.
- [ ] Confirm exact birth date, email, bio, account history, devices, moderation data, billing data, and internal IDs are absent.
- [ ] Revoke the grant during a session and confirm future access stops.
- [ ] Repeat after block, sanction, deletion-pending, encounter substitution, and encounter expiry. Access must stop in every case.

### 4.6 Reconnect, H9

- [ ] Approve the reconnect offer lifetime and the copy shown to both people.
- [ ] Confirm Free and Lite cannot create an offer.
- [ ] Confirm Loaded and Maxed Out can create an expiring offer after an eligible encounter.
- [ ] Test accept, decline, expiry, and simultaneous queue join.
- [ ] Confirm the offer reveals neither profile identity nor durable online presence.
- [ ] Confirm block, sanction, deletion-pending, country disablement, and lost entitlement invalidate the offer.

Phase 4 is complete when the product, safety, and engineering owners have reviewed the results for H4 through H9 and every failed result has been fixed and retested.

## Phase 5: approve and connect the external services

This completes H10 through H17. Several steps involve contracts, vendor review, or independent specialists, so start them early.

### 5.1 TURN and media quality, H10

- [ ] Compare managed TURN providers for launch-region latency, reliability, abuse controls, credential rotation, DPA terms, support, and cost.
- [ ] Select and fund a provider. Create separate staging and production credentials.
- [ ] Put `TURN_URLS` and `TURN_CREDENTIAL_SECRET` into the matching Render secret store.
- [ ] Test a forced-relay call from representative restrictive networks.
- [ ] Test current Chromium, Firefox, Safari, iOS Safari, and Android Chrome.
- [ ] Test permission denial, missing devices, camera switching, Wi-Fi/cellular handoff, packet loss, and high latency.
- [ ] Approve or replace the standard 960x540/24 fps/900 kbps target and premium 1920x1080/30 fps/2.5 Mbps ceiling.
- [ ] Set a TURN budget alert and an approved maximum relay cost per 1,000 conversations.

### 5.2 Stripe and tax, H11

- [ ] Complete business, bank, identity, and tax verification for Stripe.
- [ ] Tell Stripe that Paramingle is an 18+ random-video user-generated-content service. Wait for written approval if Stripe requests an enhanced review.
- [ ] Determine sales-tax, VAT, or GST duties in every approved country. Register before collecting tax where required.
- [ ] Approve the four plan names, monthly prices, cancellation behavior, refund rules, proration, support authority, three-day payment-failure grace, and five-second capped queue advantage.
- [ ] Create separate test and live products/prices for Lite, Loaded, and Maxed Out.
- [ ] Configure the Billing Portal.
- [ ] Configure `/v1/billing/webhooks/stripe` for subscription changes, Checkout completion, invoice paid/failure, refunds, and disputes.
- [ ] Put `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` only in the matching Render environment.
- [ ] Apply the approved price IDs to `subscription_plans` through a reviewed operational change. Activate only the rows approved for that environment.
- [ ] In Stripe test mode, run purchase, renewal, upgrade, downgrade, payment failure, grace expiry, cancellation, refund, dispute, duplicate webhook, out-of-order webhook, and reconciliation tests for every paid plan.
- [ ] Confirm cancellation keeps access only through the paid-through date. Confirm failure, refund, dispute, or expiry removes active and future rights.
- [ ] Confirm Free users continue to match while paid queue priority is active.
- [ ] Keep live billing and paid rows disabled until every test above passes.

### 5.3 Moderation and support, H12

- [ ] Approve report reasons, severity levels, evidence limits, sanctions, appeals, refund authority, and illegal-content/underage escalation procedures.
- [ ] Approve or replace the provisional response targets: urgent 15 minutes, high 60 minutes, standard 24 hours.
- [ ] Hire or assign enough moderators and support staff for the planned launch hours and ceiling.
- [ ] Train them on minimum-necessary access, privacy, illegal content, underage reports, escalation, appeals, and account security.
- [ ] Enroll every admin in MFA and test immediate access removal for a departing operator.
- [ ] In staging, test queue ordering, overdue items, assignment, evidence expiry, every sanction, active-session revocation, recent-MFA enforcement, audit records, and independent appeal review.
- [ ] Run one moderation tabletop exercise and fix its gaps.

### 5.4 Turnstile and anti-abuse rules, H13

- [ ] Create separate staging and production Turnstile widgets with exact hostnames.
- [ ] Put `VITE_TURNSTILE_SITE_KEY` in public client configuration and `TURNSTILE_SECRET_KEY` in server secrets.
- [ ] Configure the exact `TURNSTILE_ALLOWED_HOSTNAMES` list.
- [ ] Enable Supabase Auth CAPTCHA for signup and password recovery.
- [ ] Approve when a challenge appears and approve the initial account, session, network, queue, message, duplicate-content, and report limits documented in `mvp-plan.md`.
- [ ] Test success, failure, expiry, replay, wrong action, wrong hostname, provider outage, network change, keyboard use, and screen-reader use.
- [ ] Confirm Block, Leave, Report, and Report and leave remain available when unrelated anti-abuse limits fire.

### 5.5 Visual NSFW/fake-camera risk signals, H14

- [ ] Decide whether automated visual risk signals are part of V1.
- [ ] If the answer is no, have the product, safety, and legal/privacy owners approve the disabled feature in writing. Keep the feature off and record why the manual moderation controls are acceptable for the initial ceiling.
- [ ] If the answer is yes, select a model only after reviewing its license, privacy, processing location, DPA, device performance, bias, accuracy, and cost.
- [ ] For an enabled model, approve user notice, on-device frame handling, warning/pause behavior, moderator visibility, retention, countries, and a kill switch. Frames must not be logged or uploaded under the default design.
- [ ] Return the approved model and behavior to engineering. Task 16 must then be implemented, reviewed, and tested before continuing. The model may create a reviewable risk signal, never a permanent automatic sanction.

### 5.6 Privacy operations, H15

- [ ] Approve the data inventory and retention schedule.
- [ ] Approve export identity checks, scope, delivery method, exclusions, response target, and support procedure.
- [ ] Approve deletion reauthentication, the cancellation window, subscription handling, legal/safety holds, anonymization, surviving records, and completion target.
- [ ] Approve or replace the provisional seven-day deletion cancellation window and 30-day deletion-request retention.
- [ ] Confirm privacy archives go only to the private export bucket, not the avatar bucket.
- [ ] Confirm signed download links expire after five minutes and archive objects after 24 hours.
- [ ] Test export and deletion with friendships, calls, reports, sanctions, and past subscriptions.
- [ ] Start deletion, sign in again with recent authentication, cancel inside the window, and confirm the account returns to active.
- [ ] Confirm archive keys and tokens never appear in logs or support tickets.

### 5.7 Monitoring, support, and budgets, H16

- [ ] Select organization-owned error monitoring, uptime, privacy-safe analytics, paging, and support providers.
- [ ] Sign required DPAs and set data region and retention.
- [ ] Create separate staging and production projects.
- [ ] Connect the provider-neutral application metrics and worker logs to those projects.
- [ ] Keep message text, profile fields, tokens, exact birth dates, media, IP addresses, Stripe payloads, and moderation evidence out of telemetry.
- [ ] Create alerts for readiness, error rate, socket failures, queue/match regression, WebRTC failure, TURN relay use, Redis memory, PostgreSQL connections, webhook failures, and worker lag/duration.
- [ ] Map every alert to a named primary and backup using [observability-runbook.md](docs/operations/observability-runbook.md).
- [ ] Set provider budgets and hard-stop/escalation rules for Render, Supabase, Redis, TURN, email, storage, Stripe, monitoring, support, and moderation.
- [ ] Trigger every severity-one alert in staging and confirm a named person receives and acknowledges it.

### 5.8 Independent review, H17

- [ ] Publish a security contact and vulnerability-disclosure process.
- [ ] Hire an independent penetration tester with WebRTC, realtime, Supabase Auth, billing, and privacy experience.
- [ ] Include deletion/session revocation, export authorization, WebSocket tickets/origins, CSP/headers, Stripe raw-body verification, admin MFA, and profile/message rendering in scope.
- [ ] Arrange a manual accessibility review for keyboard use, screen readers, focus, contrast, reduced motion, permissions, call controls, billing, and admin flows.
- [ ] Fix every critical and high finding and obtain retest evidence.
- [ ] Give every accepted lower-risk finding an owner and deadline.

Phase 5 is complete when H10 through H17 have written approval and evidence. If the model decision, penetration test, accessibility review, or provider test creates new code work, that work must be merged and all automated checks rerun before Phase 6.

## Phase 6: measure capacity and choose safe limits

This completes H18. Follow [load-testing.md](docs/operations/load-testing.md). Never run the load harness against production.

- [ ] Agree on abort thresholds with engineering, safety, support, finance, and the incident commander before testing.
- [ ] Create distinct verified adult staging fixtures for Free, Lite, Loaded, and Maxed Out through normal signup and onboarding.
- [ ] Keep access tokens in the ignored mode-0600 `.load-tokens.json` file. Revoke them after testing.
- [ ] Run the PostgreSQL/Redis integration job and save the sanitized result.
- [ ] Run a small `npm run load:realtime` calibration first.
- [ ] Run the steady text scenario and confirm successful Next after 25 seconds.
- [ ] Run the skip-storm scenario and confirm early Next attempts are rejected without blocking safety exits.
- [ ] Run the churn scenario and measure disconnect and reconnect behavior.
- [ ] Run the 120-second rating scenario and check duplicate protection.
- [ ] Run signed Stripe test webhook duplicate/out-of-order bursts and the maintenance worker during load.
- [ ] Use two real devices for text and video. Run at least one forced-TURN call.
- [ ] Increase socket count and duration only in reviewed steps. Stop immediately at an abort threshold.
- [ ] Record p50/p95/p99 queue-to-match and WebRTC connection time, errors, reconnects, API CPU/RSS, Redis memory/latency/evictions, PostgreSQL connections/locks/query time, worker lag/duration, TURN sessions/bytes, moderation intake/backlog, and provider spend.
- [ ] Calculate infrastructure, TURN, monitoring, support, and moderation cost per 1,000 conversations.
- [ ] Compare the measured technical ceiling with staffed moderation and support capacity. The lower number wins.
- [ ] Choose a lower global launch ceiling and lower per-country ceilings, plus stop conditions and evidence required for an increase.
- [ ] Put the approved values into `GLOBAL_CONCURRENCY_CEILING` and `COUNTRY_CONCURRENCY_CEILINGS` through an audited configuration change.
- [ ] Reach the ceiling in staging and confirm users see the honest beta-full message.
- [ ] Record the approvers, evidence, ceilings, rollback trigger, and test-account revocation.

Phase 6 is complete when engineering, safety, support, and finance have approved limits below both infrastructure and staffing capacity.

## Phase 7: prepare production and rehearse failures

This completes the setup portion of H19. Follow [rehearsals.md](docs/operations/rehearsals.md).

### 7.1 Domains, TLS, email, and callbacks

- [ ] Put product, API, Admin, Auth, and support domains under company ownership.
- [ ] Configure DNS and TLS. Verify HTTPS and WSS.
- [ ] Verify exact CORS/WebSocket origins, CSP, HSTS, and rejection of an unrelated origin.
- [ ] Configure SPF, DKIM, and DMARC. Test delivery, alignment, bounce/complaint handling, and credential rotation.
- [ ] Enter exact production origins and callbacks in Supabase, Google OAuth, Stripe, Turnstile, Vercel, Render, monitoring, support, and TURN dashboards.
- [ ] Do not use a wildcard Vercel origin in production.

### 7.2 Protected release workflow

- [ ] Create protected `staging` and `production` GitHub environments with named approvers.
- [ ] Add environment secret `MIGRATION_DATABASE_URL` using a migration-only database role.
- [ ] Add environment secrets `RENDER_DEPLOY_HOOK` and `RENDER_WORKER_DEPLOY_HOOK`.
- [ ] Add environment secrets `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_WEB_PROJECT_ID`, and `VERCEL_ADMIN_PROJECT_ID`. Scope the token to deployment only.
- [ ] Add non-secret environment variables `API_LIVE_URL`, `API_READY_URL`, `WEB_URL`, and `ADMIN_URL`.
- [ ] Run `.github/workflows/release.yml` in staging using a full reviewed commit SHA.
- [ ] Confirm integration and E2E tests finish before migration.
- [ ] Confirm migration finishes before API/worker deployment.
- [ ] Confirm `/health/live` reports the exact reviewed SHA before client deployment begins.
- [ ] Confirm Web and Admin are built from the checked-out SHA and all smoke URLs pass.

### 7.3 Backup and incident rehearsals

- [ ] Approve database and object-storage recovery point and recovery time objectives.
- [ ] Confirm backup owner, schedule, retention, encryption, region, restore access, and a dated restore point.
- [ ] Restore a backup into an isolated environment and measure actual recovery time and data loss.
- [ ] Rehearse Redis loss, signed webhook replay, Auth outage, TURN outage, credential rotation, a bad migration, moderator compromise, and data exposure.
- [ ] For each rehearsal, run `npm run rehearse:operations -- <scenario>` and attach sanitized evidence.
- [ ] Fix every failed required rehearsal and repeat it.
- [ ] Verify rollback compatibility and the country registration/matching/billing, paid catalog, visual-risk, capacity, and TURN kill switches.
- [ ] Confirm reporting, blocking, sanctions, privacy contact, and deletion handling remain available during a feature shutdown.

Phase 7 is complete when the production setup is ready, the reviewed-SHA release path works in staging, backup restore succeeds, and every required rehearsal passes.

## Phase 8: pass Gate A, internal alpha

- [ ] Run `npm run check`, `npm run test:integration`, `npm run test:e2e`, and `npm run build` on the release candidate. Save the results.
- [ ] On two real devices, complete signup, verification, onboarding, text matching, and video matching.
- [ ] Complete one forced-TURN call.
- [ ] Test cooldown, self-reveal, automatic Maxed Out safe card, rating, report without leaving, report and leave, block, and reconnect.
- [ ] Run the full Stripe sandbox lifecycle for all four plans.
- [ ] Apply an admin sanction during an active session and confirm active and future capabilities stop.
- [ ] Confirm the exercise used no production user data.
- [ ] Have engineering and safety sign the Gate A result.

Gate A fails if any item above fails.

## Phase 9: pass Gate B, closed beta

- [ ] Confirm production infrastructure, backups, policies, moderation staffing, support, on-call, monitoring, Stripe approval, and tax setup are complete.
- [ ] Confirm the independent review has no open critical or high finding.
- [ ] Open registration only to invited verified adults in the first approved country.
- [ ] Keep traffic below the Phase 6 ceiling.
- [ ] Operate for the review period approved by the owners in Phase 1.
- [ ] Review safety backlog, cost, uptime, match/connection quality, queue wait, WebRTC failure, TURN spend, billing, support, exports, and deletion at the agreed cadence.
- [ ] Pause invitations if an approved threshold is crossed or a severity-one incident opens.
- [ ] Fix problems and restart the observation period when the launch owners require it.
- [ ] Have product, safety, legal/privacy, billing, and engineering sign the Gate B result.

Gate B is complete only after the full observation period stays within the approved limits.

## Phase 10: pass Gate C and finish V1 human work

- [ ] Confirm registration can be enabled only for the approved country and matching/billing remain separate switches.
- [ ] Confirm global and per-country ceilings, beta-full behavior, and kill switches are active.
- [ ] Confirm on-call, support, appeals, billing, moderation, privacy export, and deletion each have a primary and backup owner.
- [ ] Confirm no severity-one incident and no critical/high security issue is open.
- [ ] Confirm queue wait, connection success, report rate, TURN cost, support load, and moderation backlog meet the approved launch thresholds.
- [ ] Confirm there is a fresh restore point.
- [ ] Run the protected release workflow with the final reviewed SHA.
- [ ] Enable registration at a low ceiling in the first approved country. Enable matching and billing only when their separate approvals are recorded.
- [ ] Watch alerts and product/safety metrics for the approved observation window. Expand, hold, or disable based on the written thresholds.
- [ ] Revoke staging/load credentials and close temporary grants.
- [ ] Record the final dated product, safety, legal/privacy, billing, and engineering approvals.
- [ ] Mark H1 through H19 `complete` (or formally approved `not_applicable`, where this runbook allows it) in the private register and record the V1 country-limited public-beta release date.

Completing the last checkbox finishes the planned human work for the first V1 country-limited public beta, provided every discovered defect was fixed and retested. It does not mean Paramingle is ready for every country.

## After V1: Gate D country expansion

Gate D is a repeated process, not a global switch. For each new country or small group:

1. Complete legal, privacy, payment, tax, and safety review.
2. Confirm English support and staffed operating hours are acceptable.
3. Enable and test the country in staging.
4. Enable production registration at a low ceiling.
5. Watch safety, quality, support, billing, and cost through the approved observation window.
6. Expand, hold, or disable that country.

Do not start V2 while this runbook is active. First fix and retest every V1 defect, complete Gates A-C, finish the V1 final acceptance checklist in `mvp-plan.md`, and pass the V1 completion gate there. After that approval, tag the accepted V1 revision and begin V2 task V2-N0 directly from the normal `main` codebase. No separate long-running V2 branch or reintegration phase is planned.
