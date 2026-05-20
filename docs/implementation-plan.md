# Coiny — Software Implementation Plan

Executable sequence for the software changes proposed in `docs/proposed-changes.md`.

This is a working doc — items get checked off as they ship, gates get marked as
they pass. The order is chosen to (a) front-load the cheap wins, (b) put quality
foundations under the next round of feature work, and (c) gate the bigger
migrations behind validation milestones.

**Target horizon:** ~3 weeks of solo dev work to go from "polished prototype"
to "production-grade fintech-hardware product, ready for first real-money
user pilot."

---

## Milestones

| Milestone | Definition | What unlocks |
|---|---|---|
| **M1: Quality floor** | S1-S5, S19 shipped. Sentry catches errors. CI runs Semgrep + Gitleaks. Biome lints everything. | Confidence to ship features without flying blind |
| **M2: Auth + flags** | S7 (Clerk or WorkOS) + S8 (GrowthBook) shipped. T2.2 multi-user implemented. | Multi-user features possible. Real-user beta is unblocked. |
| **M3: Compliance docs** | S14, S15, S16, S17 written. S6 audit-log table shipped. | Conversation with banking partner is possible. |
| **M4: Production infra** | S9 (Aurora) + S10 (ECS Fargate) + S11 (CDK) live. Old Neon + Fly retired. | First real-money user can be onboarded. |
| **M5: Phase 2 prep** | S12 native BLE module written. Plaid aggregator abstraction (S13) optional. | Firmware Phase 2 can integrate against a stable mobile BLE layer. |

---

## Sprint plan

Sequence of PRs. Each row is one focused PR; each PR squash-merges to main.
Estimated effort assumes solo work + my (Claude) coding speed.

### M1 — Quality floor (target: this week, ~1-2 days)

| # | PR title | Effort | Notes |
|---|----------|--------|-------|
| 1 | `chore(ci): add Semgrep SAST + Trivy container scan` | 2 h | New `.github/workflows/security.yml`. Use Semgrep auto config. Trivy on Docker image. |
| 2 | `chore(ci): add Gitleaks pre-commit + CI failsafe` | 1 h | `.pre-commit-config.yaml` + `.gitleaks.toml` + workflow step. |
| 3 | `chore: add Biome 2.0 to monorepo` | 2 h | `biome.json` at root. Replace Expo ESLint where it conflicts. Run Biome in CI. |
| 4 | `feat(backend): wire Sentry SDK into Fastify` | 1 h | Free Sentry project. SENTRY_DSN as Fly secret. |
| 5 | `feat(mobile): wire Sentry Expo SDK` | 1 h | Same Sentry project, different DSN. Source maps via Expo build hook. |
| 6 | `feat(backend): wire OpenTelemetry SDK → Grafana Cloud` | 3 h | Free Grafana Cloud account, OTLP endpoint creds as Fly secrets, instrument Fastify routes. |

**Gate M1:** `fly logs` quieter (errors flow to Sentry instead); Grafana
dashboard shows p50/p95/p99 webhook latency; security workflow green on a
test PR.

### Pause for re-evaluation (decision points)

Before continuing, lock these decisions:
- **Auth provider:** Clerk or WorkOS AuthKit (default: Clerk)
- **AWS IaC tool:** CDK in TypeScript or Terraform (default: CDK)
- **APNs key + FCM creds:** Antoine sets up Apple Developer account ($99/yr)
  and Firebase project (free) so T2.3 push pipeline can be built

### M2 — Auth + multi-user (target: week 2, ~3-4 days)

| # | PR title | Effort | Notes |
|---|----------|--------|-------|
| 7 | `feat(backend): integrate Clerk session validation middleware` | 1 d | Verify Clerk session JWT on every `/api/*` route. Wire `user_id` into request context. |
| 8 | `feat(mobile): integrate Clerk RN SDK` | 1 d | Sign-in screen, session storage, attach session to API calls. |
| 9 | `feat(backend): multi-user schema migration (T2.2)` | 1 d | Add `user_id` column to: `pet_state`, `plaid_items`, `device_tokens`, `category_overrides`, `transactions`. Backfill existing rows with `user_1`. |
| 10 | `feat(backend): scope all queries by user_id` | 1 d | Update every store function. Add user-id-isolation tests. |
| 11 | `chore(infra): add GrowthBook self-hosted on Fly` | 0.5 d | Second Fly app for GrowthBook. Wire SDK into backend. |

**Gate M2 (G4 in handoff):** Two test users see only their own data.

### M3 — Compliance + audit logging (target: week 2 end, ~2 days)

| # | PR title | Effort | Notes |
|---|----------|--------|-------|
| 12 | `feat(backend): add audit_log table + middleware` | 1 d | New table; middleware logs every mutation with `actor` / `action` / `before` / `after`. |
| 13 | `docs: threat model + disaster recovery + data retention + runbooks` | 1 d | `docs/threat-model.md`, `docs/disaster-recovery.md`, `docs/data-retention.md`, `docs/runbooks/`. |

**Gate M3:** Audit-log table populates on every PUT/POST that touches financial
data; compliance doc bundle complete.

### M4 — Production infra migration (target: week 3, ~3-5 days)

This milestone is gated by the "first real-money user" conversation — don't
execute until that's imminent. But have the plan ready.

| # | PR title | Effort | Notes |
|---|----------|--------|-------|
| 14 | `feat(infra): AWS CDK scaffold + VPC + Aurora Serverless v2` | 1 d | New `infra/` directory. `cdk synth` produces CloudFormation. |
| 15 | `feat(infra): ECS Fargate service for backend + ALB` | 1 d | Same Docker image as Fly. ALB in front, target group, health checks. |
| 16 | `feat(infra): Secrets Manager for PLAID_* + DATABASE_URL` | 0.5 d | Migrate from Fly secrets, IAM-managed access. |
| 17 | `chore: switch CI deploy from Fly → AWS ECS` | 1 d | `aws-actions/configure-aws-credentials` + `aws-actions/amazon-ecs-deploy-task-definition`. |
| 18 | `chore: cut over DNS + decommission Fly + Neon` | 0.5 d | DNS flip, soak old infra for 24h, then delete. |

**Gate M4 (G2-Plaid re-validation):** New AWS-deployed backend handles a
sandbox Plaid webhook end-to-end. CloudWatch + Sentry show traffic. Old
infra retired.

### M5 — Mobile native BLE + Phase 2 prep (target: week 3-4, ~1 week)

This dovetails with Phase 2 hardware work.

| # | PR title | Effort | Notes |
|---|----------|--------|-------|
| 19 | `feat(mobile): native BLE module (iOS Swift)` | 2-3 d | Expo Modules API. Wraps CoreBluetooth. Handles background. |
| 20 | `feat(mobile): native BLE module (Android Kotlin)` | 2-3 d | Wraps BluetoothLeScanner. Foreground service for background BLE. |
| 21 | `feat(mobile): JS interface to BLE module` | 1 d | React hook + state machine. |

**Gate M5:** Phone can scan for Coiny device, connect, write to a test
characteristic, hold connection through app backgrounding.

---

## Pending feature backlog (paused during quality floor)

These items were already in the pre-hardware backlog before this audit. They
resume after M1:

- **T2.3** Push pipeline backend → APNs/FCM (needs Antoine's Apple Dev + Firebase)
- **T2.4** Already done as Plaid Link endpoints (rename to `/api/banks/connect` if desired)
- **mobile/plaid-link-mobile** Mobile bank-link screen wiring (uses Plaid Link RN SDK)

---

## What's needed from Antoine

| When | Item | How |
|------|------|-----|
| **Before M1** | Sentry account | sentry.io free signup, give me the DSN |
| **Before M1** | Grafana Cloud account | grafana.com/products/cloud free tier, give me the OTLP endpoint + token |
| **Before M2** | Auth decision (Clerk vs WorkOS) | Read §4 in `docs/tech-stack.md`, pick one |
| **Before M2** | Clerk account (or WorkOS) | Sign up, give me publishable key + secret |
| **Before M2** | APNs key + Firebase project | Apple Developer ($99/yr) + Firebase console (free); hand me both credential bundles |
| **Before M4** | AWS account | Console signup, IAM user with admin for migration; later restrict |
| **Before M5** (Phase 2) | M5StickS3 firmware loaded with test BLE service | Physical hardware testing |
| **Phase 2** | Hardware EE contractor | Find via Upwork / Toptal / referral; ~$5-10k engagement |

---

## What I (Claude) execute alone — no blocker

Everything in M1 except the Sentry DSN + Grafana token (you give me those, I
do everything else). Same for M2 / M3 / M4 — I write the code, you provide
the third-party account credentials.

For the **firmware port (M5StickS3 → nRF52840)** and the **PCB design**, I
can write firmware code and review schematics, but I cannot place a PCB
order or pre-certify FCC. Those need you or a hired EE.

---

## Status tracking

Check items off as you ship them. Updated 2026-05-20.

- [ ] M1 — Quality floor
  - [ ] PR 1 — Semgrep + Trivy
  - [ ] PR 2 — Gitleaks
  - [ ] PR 3 — Biome
  - [ ] PR 4 — Sentry backend
  - [ ] PR 5 — Sentry mobile
  - [ ] PR 6 — OpenTelemetry + Grafana Cloud
- [ ] M2 — Auth + multi-user
  - [ ] Decision: Clerk vs WorkOS
  - [ ] PR 7 — Clerk backend middleware
  - [ ] PR 8 — Clerk mobile integration
  - [ ] PR 9 — Multi-user schema migration
  - [ ] PR 10 — Scope queries by user_id
  - [ ] PR 11 — GrowthBook
- [ ] M3 — Compliance + audit
  - [ ] PR 12 — audit_log table
  - [ ] PR 13 — compliance docs bundle
- [ ] M4 — AWS migration
  - [ ] PR 14 — CDK + Aurora
  - [ ] PR 15 — ECS Fargate
  - [ ] PR 16 — Secrets Manager
  - [ ] PR 17 — CI/CD cutover
  - [ ] PR 18 — DNS + decommission
- [ ] M5 — Native BLE module
  - [ ] PR 19 — iOS Swift module
  - [ ] PR 20 — Android Kotlin module
  - [ ] PR 21 — JS interface

---

## Out of scope for this plan

- Hardware design (PCB, BOM finalization) — separate Phase 2 firmware/hardware plan
- Apple App Store + Google Play submission — Phase 3
- Marketing site, billing, support tooling — Phase 4
- ML / data science for transaction enrichment — explicit defer, would be a separate Python service if/when needed
- International expansion (TrueLayer/Tink for EU) — Phase 5
