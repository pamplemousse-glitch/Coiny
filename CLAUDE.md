# Coiny — Claude Code Working Conventions

Coiny is a BLE-connected carry device linked to a user's bank account via
Plaid. Reacts to financial behavior with face animations, LED color,
vibration, and sound.

**Read these docs first before any work:**
- `docs/handoff.md` — current state, what's done, what's not
- `docs/tech-stack.md` — quality-first stack decisions (firmware, mobile, backend, hosting, observability, security, auth)
- `docs/proposed-changes.md` — summary table of every proposed change from the 2026-05-20 quality audit
- `docs/implementation-plan.md` — execution sequence + milestones for the audit changes
- `docs/feature-backlog.md` — forward-looking feature list (pet customization, audio, net worth, etc.)
- `docs/architecture.md` — system design
- `docs/plaid-integration.md` — Plaid API contract reference (auth, webhooks, sync semantics, taxonomy)
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
feat(backend): add Plaid webhook signature verification
fix(rules): correct paycheck threshold from $5000 to $500
docs(handoff): reflect Plaid integration replacing Teller
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

1. **Never commit secrets.** `.env` files, any `*.pem` / `*.key`, vendor cert exports — all gitignored. If you find a tracked secret, halt and tell the user.
2. **Never log PII or transaction details.** Log event types + pseudonymous IDs (transaction_id, item_id) only. See `docs/security.md` § "Logging hygiene".
3. **Plaid webhook signature verification is required** on every webhook in code paths that touch sandbox or production webhooks. JWT (ES256) + key cached per `kid` + `request_body_sha256` must match raw body. See `docs/plaid-integration.md` §4.
4. **Local secrets come from macOS Keychain**, not `.env` files. The loader script is `bin/load-secrets.sh`. Keys: `coiny-plaid-client-id`, `coiny-plaid-sandbox-secret`.
5. **No new dependencies without a reason.** Each new package is a supply-chain surface. Prefer Node built-ins (`crypto`, `https`, `node:test`) when sufficient.

---

## Project Conventions

### Monorepo (pnpm workspaces + Turborepo)

- `backend/` — Fastify TS server (Phase 1)
- `firmware/` — nRF52840 + Zephyr (nRF Connect SDK) — Phase 2. See `docs/tech-stack.md` §1 for the rationale (ESP32-S3 was the original plan, swapped 2026-05-20 for battery life).
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
- **Sandbox mode.** Plaid is in sandbox until Phase 5 (when we go through Plaid's production approval flow). No real bank data, no real users. Don't add fake users to "make it feel real" — keep state minimal. Sandbox credentials in Plaid Link: `user_good` / `pass_good`.

When unsure about scope or whether to add something — **ask, don't assume**. Coiny lives or dies on small consistent decisions; one ambiguous choice today turns into three branches of code by next week.
