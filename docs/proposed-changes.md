# Coiny — Proposed Changes (Quality Audit, 2026-05-20)

A summary of every change proposed from the 2026-05-20 quality audit. For
full context see `docs/tech-stack.md`; for execution order see
`docs/implementation-plan.md`.

**Reading guide:** rows in 🟢 are "do now," 🟡 are "do before milestone X,"
⚪ are "decided, deferred." Don't act on this doc — act on the
implementation plan.

---

## Hardware changes

| # | Change | Current | Proposed | Why | Cost | When | Status |
|---|--------|---------|----------|-----|------|------|--------|
| H1 | **Production MCU** | ESP32-S3 (planned) | nRF52840 + Zephyr (production); keep ESP32-S3 (M5StickS3) for prototyping | Battery life: 9-12 months vs 3-5 days on coin cell. Industry standard for BLE wearables (Pebble, Oura, Whoop, Fitbit, Tile). | $0 now; $50 for nRF52840-DK at PCB time | At PCB tape-out, not before | 🟡 |
| H2 | **Display (production)** | TBD | Sharp Memory LCD (LS013B7DH03 or similar) | Always-on at ~µA draw. Tamagotchi "pet is always there" feel. Pebble uses these. | $30 at production design time | PCB design phase | 🟡 |
| H3 | **Battery (production)** | TBD | Rechargeable LiPo (~150-200mAh) + USB-C charging | Coin-cell swap is user friction; modern UX expects plug-in charging | ~$15 (LiPo + charging IC) | PCB design phase | 🟡 |
| H4 | **Haptics motor (production)** | ERM (eccentric mass) — already ordered | LRA (Linear Resonant Actuator) | Apple Watch-style taps vs ERM buzzes. Better "personality" feel. DRV2605L driver supports both — no driver swap needed. | $3-5 swap at production | PCB design phase | 🟡 |
| H5 | **Audio (production)** | Speaker on M5StickS3 | Drop entirely, or use cheap piezo | Most wearables skip audio. Office-friendliness. Power savings. | -$2 to +$1 | PCB design phase | 🟡 |
| H6 | **PMIC / fuel gauge (production)** | None | MAX17048 fuel gauge + dedicated charging IC (MCP73831 or BQ24074) | LiPo without fuel gauge gives bad battery % readings — users notice | ~$15 BOM | PCB design phase | 🟡 |
| H7 | **RGB LED (production)** | None | Single WS2812 or APA102 RGB LED | One RGB > monochrome for color-coded reactions (green=good, amber=warn, red=overspend) | ~$1 BOM | PCB design phase | 🟡 |
| H8 | **EE / PCB design help** | DIY assumed | Contract a freelance EE for PCB layout + RF + FCC pre-cert | RF design + DFM is real engineering. Solo software-eng doing it doubles project risk. | ~$5-10k engagement | Phase 2 hardware kickoff | 🟡 |

**Hardware sunk cost note:** $36.59 M5StickS3 stays in the prototyping kit.
DRV2605L ($7.95) + Qwiic-to-Grove cable ($7.95) + coin motors (10-pack $8.99)
all transfer to the production design — they're I2C/MCU-agnostic. **No
component you've ordered is wasted.**

---

## Software / infrastructure changes

| # | Change | Current | Proposed | Why | Cost | When | Status |
|---|--------|---------|----------|-----|------|------|--------|
| S1 | **Error tracking** | None — pino logs only | Sentry on backend (Fastify SDK) + mobile (Expo SDK) | Production fintech non-negotiable. Catches silent throws, surfaces real user errors. | $0 free tier | This week | 🟢 |
| S2 | **Metrics + traces** | None | OpenTelemetry SDK → Grafana Cloud (Prometheus + Loki + Tempo) | "Why did webhook X fail at 3:42am?" "What's our p99 latency?" — currently unanswerable | $0 free tier | This week | 🟢 |
| S3 | **SAST in CI** | None | Semgrep on every PR | Static analysis catches insecure patterns. Used by Stripe, Block. | $0 free | This week | 🟢 |
| S4 | **Secret scanning** | None | Gitleaks pre-commit hook + CI failsafe | Prevents committing API keys / tokens. Cheap insurance. | $0 free | This week | 🟢 |
| S5 | **Linting** | Expo ESLint only on mobile; backend has no linter | Biome 2.0 across the monorepo | Single binary, 10-25× faster than ESLint+Prettier, one config | $0 free | This week | 🟢 |
| S6 | **Audit logging** | None — silent state changes | `audit_log` table + middleware on every financial-data mutation | SOC 2 / banking partnerships require it. "Who changed what, when" must be answerable. | 1 day to build | Before first real-money user | 🟡 |
| S7 | **Auth provider** | Hardcoded `user_1` | Clerk (recommended) OR WorkOS AuthKit | Custom JWT for fintech = auditors reject. Clerk has best React Native SDK. | $0 free tier (Clerk: 10k MAU, WorkOS: 1M MAU) | Before T2.2 multi-user | 🟡 |
| S8 | **Feature flags** | None | GrowthBook (self-hosted) — or Statsig free tier | "Kill switch" for rule engine during a webhook storm. Required before real users. | $0 self-host | Before first real-user launch | 🟡 |
| S9 | **DB hosting** | Neon serverless | AWS Aurora Serverless v2 in a VPC | SOC 2 / PCI auditors expect VPC + KMS + CloudTrail. Neon stays fine for sandbox. | ~$50-100/mo at low volume | Before first real-money user | 🟡 |
| S10 | **App hosting** | Fly.io | AWS ECS Fargate in a VPC | Same reasoning as S9. Same Docker image runs on both. | ~$30-100/mo at low volume | Before first real-money user | 🟡 |
| S11 | **IaC** | None (config in fly.toml, dashboards) | AWS CDK in TypeScript | Reproducible infra. Language consolidation with backend. Beats Terraform for our stack. | 1 day to scaffold | Before AWS migration | 🟡 |
| S12 | **Native BLE module (mobile)** | None | Swift + Kotlin native module wrapping CoreBluetooth / BluetoothLeScanner, exposed via Expo Modules API | `react-native-ble-plx` background story is rough — JS thread sleeps when app is backgrounded. Need platform-native code for the BLE state machine. | 1 week | Phase 2 (when firmware is talking) | 🟡 |
| S13 | **Aggregator abstraction** | Direct Plaid imports | `AggregatorClient` interface; PlaidAggregator implements it; future FinicityAggregator bolt-on | Decouples rule engine from vendor. Lets us add Finicity for coverage gaps without refactoring. | 4-6 hours | When adding 2nd aggregator (not urgent) | ⚪ |
| S14 | **Threat model doc** | None | `docs/threat-model.md` — STRIDE per surface (webhook, API, mobile, BLE, firmware) | Required for any banking partnership or security review | 1 day | Before first banking partner conversation | 🟡 |
| S15 | **Disaster recovery plan** | None | `docs/disaster-recovery.md` — RTO/RPO, restore procedure, drill cadence | Required for SOC 2 / banking partnership | 1 day | Before first real-money user | 🟡 |
| S16 | **Data retention plan** | None | `docs/data-retention.md` — GDPR/CCPA-aligned retention + deletion process | Banking partner blocker | 0.5 day | Before banking partnership | 🟡 |
| S17 | **Runbooks** | None | `docs/runbooks/` — playbooks per incident class | Operational maturity for on-call | 1 day initial | Before launch | 🟡 |
| S18 | **Push notifications backend** | None — `device_tokens` table only | Expo Push integration on backend (send via Expo's push API) | T2.5 ✅ persistence done; T2.3 = actually sending. Needs APNs key + FCM creds from Antoine. | 1 day + your account setup | After APNs + FCM setup | 🟡 |
| S19 | **Container image scanning** | None | Trivy scan of Docker images in CI | Catches known CVEs in base images / deps | 1 hour | This week | 🟢 |
| S20 | **SBOM generation** | None | Syft (in CI) produces SBOM per release | Banking partnerships ask for it; SOC 2 nice-to-have | 1 hour | Before banking partnership | 🟡 |

---

## Process changes

| # | Change | Current | Proposed | Why | When | Status |
|---|--------|---------|----------|-----|------|--------|
| P1 | **Conventional Commits** | ✅ in place | (no change) | — | — | ✅ |
| P2 | **Branch protection** | ✅ in place (branch-guard hook) | (no change) | — | — | ✅ |
| P3 | **PR review** | Self-merge while solo | Required 2-reviewer approval at headcount ≥2 | SOX/SOC 2 require it; not relevant while solo | When 2nd dev joins | ⚪ |
| P4 | **ADRs for non-trivial decisions** | Ad-hoc (some captured in docs) | Numbered ADR per non-trivial decision, in `docs/adr/` | Decision provenance for future contributors and auditors | Going forward, one per decision | 🟡 |

---

## What we got RIGHT — keep, do not churn

These showed up in the audit as correctly-chosen and don't need to change:

- **Plaid** as bank data aggregator
- **Postgres** as DB engine
- **Drizzle ORM** (passed Prisma in 2025; smaller bundle; better fintech audit story than ORM-heavy alternatives)
- **Fastify + Node.js + TypeScript** for backend (workload is I/O-bound)
- **React Native + Expo** for mobile app shell (with native BLE module bridge)
- **GitHub Actions** for CI
- **pnpm + Turborepo** monorepo
- **Vitest + PGlite** for tests
- **`jose`** for JWT verification
- **`undici`** for HTTP client
- **Dependabot** (added 2026-05-20)

---

## Recommended skips

Things we discussed but decided NOT to change at our stage:

- **Backend language switch (Node → Go)** — Fastify's perf is near-Go for our I/O workload. Not the limiting factor. Revisit if rule evaluation becomes hot.
- **Native iOS + Native Android full rewrite** — RN with native BLE bridge handles our case. Trigger for full rewrite: HealthKit need, >25k MAU, or 2+ mobile devs.
- **Datadog / New Relic** — Sentry + Grafana free tiers do the same job at our scale.
- **LaunchDarkly** — GrowthBook self-hosted covers our needs.
- **Auth0** — too expensive at scale; Clerk/WorkOS are better for our case.
- **Kubernetes / EKS** — Fargate is the right managed-container target. K8s only worth it at much larger scale.

---

## Decisions still owed

Decisions that need to be made before the relevant work can start. None are
blocking today's work; flagged for visibility.

| Decision | Default if no input | When required |
|---|---|---|
| Clerk vs WorkOS AuthKit | Clerk | Before T2.2 multi-user |
| GrowthBook vs Statsig | GrowthBook (self-host) | Before first real-user launch |
| AWS CDK vs Terraform | AWS CDK (TypeScript) | Before AWS migration starts |
| nRF52840 vs nRF54L15 | nRF52840 | Phase 2 hardware kickoff |
| Native rewrite trigger for mobile | "HealthKit or 25k MAU or 2+ mobile devs" | Quarterly re-evaluation |
