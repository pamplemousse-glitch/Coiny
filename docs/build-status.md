# Build status, 2026-08-13

Working state of the `integration/night-build` branch and everything open.
Written so the next session (human or agent) does not have to reconstruct it.

---

## Where the work is

**Branch:** `integration/night-build`, open as **PR #191** against `main`.
48+ commits, ~220 files. Nothing merged to `main` yet.

**CI:** all security gates green (Gitleaks, Semgrep, Trivy, SBOM, CodeQL).
The backend `test` job is **RED**, for a reason understood but not yet fixed.
See "The open CI failure" below. Everything passes locally.

---

## What was built

Seventeen workstreams, each built in an isolated worktree, then merged and
reconciled centrally.

| Area | State |
|---|---|
| Instrumentation + W4 retention query | Built |
| Freshness read path, per-class status, no silent zeros | Built |
| Scheduler (15-min in-process tick) | Built |
| Plaid lifecycle + Link update mode + institution name | Built |
| Goals, guardrails, streaks, skip-with-reason | Built |
| Debt dedupe, payoff strategy, and the debt UI | Built |
| Push day-cap, quiet hours, per-device timezone | Built |
| StoreKit + server-authoritative entitlements | Built |
| iOS onboarding rewrite | Built |
| iOS journey (tap the creature) | Built |
| iOS Wealth: six groups, statuses, repair, offline | Built |
| declared_assets persistence | Built |
| Reaction contract: collect-all + explicit precedence | Built |
| Transaction merchant PII encrypted at rest | Built |
| Compliance floor (policy, ToS, manifest, labels) | Written, needs a lawyer |
| Environments research + setup runbook | Written, needs decisions |

**Local verification, last full run:** backend 1,403 passed / 0 failed at CI
settings (`test:coverage`, full parallelism); typecheck clean; lint exit 0 with
the 9 pre-existing warnings; iOS 489 unit + 19 UI passed; migrations 0039-0048
verified from an empty database.

---

## The CI failure, resolved 2026-08-14

**Root cause: three Node versions.** Local 26, CI 22, Docker image 22. Nothing
was testing what ships.

The visible symptom was twenty tests passing locally and failing in CI while
quietly making real HTTP requests to Plaid. MockAgent installs a dispatcher
through the npm `undici` package, and whether the built-in global `fetch`
honours it depends on Node's bundled undici matching the packaged one. It
matched on the laptop and did not on the runner, silently, so
`disableNetConnect` was never consulted.

I chased the interop twice and both fixes traded one break for another. Fixed
by pinning Node 26 in the four places that must agree (`.nvmrc`,
`backend/package.json` engines, every workflow, the Dockerfile) plus a test that
asserts the interception itself, including that an unmocked request is refused
rather than reaching the network.

Follow-on caught by CI: `node:26-alpine` dropped corepack, so the image build
failed on `corepack enable`. pnpm now installs from npm, version still pinned.

<details><summary>Original diagnosis, kept for the record</summary>



**Symptom.** Twenty tests fail in CI and pass locally. Every failing test makes
a mocked Plaid HTTP call. Every webhook test that only touches the database
passes.

**Root cause.** CI returns `INVALID_FIELD`, a real Plaid error code, which means
CI is making **real network calls**: `MockAgent` is not intercepting there.

Local Node is 26 (bundled undici 8.9.0) and the repo depends on npm `undici`
8.x. Same major, so `setGlobalDispatcher` and the built-in global `fetch` share
a dispatcher and interception works. **CI runs Node 22**, whose bundled undici
is a different major, so the package's `setGlobalDispatcher` does not affect
global `fetch` and the calls go to the real provider.

The Plaid client used to call `undici.request` from the package directly. Moving
it onto `fetchWithRetry` (which uses global `fetch`) silently broke interception
on Node 22 only.

**Attempted and reverted.** Pointing `fetchWithRetry` at undici's `fetch` fixes
the MockAgent tests and breaks the Coinbase and Zerion tests, which stub the
*global* fetch with `vi.stubGlobal`. One or the other, not both.

**The real defect underneath it:** three different Node versions. Local 26, CI
22, production `node:22-alpine`. Nothing was testing what ships. Fixing the
symptom without fixing that just moves the failure.

**Recommended fix, not yet done:** pin one Node version everywhere.

</details>

---

## Also fixed this session

- **Migration journal ordering.** Four branches each picked a plausible
  timestamp; merged, two sat below an earlier one, and Drizzle silently skips
  those. The entire goals schema would never have run in production with no
  error. Renumbered 0039-0048 and verified against an empty database.
- **Five telemetry mismatches**, all silent: the server rejects unknown events
  rather than erroring, so the funnel would have looked wired and measured
  nothing.
- **A live R-9.5 violation.** Push was keyed on animation and the allowlist
  included `sad`, so a single overspend could push a phone. Now keyed on event.
- **Three timing-dependent tests** that asserted machine speed, all green
  locally and red in CI.
- **Appendix C regenerated** (~50 stale rows) and three false facts corrected in
  `backend/CLAUDE.md`.

---

## Corrections to things I previously stated wrongly

- **Fly deploys are automatic, not manual.** `.github/workflows/backend-deploy.yml`
  deploys on any PR merge touching `backend/**`. I said manual twice, including
  in the PR body, from a stale note instead of reading the workflow.
- **"Lint is clean" was wrong** at one point: I ran biome from the repo root
  rather than the project's own `lint` script, which resolves config differently
  and hid real errors.
- **"Pre-existing lint errors"** was asserted by four agents and by me. `main`
  has zero errors. Nobody checked until late.

---

## Environments: the current truth

**Corrected 2026-08-14.** `coiny-backend` is staging, and always was: it has
only ever held sandbox keys and synthetic data. Production is a separate app
that does not exist yet and is created only when real credentials arrive.

| | App | Config | State |
|---|---|---|---|
| Staging | `coiny-backend` | `fly.toml` (the default) | Live, sandbox keys, Neon `staging` branch |
| Production | `coiny-api` (placeholder name) | `fly.production.toml` | Does not exist yet, deliberately |

Neon has both branches: `production` (holds the migration history, currently at
0037) and `staging` (copy-on-write child).

Two documents now exist:
- `docs/environments-research.md` (the decision document, with a mermaid diagram
  of both environments end to end)
- `docs/environments-setup.md` (the numbered runbook, Founder vs Agent steps,
  the 44-variable secret inventory, verification, and cutover order)

**Headline recommendation:** staging as a new scale-to-zero Fly app plus a Neon
branch, all sandbox keys, synthetic data forever; the existing app kept under
its own name and frozen until real keys arrive, then wiped and promoted. GitHub
Environments as the source of truth, with production behind a required reviewer.
Migrations move off app boot to a release command. Under $5/mo now, roughly
$25-40/mo at launch.

---

## Founder tasks (nothing here is blocked on the agent)

Ordered by lead time. Full detail in `docs/legal/founder-checklist.md` and the
setup runbook.

1. **D-U-N-S number**, then convert the Apple account to an Organization
   (team `UKL98DS9D3`). Blocks TestFlight and StoreKit. Weeks of lead time.
2. **Commission the character.** Every screen ships a placeholder. Critical path.
3. **Lawyer** on `docs/legal/privacy-policy.md` and `terms-of-service.md`.
4. **Plaid production access** application.
5. Quick wins: MFA everywhere, the Discogs and YNAB emails (drafted), sign the
   Safeguards designation, pick the product name.

---

## Known gaps, deliberately left

- App Review demo account (R-15.7) does not exist. Submission blocker.
- Revoke-all-sessions: sign-out kills one token, a stolen device stays signed in.
- Retention purge job (R-22.3) and backup restore rehearsal (R-20.x).
- Manual VoiceOver pass (R-11.6) has never been run and gates first TestFlight.
- Debt analytics events: the catalog has no debt names. Four agents correctly
  refused to invent them rather than emit events the server silently rejects.
- Household invite flow, blocked on the two-party consent legal review.
- The transaction-encryption **backfill script must be run once against
  production after deploy**; the key never reaches Postgres.

---

## Deploy ordering constraint

The iOS client now requires `classes`, `excluded` and `generatedAt` in the
net-worth response. **The backend must be deployed before that iOS build
ships.** Since backend deploys fire automatically on merge, merging PR #191 is
what deploys it.
