# Backend — Coiny API Server

Fastify + TypeScript + Drizzle ORM. Deployed on Fly.io (Sydney). Postgres via Neon in prod, PGlite in tests.

## Key commands

```bash
# Dev (from repo root — loads Keychain secrets)
source bin/load-secrets.sh && pnpm --filter coiny-backend dev

# Tests (56 Vitest tests, all must pass before PR)
pnpm --filter coiny-backend test

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
| `migrations/` | Drizzle migration SQL files |

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
- Migrations live in `migrations/`; generate with `pnpm drizzle-kit generate`.
- Never hand-edit migration files after they've been applied to prod.
