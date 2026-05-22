# Backend Dev Commands

Working directory: `/Users/antoinewiley/Tamogatchi/backend`

## Run dev server
```bash
cd /Users/antoinewiley/Tamogatchi && source bin/load-secrets.sh && pnpm --filter backend dev
```

## Run tests
```bash
cd /Users/antoinewiley/Tamogatchi && pnpm --filter backend test
```

## Typecheck
```bash
cd /Users/antoinewiley/Tamogatchi && pnpm --filter backend typecheck
```

## Lint
```bash
cd /Users/antoinewiley/Tamogatchi && pnpm --filter backend lint
```

## Run migrations
```bash
cd /Users/antoinewiley/Tamogatchi && pnpm --filter backend db:generate
```

## Stack
- Fastify + TypeScript + Zod
- Drizzle ORM + Postgres (Neon)
- Vitest for tests
- Biome for lint/format
- Secrets loaded from macOS Keychain via bin/load-secrets.sh — never hardcode
