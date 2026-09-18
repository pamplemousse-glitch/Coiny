# Coiny

[![backend](https://github.com/pamplemousse-glitch/Coiny/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/pamplemousse-glitch/Coiny/actions/workflows/backend-ci.yml)
[![CodeQL](https://github.com/pamplemousse-glitch/Coiny/actions/workflows/codeql.yml/badge.svg)](https://github.com/pamplemousse-glitch/Coiny/actions/workflows/codeql.yml)
[![iOS](https://github.com/pamplemousse-glitch/Coiny/actions/workflows/ios-ci.yml/badge.svg)](https://github.com/pamplemousse-glitch/Coiny/actions/workflows/ios-ci.yml)
[![migration rehearsal](https://github.com/pamplemousse-glitch/Coiny/actions/workflows/migration-rehearsal.yml/badge.svg)](https://github.com/pamplemousse-glitch/Coiny/actions/workflows/migration-rehearsal.yml)

A Tamagotchi-style desk companion linked to your bank account via **Plaid**
and a BLE-connected carry device. Coiny reacts in real time to your
financial behavior with animations, lights, sounds and haptics, celebrating
good habits and showing concern when you stray from your goals.

**Status:** Phase 1 backend live. Phase 2 hardware is planned and unwritten — there is
no firmware in this repo yet.

---

## Why this is harder than it looks

A desk pet is a toy. Everything underneath it is not.

**Five layers that have to agree.** A Fastify backend, an Expo app, a native
iOS app, nRF52840 firmware, and a 3D-printed enclosure. A change to how a
mood is computed has to land identically on a phone screen and on an LED
sixteen inches away, over BLE, on a device that has been asleep.

**Real money, so mistakes are not cosmetic.** Bank data arrives through
Plaid, which means access tokens, encryption at rest, and a webhook that
must be idempotent because Plaid will deliver the same event twice. A
double-counted paycheck is a support ticket; a leaked token is a different
category of problem entirely.

**A database with real rows in it.** Schema changes have to land without
losing anyone's transaction history. That is why `migration-rehearsal.yml`
exists (see below) and why it runs against a clone of production rather than
a fresh test database.

**A device that is usually off.** BLE peripherals sleep aggressively to save
battery. State has to reconcile on reconnect rather than assume a live link.

## Repo structure

```
Coiny/
├── backend/        # Fastify + TypeScript + Drizzle + Postgres + Plaid
├── mobile/         # Expo (React Native + TypeScript)
├── ios/            # Native iOS (SwiftUI)
├── android/        # Native Android
├── shared/         # Cross-package TS types (placeholder)
├── hardware/case/  # OpenSCAD enclosure designs
├── bin/            # Local helper scripts (load-secrets.sh)
└── docs/           # All design + planning docs (see below)
```

## Engineering

Fourteen GitHub Actions workflows. The ones worth knowing about:

**[`migration-rehearsal.yml`](.github/workflows/migration-rehearsal.yml)** is the
one I would point at. On any PR touching migrations it branches a throwaway copy
of the **real production database**, runs every pending migration against it, and
deletes the copy.

A unit test can prove the migration journal is ordered and that migrations apply
to a schema. It cannot catch the failures that depend on the actual rows: a
`NOT NULL` added to a column that has nulls in it, a unique index on data that is
not unique, a backfill that takes longer than the release timeout. Those only
appear against real data, and the only safe place to meet them is a copy.

It runs as `NODE_ENV=production` so it exercises the same driver and code path a
real deploy will, branches from production rather than staging because production
is the database whose rows the next deploy actually touches, and skips rather than
fails without the API key so a contributor without the secret does not see a red X
they cannot fix.

| Workflow | What it catches |
|---|---|
| `migration-rehearsal.yml` | Migrations that pass on an empty database and fail on real rows |
| `codeql.yml` | Static analysis, deep SAST |
| `secret-scan-history.yml` | Credentials committed at any point in history, not just in the diff |
| `toolchain-drift.yml` | A pinned Xcode version going stale while the runner image moves on, which a green pipeline never reports |
| `backup.yml` | Nightly database backup, verified |
| `backend-ci.yml` | 55+ vitest tests against PGlite, typecheck, Biome |
| `ios-ci.yml`, `android-ci.yml`, `firmware-ci.yml` | Per-platform builds |

Secrets never touch `.env` files. macOS Keychain locally, Fly secrets in
production, and `secret-scan-history.yml` checks the whole history rather than
trusting that.

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

The test suite runs against PGlite, a real Postgres compiled to WASM, rather than
a mock. Mocked database tests pass when the SQL is wrong.

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

Read these first before any work. They are the source of truth, not the
issue tracker:

| Doc | What |
|---|---|
| [docs/handoff.md](docs/handoff.md) | Current state, what's done, what's not |
| [docs/architecture.md](docs/architecture.md) | System design and BLE flow |
| [docs/security.md](docs/security.md) | Security model + per-phase checklist |
| [docs/tech-stack.md](docs/tech-stack.md) | Quality-first stack decisions (firmware, mobile, backend, hosting, observability, security, auth) |
| [docs/backup-runbook.md](docs/backup-runbook.md) | What to do when the database needs restoring |
| [docs/plaid-integration.md](docs/plaid-integration.md) | Plaid API contract reference |
| [docs/aggregators.md](docs/aggregators.md) | Bank aggregator landscape + Plaid-first decision |
| [docs/product-brief.md](docs/product-brief.md) | Product north star , target user, voice, principles |
| [docs/implementation-plan.md](docs/implementation-plan.md) | 5-milestone execution plan with sequenced PRs |
| [docs/feature-backlog.md](docs/feature-backlog.md) | Forward-looking feature list |
| [CLAUDE.md](CLAUDE.md) | Working conventions for code agents |

## Conventions (short version)

- **Never commit to `main` directly.** A hook enforces it. Use `feat/* fix/* chore/* docs/* refactor/*` branches.
- **Conventional Commits** for commit + PR titles (`feat(backend): ...`).
- **Squash-merge PRs**, delete branch after merge.
- **Secrets** live in macOS Keychain locally and Fly secrets in production. Never `.env` files, never committed.

Full conventions in [CLAUDE.md](CLAUDE.md).

## License

**Source-available, not open-source.** The code is public so it can be read and
reviewed. It is not licensed for reuse, because Coiny is a product rather than a
library. See [LICENSE](LICENSE).
