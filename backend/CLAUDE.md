# Backend — Coiny API Server

Fastify + TypeScript + Drizzle ORM. Deployed on Fly.io (`iad`). Postgres via Neon in prod, PGlite in tests.

## Key commands

```bash
# Dev (from repo root — loads Keychain secrets)
source bin/load-secrets.sh && pnpm --filter coiny-backend dev

# Tests (all must pass before PR). Reduced parallelism locally: at full
# parallelism PGlite's first migration per file exceeds the 60s hook timeout
# and produces dozens of failures that are machine load, not real.
pnpm --filter coiny-backend test:local

# NOTE: `pnpm ... test -- --maxWorkers=3`, which this file used to document,
# SILENTLY IGNORES THE FLAG. The script is `vitest run`, so the pnpm `--`
# separator renders it as `vitest run -- --maxWorkers=3`, and vitest parks
# everything after `--` in argv['--'] rather than parsing it. Proof: an
# invalid value passed after `--` runs the suite normally, while the same
# value passed directly is rejected in 202ms before a single test runs. So
# the documented mitigation for the load failures was a no-op, which is a
# good candidate for why they never went away. Use test:local, or run
# `npx vitest run --maxWorkers=3` from backend/.

# CI runs THREE steps (backend-ci.yml:75,78,81), in this order. Run all three
# before claiming green, and run them AFTER your last edit.
#
# This line used to read "what CI actually runs" above test:coverage alone,
# which is how a PR shipped with a type error in a test file while every local
# signal was green: vitest transpiles WITHOUT typechecking, so a fully passing
# suite says nothing about types. Typechecking before writing a test and not
# again after is the same mistake in slow motion.
pnpm --filter coiny-backend lint && \
  pnpm --filter coiny-backend typecheck && \
  pnpm --filter coiny-backend test:coverage   # also catches races reduced parallelism hides

# Lint + format. Run these from backend/, NOT the repo root: biome resolves a
# different config from the root and reports files as unfixable that it fixes
# correctly from here.
pnpm --filter coiny-backend lint         # Biome check (there is no `check` script)
cd backend && npx biome check --write src/   # auto-fix
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
