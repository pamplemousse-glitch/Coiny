# Backend — Coiny API Server

Fastify + TypeScript + Drizzle ORM. Deployed on Fly.io (`iad`). Postgres via Neon in prod, PGlite in tests.

## Key commands

```bash
# Dev (from repo root — loads Keychain secrets)
source bin/load-secrets.sh && pnpm --filter coiny-backend dev

# Tests (all must pass before PR). Use --maxWorkers=3 locally: at full
# parallelism PGlite's first migration per file exceeds the 60s hook timeout
# and produces dozens of failures that are machine load, not real.
pnpm --filter coiny-backend test -- --maxWorkers=3

# What CI actually runs. Catches races that reduced parallelism hides.
pnpm --filter coiny-backend test:coverage

# Lint + format
pnpm --filter coiny-backend check        # Biome check
pnpm biome check --write backend/src/   # auto-fix
```

## Key files

| File | Purpose |
|---|---|
| `src/server.ts` | Fastify app factory; three-scope route registration |
| `src/config.ts` | Zod-validated env schema |
| `src/db/schema.ts` | Drizzle schema — source of truth for all tables |
| `src/db/client.ts` | PGlite (test) / Neon (prod) switching logic |
| `src/store/` | One file per domain — users, sessions, items, pets, transactions |
| `src/api/` | Route handlers (auth, pets, plaid, devices, spending, debug) |
| `src/webhook/plaid.ts` | HMAC-verified Plaid webhook handler |
| `src/reactions/` | Rule engine + APNs dispatch |
| `drizzle/` | Migration SQL files and `meta/_journal.json` |

## TypeScript conventions

- `strict: true` always. No `any` unless commented with why.
- Zod schemas for all external input (env, HTTP body, webhook payload).
- Infer types from Zod: `z.infer<typeof schema>` — don't double-declare.
- `import type { … }` for type-only imports.
- No default exports from shared modules; named exports only.
- `exactOptionalPropertyTypes: true` — never pass `undefined` to `field?: T | null`; use `?? null`.

## Style

- 2-space indent, semicolons, single quotes, trailing commas (Biome enforces this).
- Functions over classes. Async/await over raw promises. Early returns over deep nesting.

## Tests (Vitest)

- One test file per source file, suffixed `.test.ts`.
- Describe → test structure. Each test asserts one thing.
- Integration tests use `app.inject()` — no live server needed.
- Don't mock the database. Tests use PGlite (in-process Postgres); real SQL runs in tests.
- Never mock Plaid API calls in webhook tests — use the fixture helpers in `tests/helpers/`.

## Drizzle patterns

- Always define relations in `schema.ts` alongside the table.
- Migrations live in `drizzle/`. Hand-write them; they must be idempotent.
- **The journal is the trap.** `drizzle/meta/_journal.json` entries must have a
  `when` strictly above every entry before them and be present-dated. The
  migrator SILENTLY SKIPS an out-of-order entry: no error, just a missing
  table in production. Verify a new migration applies against an empty
  database, never just that tests pass.
- Never hand-edit migration files after they've been applied to prod.
