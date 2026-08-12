# Coiny: Claude Code Working Conventions

Coiny is an iOS app that shows you everything you own in one number, fronted by
a creature whose wellbeing depends on whether you are making financial progress.
It reacts to what the user controls, never to the market.

**Pivoted app-first on 2026-08-11.** Hardware is a post-launch expansion item,
gated at 1,000 paying subscribers still active at 3 months. Do not put firmware
work on the critical path.

**Read these first:**
- `docs/vision.md`: strategy, positioning, honest state of the build, the hardware gate
- `docs/prd-app-v2.md`: THE product spec. Onboarding, goal system, debt, mechanics, pricing
- `docs/design-direction.md`: art direction, the character brief, the anti-AI-slop system
- `docs/global-integration-map.md`: integrations by region, entity unlock checklist, cost model
- `docs/market-research-2026-08.md`: competitors, pricing, why people quit. §1 argues against the product
- `docs/spec-methodology.md`: how to write a buildable spec, plus a gap analysis of the PRD
- `docs/obligations.md`: what regulation, providers and Apple require, and when
- `docs/engineering-budgets.md`: performance, cost and freshness budgets; the instrumentation spec
- `docs/plaid-integration.md`: Plaid API contract reference

**Do not cite these. They are hardware-era and contradict the live spec:**
`handoff.md`, `architecture.md`, `security.md` (use `.claude/rules/security.md`),
`product-brief.md` (superseded by the PRD), `business-plan.md` (rests on a churn
statistic that could not be traced to any source), `tech-stack.md`,
`implementation-plan.md`, `proposed-changes.md`, `feature-backlog.md`,
`stack-map.md`, `launch-readiness.md`, `14-day-sprint.md`, `3-day-sprint.md`,
`sprint-plan.md`, `development-plan.md`, `phase1-spec.md`, `mqtt-topics.md`.

---

## Git Conventions

### Branching (MANDATORY)

- **Never commit to `main` directly.** A hook enforces this, commits on main
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
- Self-review even when solo, forces a checkpoint
- Use `gh pr create` from the terminal; don't open a draft and forget about it

---

## Code Conventions

### TypeScript

- `strict: true` always. No `any` unless commented with why.
- Zod schemas for any external input (env, HTTP body, webhook payload).
- Infer types from Zod schemas via `z.infer<typeof schema>`: don't double-declare.
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
- Integration tests for HTTP endpoints use Fastify's `app.inject()`: no live server.

---

## Security Rules (NEVER VIOLATE)

1. **Never commit secrets.** `.env` files, any `*.pem` / `*.key`, vendor cert exports, all gitignored. If you find a tracked secret, halt and tell the user.
2. **Never log PII or transaction details.** Log event types + pseudonymous IDs (transaction_id, item_id) only. See `.claude/rules/security.md` #2.
3. **Plaid webhook signature verification is required** on every webhook in code paths that touch sandbox or production webhooks. JWT (ES256) + key cached per `kid` + `request_body_sha256` must match raw body. See `docs/plaid-integration.md` §4.
4. **Local secrets come from macOS Keychain**, not `.env` files. The loader script is `bin/load-secrets.sh`. Keys: `coiny-plaid-client-id`, `coiny-plaid-sandbox-secret`.
5. **No new dependencies without a reason.** Each new package is a supply-chain surface. Prefer Node built-ins (`crypto`, `https`, `node:test`) when sufficient.

---

## Project Conventions

### Monorepo (pnpm workspaces + Turborepo)

- `backend/`: Fastify TS server (Phase 1)
- `firmware/`: nRF52840 + Zephyr. **Parked.** Hardware is a post-launch expansion behind the gate in `docs/vision.md` §8. Do not work on this unless explicitly asked.
- `ios/`: Native Swift + SwiftUI app (XcodeGen-managed). See `ios/README.md` for setup. Replaces the RN-based `mobile/` over time; both coexist during transition.
- `mobile/`: Expo React Native (Phase 3)
- `shared/`: cross-package TS types (BLE schema, pet state)
- `hardware/case/`: OpenSCAD CAD files

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
- **Sandbox mode.** Plaid is in sandbox. Note `fly.toml` sets `PLAID_ENV=sandbox` in the deployed production app, so never use `PLAID_ENV` as a proxy for "is this production"; use `NODE_ENV`. No real bank data, no real users. Don't add fake users to "make it feel real", keep state minimal. Sandbox credentials in Plaid Link: `user_good` / `pass_good`.

When unsure about scope or whether to add something, **ask, don't assume**. Coiny lives or dies on small consistent decisions; one ambiguous choice today turns into three branches of code by next week.
