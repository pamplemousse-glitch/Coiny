# Coiny

A Tamagotchi-style desk companion linked to your bank account via **Plaid**
and a BLE-connected carry device. Coiny reacts in real time to your
financial behavior — animations, lights, sounds, and haptics — celebrating
good habits and showing concern when you stray from your goals.

**Status:** Phase 1 backend live. Phase 2 hardware in planning.

---

## Repo structure

```
Coiny/
├── backend/        # Fastify + TypeScript + Drizzle + Postgres + Plaid
├── mobile/         # Expo (React Native + TypeScript)
├── firmware/       # nRF52840 + Zephyr (Phase 2; M5StickS3 ESP32-S3 for prototyping)
├── shared/         # Cross-package TS types (placeholder)
├── hardware/case/  # OpenSCAD enclosure designs
├── bin/            # Local helper scripts (load-secrets.sh)
└── docs/           # All design + planning docs (see below)
```

## Quickstart (backend)

```bash
# 1. Install dependencies
pnpm install

# 2. Load local secrets from macOS Keychain
source bin/load-secrets.sh

# 3. Run dev server (uses PGlite in-memory when DATABASE_URL is empty)
pnpm --filter coiny-backend dev
```

Tests:

```bash
pnpm --filter coiny-backend test       # vitest, 55+ tests, PGlite-backed
pnpm --filter coiny-backend typecheck  # tsc --noEmit
pnpm --filter coiny-backend lint       # Biome
```

## Quickstart (mobile)

```bash
pnpm --filter coiny-mobile start
# then press 'i' for iOS simulator, 'a' for Android
```

## Production

- Backend: deployed to **Fly.io** at `https://coiny-backend.fly.dev`
- Database: **Neon** (serverless Postgres) in `us-east-1`
- Bank data: **Plaid sandbox** (production gated until Phase 5)

Deploy: `fly deploy` from repo root.

## Docs

Read these first before any work — they're the source of truth, not the
issue tracker:

| Doc | What |
|---|---|
| [docs/handoff.md](docs/handoff.md) | Current state, what's done, what's not |
| [docs/tech-stack.md](docs/tech-stack.md) | Quality-first stack decisions (firmware, mobile, backend, hosting, observability, security, auth) |
| [docs/product-brief.md](docs/product-brief.md) | Product north star — target user, voice, principles. Fill this in before locking Phase 3 feature work. |
| [docs/proposed-changes.md](docs/proposed-changes.md) | Summary of every proposed quality-audit change |
| [docs/implementation-plan.md](docs/implementation-plan.md) | 5-milestone execution plan with sequenced PRs |
| [docs/feature-backlog.md](docs/feature-backlog.md) | Forward-looking feature list (pet + audio customization, etc.) |
| [docs/architecture.md](docs/architecture.md) | System design and BLE flow |
| [docs/plaid-integration.md](docs/plaid-integration.md) | Plaid API contract reference |
| [docs/security.md](docs/security.md) | Security model + per-phase checklist |
| [docs/aggregators.md](docs/aggregators.md) | Bank aggregator landscape + Plaid-first decision |
| [CLAUDE.md](CLAUDE.md) | Working conventions for code agents |

## Conventions (short version)

- **Never commit to `main` directly** — a hook enforces it. Use `feat/* fix/* chore/* docs/* refactor/*` branches.
- **Conventional Commits** for commit + PR titles (`feat(backend): ...`).
- **Squash-merge PRs**, delete branch after merge.
- **Secrets** live in macOS Keychain locally and Fly secrets in production. Never `.env` files, never committed.

Full conventions in [CLAUDE.md](CLAUDE.md).

## License

Proprietary. All rights reserved. See [LICENSE](LICENSE).
