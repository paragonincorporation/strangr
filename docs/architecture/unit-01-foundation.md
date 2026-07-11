# Unit 1 workspace foundation handoff

Completed: July 11, 2026  
Node/npm used: Node 22.19.0, npm 10.9.3

## Delivered

- Root npm workspaces for `apps/*` and `packages/*` with a single lockfile.
- Vite/React/TypeScript user and admin shells as separate applications.
- Fastify/TypeScript API with `/health/live`, `/health/ready`, and a `ws` upgrade at `/ws` on the same port.
- Independently buildable/startable worker entrypoint.
- Initial `contracts`, `database`, `ui`, and `config` packages.
- Shared strict TypeScript base/browser/library/node configurations.
- Root development orchestration with port reporting, preflight collision errors, and Docker Compose startup when Docker exists.
- Reproducible Postgres 16 and Redis 7 definitions in `compose.yaml`.
- Explicit `legacy:*` scripts preserving the anonymous prototype and its tests.
- Updated environment example, Node version, editor settings, ignore rules, README, ADRs, decision register, baseline, and visual references.

## Runtime contract at this stage

| Surface  | Default                  | Purpose                                 |
| -------- | ------------------------ | --------------------------------------- |
| Web      | `http://localhost:5173`  | React user shell                        |
| Admin    | `http://localhost:5174`  | Separately deployable React admin shell |
| API      | `http://localhost:3000`  | Fastify process                         |
| Realtime | `ws://localhost:3000/ws` | Same-server upgrade proof               |
| Worker   | `npm run start:worker`   | Independent process proof               |

The foundation is deliberately dependency-free at runtime. `/health/ready` reports Postgres and Redis as `not-required-yet`. Unit 5/9 must replace these markers with real clients and dependency checks before using persistence or distributed realtime state.

The `/ws` event `connection.ready` with `{ "foundation": true }` proves routing only. It is not the beta protocol and provides no authorization. Unit 4 defines contracts and Unit 9 replaces this with single-use authenticated tickets.

## Commands verified

```text
npm install                 success; 0 reported vulnerabilities
npm run typecheck           success in all 7 workspaces
npm test                    success; 11 legacy tests, 0 failures
npm run build               success in all 7 workspaces
npm run dev                 web/admin/API start with printed ports
docker compose up --wait    Postgres and Redis start healthy
npm start                   built Fastify API starts
npm run start:worker        built worker starts and shuts down cleanly
GET /health/live            200 {"ok":true}
GET /health/ready           200 with dependency markers
ws://localhost:3000/ws      receives connection.ready
duplicate npm run dev:apps  exits 1 and names all occupied ports
```

Browser smoke verification confirmed both Vite shells render with the expected titles, semantic `main`/heading structure, and no console errors.

## Environment and local services

Copy `.env.example` to `.env` for local overrides. `scripts/dev.mjs` loads the root `.env` before checking/starting services and passes it to child workspaces.

Docker 29.6.1 and Compose 5.2.0 were installed after the initial foundation check. The declared Postgres 16 and Redis 7 images were pulled, both health checks passed, `pg_isready` accepted connections, Redis returned `PONG`, and `npm run dev` reused the healthy services before starting all three applications. It runs:

```text
docker compose up -d postgres redis
```

The containers remain available for subsequent units. From the first unit that actually consumes either service, absence/unhealthiness must fail readiness and any operation that depends on it.

## Next unit boundaries

- Unit 2 owns ESLint, formatting, Vitest/Testing Library/Playwright configuration, CI, and the root `check` command.
- Unit 3 owns the real React routes, shared design tokens/primitives, and visual port. Do not grow the temporary shells into imperative screens.
- Unit 4 owns Zod transport contracts and validated environment schemas. Do not treat the current foundation event as a shared contract.
- Unit 5 owns Drizzle and database migrations. The current database package contains no fake persistence API.

No production credentials, migrations, anonymous compatibility layer, or user data were introduced.
