# Vercel and Render deployment

## Ownership

| Component               | Platform                                       | Region or delivery       |
| ----------------------- | ---------------------------------------------- | ------------------------ |
| User web                | Vercel project rooted at `apps/web`            | Global CDN               |
| Admin web               | Separate Vercel project rooted at `apps/admin` | Global CDN               |
| HTTP and `/ws` API      | Render `paramingle-api` Web Service            | Singapore                |
| Periodic maintenance    | Render `paramingle-maintenance` Cron Job       | Singapore                |
| Realtime state          | Render `paramingle-realtime` Key Value         | Singapore                |
| Auth, Postgres, Storage | Supabase                                       | Closest practical region |
| Media                   | Browser WebRTC with managed TURN fallback      | Provider dependent       |

Vercel never runs the Fastify process or worker. Video and audio never traverse Vercel or the API.

## Vercel projects

Import the repository twice. Set Root Directory to `apps/web` for the public project and `apps/admin` for the admin project. Keep access to files outside the Root Directory enabled so npm workspaces and the root lockfile are available. Both application-local `vercel.json` files select Vite, run the workspace-aware build, publish `dist`, set baseline browser headers, and provide the React Router fallback.

Use Node 22. Configure the web project with `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and `VITE_DEPLOYMENT_ENVIRONMENT`. Configure Preview and Production independently. Never place service-role, database, Redis, encryption, TURN-secret, or Stripe-secret values in a `VITE_*` variable.

## Render Blueprint

Create a Blueprint from the root `render.yaml`. Supply every `sync: false` value in the Render dashboard during initial creation. The Web Service accepts Render's `PORT`; `PORT` takes precedence over the local `API_PORT`. HTTP and WebSocket share the same public origin and `/ws` path.

Set `DEPLOYMENT_ENVIRONMENT` explicitly to `staging` or `production` in each isolated environment. Enter the currently approved policy version IDs and the matching Turnstile secret/hostname allowlist for both API and maintenance services; the worker validates the same server configuration at startup.

For private testing, the Blueprint uses free API and Key Value plans. Free services can sleep and are not a reliability target. Upgrade the API before invite traffic. The hourly cron calls the bounded `worker:once` command. When job latency or volume requires continuous consumption, add a paid Background Worker using the same build and `npm run start:worker`, then disable overlapping cron work.

Production origin variables are comma-separated exact URLs:

- `WEB_ALLOWED_ORIGINS`
- `ADMIN_ALLOWED_ORIGINS`
- `PREVIEW_ALLOWED_ORIGINS`

Do not use an unrestricted `*.vercel.app` wildcard. HTTP CORS and WebSocket upgrades use the same allowlist.

## Country eligibility header

The API resolves production launch eligibility from `COUNTRY_HEADER_NAME`, which defaults to `cf-ipcountry`. The public API hostname must be proxied through the configured trusted edge, and the Render origin hostname must not be exposed as a supported client endpoint. The edge must overwrite the country header; it must never forward a client-supplied value.

Local development uses `x-paramingle-country` and falls back to `LOCAL_COUNTRY_CODE`. Neither local behavior nor a browser-provided country is a production trust signal. A missing or malformed production header resolves to `ZZ` and is denied by default.

Country rows also deny registration, matching, and billing by default. An AAL2-authenticated admin must enable each switch separately after the corresponding human approval.

## Release order

Use the protected GitHub `Release candidate` workflow with the full reviewed commit SHA. Configure each GitHub environment with a migration-only `MIGRATION_DATABASE_URL`, separate scoped Render API/worker deploy hooks, a scoped Vercel token plus organization and Web/Admin project IDs, and non-secret smoke URLs. Production requires named approvers. Render automatic deploys are disabled in the Blueprint. The workflow adds the reviewed SHA to each Render hook and waits until `/health/live` reports that exact revision; Vercel is built from the checked-out SHA rather than a branch deploy hook. The workflow enforces this order:

1. Run `npm ci`, `npm run check`, all builds, PostgreSQL/Redis integration tests, and browser E2E tests.
2. Validate and apply reviewed, forward-safe migrations explicitly with the migration role.
3. Deploy Render and wait for `/health/ready`.
4. Deploy Vercel Web and Admin.
5. Smoke-test API liveness and both clients.
6. Manually smoke-test authentication, an authenticated API call, realtime ticket creation, `/ws`, matching, signaling, billing, and admin AAL2.
7. Observe errors and reconnects before promoting or expanding traffic.

Rollback must preserve client/server contract compatibility. Breaking contracts require an expand-and-contract rollout or a new realtime protocol version.

Operational failure exercises, evidence records, rollback boundaries, and kill switches are defined in [rehearsals.md](rehearsals.md). Load calibration and H18 capacity evidence are defined in [load-testing.md](load-testing.md).

## Smoke checks

- Directly load and refresh representative Web and Admin nested routes.
- Confirm generated browser bundles contain no server secret name or value.
- Confirm an approved origin receives CORS headers and an unrelated origin does not.
- Confirm an unapproved WebSocket Origin receives HTTP 403 before ticket consumption.
- Confirm `https://` API configuration becomes `wss://.../ws` in the client.
- Confirm `worker:once` exits and closes its database pool.
- Confirm an established WebRTC call is not limited by Vercel Function duration.
