# Unit 2: Quality foundation

Unit 2 establishes one strict quality contract across every workspace. Browser, Node, and library TypeScript configurations inherit from `packages/config`; ESLint enforces typed rules and browser/server boundaries; Prettier owns mechanical formatting.

Vitest projects cover the web, admin, API, and shared UI package. The root integration project verifies real Postgres and Redis services from `compose.yaml`. Playwright owns the slower browser smoke suite, while `npm run check` remains the fast local and CI quality gate.

## Commands

```bash
npm run check
npm run test:coverage
npm run test:integration
npm run test:e2e
npm run migrations:check
npm run secrets:check
```

CI runs quality, integration, browser, dependency-review, migration-name, and secret-pattern checks. Coverage is reported without an arbitrary repository-wide percentage gate. The migration checker becomes stricter as Unit 5 introduces real migrations.

## Verification record

A temporary invalid TypeScript assignment was introduced in the web workspace. The web typecheck failed with `TS2322`, proving that the correct workspace and diagnostic are surfaced; the temporary file was then removed. Postgres and Redis integration probes pass against the local Compose services.
