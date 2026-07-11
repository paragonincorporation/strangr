# Strangr

Strangr is becoming an account-based social discovery platform: meet a random stranger by text or video, then keep the connection through mutual friendship, direct messages, and calls.

The repository is an npm-workspaces monorepo on Node.js 22. The new TypeScript foundation lives beside the anonymous prototype until its useful behavior is ported.

## Requirements

- Node.js 22.12 or newer (`.nvmrc` is included)
- npm 10 or newer
- Docker with Compose for the integration suite and later persistence/realtime units

## Start development

```bash
npm install
npm run dev
```

The command checks for port collisions, starts Postgres/Redis through `compose.yaml` when Docker is available, and launches:

| Service   | Default address          |
| --------- | ------------------------ |
| User web  | `http://localhost:5173`  |
| Admin web | `http://localhost:5174`  |
| API       | `http://localhost:3000`  |
| Realtime  | `ws://localhost:3000/ws` |

Development can start without Docker with an explicit warning. The integration suite uses the Postgres and Redis services from `compose.yaml`. Copy `.env.example` to `.env` to change ports or local credentials.

Useful commands:

```bash
npm run typecheck
npm run lint
npm run format:check
npm test
npm run test:coverage
npm run test:integration
npm run test:e2e
npm run build
npm run check
npm start
npm run start:worker
```

`npm start` runs the built Fastify API. Run `npm run build` first.

## Workspace layout

```text
apps/
  web/          Vite + React + TypeScript user shell
  admin/        separately deployable Vite + React + TypeScript admin shell
  api/          Fastify HTTP, ws realtime, and independent worker entrypoint
packages/
  contracts/    Zod HTTP/realtime schemas and inferred types
  database/     Drizzle schema, migration, repositories, and encryption boundary
  ui/           shared visual tokens and accessible React primitives
  config/       shared TypeScript and later quality configuration
docs/
  architecture/ ADRs, baseline, and open decision register
  product/      product and visual references
```

HTTP and WebSocket share one API server and port. Realtime uses 30-second single-use tickets, Redis-backed presence and matching, cohort-separated queues, and server-authorized WebRTC signaling/TURN credentials.

## Legacy prototype

The anonymous JavaScript prototype remains unchanged in `public/`, `server/`, and `test/` as a behavior reference. It has no production data and will not receive a compatibility layer.

```bash
npm run legacy:dev
npm run legacy:test
```

The full behavior/protocol record and screenshot set are in [the prototype baseline](docs/architecture/prototype-baseline.md). The product contract and complete execution order are in [plan.md](plan.md) and [implementation-plan.md](implementation-plan.md).

## Current foundation health

- `GET /health/live`: process liveness
- `GET /health/ready`: current dependency readiness
- `GET /ws`: WebSocket upgrade path on the same port

Readiness checks the attached Postgres boundary and live Redis connection. Database migrations remain an explicit release/local command and never run during API startup.
