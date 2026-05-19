# Coiny — Claude Code Working Conventions

Coiny is a BLE-connected carry device linked to a user's bank account via
Teller. Reacts to financial behavior with face animations, LED color,
vibration, and sound.

**Read these docs first before any work:**
- `docs/handoff.md` — current state, what's done, what's not
- `docs/architecture.md` — system design
- `docs/phase1-spec.md` — Phase 1 deliverables (if starting backend)
- `docs/security.md` — security model + per-phase checklist
- `docs/sprint-plan.md` — 7-day sprint cadence
- `docs/mqtt-topics.md` — BLE command schema

---

## Git Conventions

### Branching (MANDATORY)

- **Never commit to `main` directly.** A hook enforces this — commits on main
  are blocked at the tool level.
- Always work on a feature branch off `main`. Naming:
  - `feat/<short-name>` for new functionality (e.g., `feat/phase1-backend`)
  - `fix/<short-name>` for bug fixes
  - `docs/<short-name>` for doc-only changes
  - `chore/<short-name>` for tooling, deps, CI, etc.
  - `refactor/<short-name>` for non-behavioral changes
- One branch per logical chunk. Don't bundle unrelated work.
- When work is done, push the branch and open a PR via `gh pr create`.
- Squash-merge PRs to keep `main` history clean. Delete branch after merge.

### Commit messages (Conventional Commits)

- Format: `<type>(<scope>)?: <subject>`
- Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `style`, `perf`
- Subject: imperative mood, ≤72 chars, no trailing period
- Body (optional): explain *why* not *what*

Examples:
```
feat(backend): add Teller webhook signature verification
fix(rules): correct paycheck threshold from $5000 to $500
docs(handoff): reflect mTLS auth replacing API key
chore: bump pino to 9.5.0
```

### Pull requests

- Title: same Conventional Commits format as the squash commit will use
- Body: what changed, why, how to test, screenshots if UI
- Self-review even when solo — forces a checkpoint
- Use `gh pr create` from the terminal; don't open a draft and forget about it

---

## Code Conventions

### TypeScript

- `strict: true` always. No `any` unless commented with why.
- Zod schemas for any external input (env, HTTP body, webhook payload).
- Infer types from Zod schemas via `z.infer<typeof schema>` — don't double-declare.
- Prefer `import type { … }` for type-only imports.
- No default exports for shared modules; named exports only.

### Style

- 2-space indent, semicolons, single quotes, trailing commas.
- Functions over classes unless state requires a class.
- Async/await over raw promises.
- Early returns over deep nesting.

### Tests (Vitest)

- One test file per source file, suffixed `.test.ts`.
- Describe → test structure. Each test asserts one thing.
- Don't mock what you don't have to. Real implementations preferred for unit tests of pure functions.
- Integration tests for HTTP endpoints use Fastify's `app.inject()` — no live server.

---

## Security Rules (NEVER VIOLATE)

1. **Never commit secrets.** `.env` files, `*.pem`, `*.key`, `*.zip` from Teller — all gitignored. If you find a tracked secret, halt and tell the user.
2. **Never log PII or transaction details.** Log event types + pseudonymous IDs only. See `docs/security.md` § "Logging hygiene".
3. **Teller webhook signature verification is required** on every webhook in code paths that touch real or sandbox webhooks. Use `crypto.timingSafeEqual`, not `===`. Reject timestamps >3 minutes old.
4. **Local secrets come from macOS Keychain**, not `.env` files. The loader script is `bin/load-secrets.sh`.
5. **mTLS cert + key files live OUTSIDE the repo** at `~/Documents/coiny-secrets/teller-sandbox/`. Never copy them into the repo for "convenience."
6. **No new dependencies without a reason.** Each new package is a supply-chain surface. Prefer Node built-ins (`crypto`, `https`, `node:test`) when sufficient.

---

## Project Conventions

### Monorepo (pnpm workspaces + Turborepo)

- `backend/` — Fastify TS server (Phase 1)
- `firmware/` — ESP32-S3 C++ via PlatformIO (Phase 2)
- `mobile/` — Expo React Native (Phase 3)
- `shared/` — cross-package TS types (BLE schema, pet state)
- `hardware/case/` — OpenSCAD CAD files

When adding cross-cutting types (BLE commands, financial events), put them in `shared/` and import from each package.

### File creation discipline

- Prefer editing existing files over creating new ones.
- Don't create README.md or docs/*.md unless asked.
- Don't create planning documents. Conversation context is enough; if a decision needs to persist, the user will say "save this to a doc."

### Working directory

- Always operate from `/Users/antoinewiley/Tamogatchi` (the repo root).
- Don't cd into subdirectories in long-lived shell state; use absolute paths.

---

## Operating Notes

- **Solo project.** No team. Claude Code writes the code; Antoine handles physical setup (hardware, phone testing, signups).
- **macOS environment.** Node 22, pnpm 11.1.3, gh CLI, OpenSCAD 2026.04.26, OpenSCAD MCP (already connected).
- **Sandbox mode.** Teller is in sandbox until Phase 4. No real bank data, no real users. Don't add fake users to "make it feel real" — keep state minimal.

When unsure about scope or whether to add something — **ask, don't assume**. Coiny lives or dies on small consistent decisions; one ambiguous choice today turns into three branches of code by next week.
