# Coiny — Tech Stack (Quality-First)

**Audit date:** 2026-05-20
**Authors:** Antoine + Claude (Opus 4.7)
**Why this doc exists:** After a quality-vs-velocity audit on 2026-05-20 we
identified the gaps between our shipping prototype and what a production
fintech-with-hardware product actually needs. This doc records the corrected
stack, the migration paths, and the rationale. Companion: `tech-stack-research.md`
holds the underlying research and citations.

---

## TL;DR — three changes that matter most

| # | Change | When | Cost |
|---|--------|------|------|
| 1 | **Firmware: nRF52840 + Zephyr is the production chip; M5StickS3 (ESP32-S3) is correct for prototyping. Switch at PCB tape-out, not before.** | At PCB design time, months away. NOT NOW. | Sunk cost on M5StickS3 ($36.59) is acceptable — it's the right dev board for Phase 2 firmware work. |
| 2 | **Add observability + security floor** (Sentry, Grafana Cloud via OTel, Semgrep, Gitleaks) | Before next feature work | ~1 day. All free tiers at our scale. |
| 3 | **Lock in auth provider (Clerk or WorkOS) and plan the AWS migration as an ADR** | Before T2.2 multi-user | 1 day decision + 1 day plan doc. AWS migration itself happens before first real-money user. |

Everything else is correct or acceptable for Phase 1.

---

## Layer-by-layer decision matrix

| Layer | Current | Target (quality-first) | Status |
|---|---|---|---|
| **Firmware MCU** | ESP32-S3 (M5StickS3 dev board, already ordered) | nRF52840 + Zephyr **for production**; ESP32-S3 stays for prototyping | 📅 Switch at PCB tape-out, not before — see §1 |
| **Mobile app** | React Native + Expo + TS | React Native + native BLE modules (Swift + Kotlin) | ✅ Keep, plus native BLE bridge in Phase 2. See §2. |
| **Backend language** | Node 22 + Fastify + TypeScript | Same | ✅ Keep — Fastify is near-Go for our I/O-bound workload |
| **Backend ORM** | Drizzle | Same | ✅ Keep — passed Prisma in 2025 npm downloads; 12% raw-SQL overhead vs Prisma's 29% |
| **Database engine** | Postgres 17 | Same | ✅ Keep — industry default for fintech |
| **DB hosting** | Neon (serverless) | AWS Aurora Serverless v2 in a VPC | 📅 Migrate before first real-money user — see §3 |
| **App hosting** | Fly.io | AWS ECS Fargate in a VPC | 📅 Migrate before first real-money user — see §3 |
| **Bank data** | Plaid (sandbox) | Plaid (production) + Finicity for coverage gaps | ✅ Keep, abstract behind `AggregatorClient` interface for future Finicity bolt-on |
| **Authentication** | Hardcoded `user_1` | Clerk OR WorkOS AuthKit | 🔄 Decide before T2.2 — see §4 |
| **Push notifications** | Expo Push (planned) | Expo Push v1, direct APNs/FCM at scale (Live Activities, critical alerts) | ✅ Keep |
| **Observability** | `pino` logs only | Sentry (errors) + Grafana Cloud via OpenTelemetry (metrics+logs+traces) | 🔄 Add this week — see §5 |
| **SAST / security** | Dependabot only | Dependabot + Semgrep + Gitleaks (pre-commit) | 🔄 Add this week — see §6 |
| **Feature flags** | none | GrowthBook (self-host) or Statsig (free tier) | 📅 Add before first real user — see §7 |
| **CI/CD** | GitHub Actions | GitHub Actions + EAS Build (mobile) | ✅ Keep |
| **HTTP client** | `undici` | Same | ✅ Keep |
| **JWT verification** | `jose` | Same | ✅ Keep |
| **Testing** | Vitest + PGlite | Same | ✅ Keep |
| **Linting** | (ESLint via Expo for mobile only) | Biome 2.0 for the monorepo | 🔄 Add — single binary, 10-25× faster than ESLint+Prettier |
| **Audit logging** | none | Append-only `audit_log` table for every state change touching financial data | 📅 Add before first real-money user — see §8 |
| **Code review** | self-merge (solo dev) | Required PR approval at headcount ≥2 | ✅ Acceptable while solo |

Legend: ✅ keep · 🔄 change now or soon · 📅 plan now, execute before scale gate

---

## §1 — Firmware: prototype on M5StickS3 (ESP32-S3), ship on nRF52840

**Decision:** Keep the M5StickS3 (ESP32-S3) for prototyping; switch the
production hardware to nRF52840 + Zephyr (nRF Connect SDK) at PCB design time.

**This corrects an earlier over-recommendation.** In a prior draft of this doc
I said "switch firmware now." That was wrong given what's been ordered. The
M5StickS3 you already bought ($36.59) is the right dev board for Phase 2
firmware work — built-in LCD, speaker, mic, battery, USB-C, IMU, Grove
connector. Nothing comparable in the nRF52840 dev-kit ecosystem.

**The real recommendation: write firmware twice.** Phase 2 prototype on the
M5StickS3 (validate the product concept, BLE protocol, app integration,
haptic feedback). Then port to nRF52840 at PCB tape-out (a 1-2 week port,
not a rewrite, because the BLE GATT schema and rule-engine integration
transfer 1:1).

**Why nRF52840 is still the production target:**

| Battery life (BLE-only workload, intermittent advertising) | ESP32-S3 | nRF52840 |
|---|---|---|
| On a CR2032 coin cell | 3-5 days | 9-12 months |
| On 150mAh LiPo (typical coin-form factor) | 5-7 days | 4-6 months |

For a Tamagotchi-form-factor carry device whose magic is "always with you,"
nRF52840 is the difference between a product and a paperweight.

**Verifiable production use of nRF52840:**
- Pebble Core 2 Duo (relaunched 2025)
- Ultrahuman Ring Air
- Oura Ring Gen 3
- Whoop strap
- Most Fitbit models
- Tile

**Newer alternative to evaluate at tape-out:** nRF54L15 (released late 2024)
offers ~30% better power efficiency than nRF52840. Default nRF52840 unless
the extra savings prove material.

**What transfers from the M5StickS3 prototype work to nRF52840 production:**
- BLE GATT service schema and characteristics
- Phone↔device protocol (command messages)
- Haptic patterns (DRV2605L hardware transfers — it's I2C, MCU-agnostic)
- Vibration motors (transfer)
- Rule-engine integration in the backend (no firmware tie)

**What gets rewritten in the port:**
- The C/C++ HAL: ESP-IDF → Zephyr / nRF Connect SDK
- BLE stack API: NimBLE/Bluedroid → SoftDevice or Zephyr Bluetooth
- GPIO/peripheral access (Zephyr uses device-tree overlays)
- Power management policies

**Toolchain change at port time:**
- PlatformIO → nRF Connect SDK (`west` build tool)
- Recommended IDE: VS Code + `nRF Connect for VS Code` extension

---

## §2 — Mobile: React Native + native BLE modules

**Decision:** Stay on React Native + Expo for the app shell, write the BLE
bridge as a native module (Swift on iOS, Kotlin on Android).

**Why not a full native rewrite (yet):** Pure-native iOS+Android would double
maintenance: every screen written twice, every API client written twice, two
release pipelines. For a solo developer pre-PMF, the velocity loss is fatal.

**Why not pure React Native:** `react-native-ble-plx` works but the background
BLE story is rough (JS thread sleeps when app is backgrounded). For a
companion device that must maintain a stable BLE connection while phone is
locked, we need platform-native code.

**The accepted compromise:**
- All UI, navigation, API clients, state management: React Native + Expo + TS
- BLE service (scan, connect, manage GATT characteristics, persist across
  app lifecycle): native Swift module + native Kotlin module, exposed to JS
  via Expo Modules API (`expo-modules-core`)
- Estimated native BLE code: ~200 lines Swift + ~200 lines Kotlin per platform

**Re-evaluation trigger (when to consider full native rewrite):**
- HealthKit / Health Connect integration becomes needed
- App grows past ~25k MAU (when polish complaints start hurting growth)
- A second mobile developer joins (frees us from solo-dev velocity constraint)

**Verifiable production use of "RN + native BLE module" pattern:**
- Tile mobile app
- Tonal app (smart fitness equipment)
- Many post-Fitbit indie hardware companions

---

## §3 — AWS migration plan (Neon → Aurora, Fly → ECS Fargate)

**Decision:** Document the migration path now; execute before the first
real-money user (i.e., before Plaid production access review).

**Why migrate at all:**
- SOC 2 / PCI auditors expect VPC isolation, KMS-managed encryption keys,
  CloudTrail audit logs, and IAM-controlled access. Neon and Fly are
  excellent products but aren't structured around the SOC 2 / PCI evidence
  trail.
- Banking partners (when we get one) will ask "where are bank tokens
  encrypted at rest, who has access?" — the answer needs to be VPC + KMS +
  IAM roles, not "Fly's secrets vault."

**Target architecture:**
- **AWS account** with separate sandbox + production sub-accounts (org
  structure)
- **VPC** with private subnets for backend + DB
- **AWS Aurora Serverless v2 Postgres** in the private subnet — same
  Drizzle schema, just a different connection string
- **AWS ECS Fargate** running the same Docker image we run on Fly today
- **AWS Secrets Manager** for `PLAID_*` secrets (replaces Fly secrets)
- **CloudFront** in front of the API Gateway / ALB
- **CloudTrail** + **GuardDuty** for audit + threat detection

**Why migration is cheap (~1 weekend):**
- Our Drizzle schema is portable as-is — Aurora is wire-compatible Postgres
- Our Docker image runs identically on ECS Fargate as on Fly Machines
- Our code reads `DATABASE_URL` from env — flipping it is a single secret
- The only new code: Terraform / AWS CDK for IaC (we should commit to one
  before starting — recommend **AWS CDK in TypeScript** so the IaC code
  lives in the same language as everything else)

**Architecture decisions to make BEFORE the migration:**
1. ECS Fargate vs EKS — Fargate (no Kubernetes overhead for our scale)
2. CDK vs Terraform — CDK in TypeScript (language consolidation)
3. Multi-region or single-region? — single (`us-east-1`) for v1
4. Disaster recovery RTO/RPO targets — 1h / 15min acceptable for Phase 4

---

## §4 — Authentication: Clerk OR WorkOS AuthKit

**Open decision:** Pick before T2.2 multi-user accounts.

**The two finalists:**

**Clerk** — best React Native SDK in the auth space. Excellent DX, drop-in
sign-in components, social login built in. Free up to 10k MAU. Used by
Linear, Vercel, hundreds of indie/startup React Native apps. Lock-in is
moderate (proprietary user model, harder to migrate out).

**WorkOS AuthKit** — newer entrant, free to 1M MAU as of 2025-26. More
"enterprise-friendly" (SSO, SAML, SCIM ready). Less polished mobile DX than
Clerk. Lock-in lower (built on standard protocols).

**What we explicitly rule out:**
- **Custom JWT roll-your-own** — auditors reject custom auth for fintech;
  weekend-a-quarter maintenance burden
- **Neon Auth** — too new, would tie auth tightly to one DB vendor
- **Supabase Auth** — would imply moving DB to Supabase, undoing other decisions
- **Auth0** — fine but expensive at scale ($240/mo at 1k users)

**Recommendation:** **Clerk** unless we anticipate enterprise SSO needs (we
don't, for a consumer fintech). Better mobile DX matters more than enterprise
features at our stage.

**Action when we decide:** create the Clerk app, wire it into the React
Native client (Expo dev client), add session-token validation middleware in
the backend, then proceed with T2.2.

---

## §5 — Observability stack

**Decision:** Sentry + Grafana Cloud via OpenTelemetry.

| Tool | Role | Cost |
|---|---|---|
| **Sentry** | Error tracking (backend Fastify + mobile Expo) | Free tier, 5k errors/mo — well above our usage |
| **Grafana Cloud** | Metrics (Prometheus), logs (Loki), traces (Tempo) | Free tier, 10k metrics + 50GB logs/mo |
| **OpenTelemetry** | Instrumentation SDK in Fastify; emits to Grafana Cloud | Free, vendor-neutral |
| **Statuspage** | Public status page when we have users | Free for solo |

**What this unblocks:**
- "Why did webhook X fail at 3:42am yesterday?" — Sentry has the stack
- "What's our p99 webhook latency this week?" — Grafana metric
- "Trace this user's transaction from Plaid webhook → rule eval → DB write" —
  Tempo trace
- "Is the rule engine throwing exceptions silently?" — Sentry catches uncaught
  rejections

**Datadog comparison (and why we don't pick it yet):** Datadog is what
Plaid/Stripe/Mercury/Robinhood run. It's the consensus pick at scale. But it
costs ~$104k/yr for an SMB tier. Free tier + Grafana stack covers everything
Datadog does until we have real revenue.

---

## §6 — Security tooling

**Decision:** Add the following to CI and pre-commit.

| Tool | Role | When it runs |
|---|---|---|
| **Dependabot** | Dependency updates | Weekly (already configured) |
| **Semgrep** | SAST — finds insecure patterns in our code | CI on every PR |
| **Gitleaks** | Pre-commit secret scanning | Git hook + CI failsafe |
| **GitHub Security alerts** | CVE alerts on dependencies | Always-on |
| **`Syft` SBOM** | Generates SBOM for the backend Docker image | CI on every release |

**Verifiable production use of Semgrep:** Stripe, Block (Cash App), Snyk
itself, hundreds of fintechs. Stripe in particular has published rules.

**Optional later additions:**
- **CodeQL** if we want GitHub's deeper analysis (slower than Semgrep)
- **Trivy** for container image vulnerability scanning
- **OWASP ZAP** for API surface scanning before launch

---

## §7 — Feature flags

**Decision:** Add **GrowthBook (self-hosted)** before the first real user.

**Why feature flags before real users:**
- "Kill switch for the rule engine" — if a webhook storm triggers runaway
  reactions, we need to flip a flag, not redeploy
- Gradual rollouts — release subscription detection to 10% of users first
- A/B testing later (decay curves, reaction thresholds)

**Alternatives:**
- **Statsig** (free to 1M events/mo) — managed, good DX, recently acquired
  by OpenAI for $1.1B
- **LaunchDarkly** — enterprise standard, expensive, what Stripe/Netflix use
- **ConfigCat** — cheap, less polished

**Why GrowthBook over Statsig:** open-source, self-hostable (one less vendor
dependency), no lock-in. The DX gap vs Statsig is small.

---

## §8 — Audit logging

**Decision:** Add an `audit_log` table for every mutation to financial data.

**Schema (planned, not yet implemented):**
```
audit_log:
  id        BIGSERIAL PRIMARY KEY
  at        TIMESTAMPTZ NOT NULL DEFAULT now()
  user_id   TEXT          -- nullable until T2.2
  actor     TEXT NOT NULL  -- 'system' | 'user' | 'webhook' | 'admin'
  action    TEXT NOT NULL  -- 'goals.update' | 'item.exchange' | etc.
  resource  TEXT           -- 'plaid_item:item_xxxx' | 'pet_state:1'
  before    JSONB
  after     JSONB
  request_id TEXT          -- correlates with log traces
```

**What logs into it:**
- Every PUT to `/api/pets/goals`
- Every `/api/plaid/exchange-token`
- Every `disabled` flip on `plaid_items`
- Every override added/removed
- Every webhook that mutates state

**What stays out (for noise reduction):**
- Reads (`GET /api/pets`)
- Health checks
- Failed signature verifications (those go to logs/Sentry instead)

---

## §9 — Aggregator abstraction (Plaid + future Finicity)

**Decision:** Refactor `src/plaid/` consumers behind an `AggregatorClient`
interface, so a `FinicityClient` can be added later for institutions Plaid
misses.

**Current code shape (concrete):**
```ts
import { transactionsSync } from '../plaid/client.js';
```

**Target code shape (interface):**
```ts
import { Aggregator } from '../aggregators/types.js';
// Aggregator is implemented by PlaidAggregator and (future) FinicityAggregator
```

**Not urgent.** Refactor only when adding Finicity becomes real. Current
single-aggregator code is fine.

---

## §10 — Audit log + threat model + DR plan (governance docs)

These don't exist yet. They need to before first real-money user:

- `docs/threat-model.md` — STRIDE analysis of every attack surface (webhook,
  API, mobile, BLE, firmware)
- `docs/disaster-recovery.md` — RTO/RPO targets, restore procedures, drill
  cadence
- `docs/runbooks/` — per-incident playbooks (Plaid down, DB at capacity,
  webhook backlog, BLE pairing failure mode)
- `docs/data-retention.md` — GDPR/CCPA-aligned retention + deletion process

---

## Implementation order

If we tackled the full quality upgrade today, the order would be:

| # | Item | Effort | Blocker for |
|---|------|--------|-------------|
| 1 | Update `docs/handoff.md`, `CLAUDE.md` to reflect nRF52840 + this doc | 30 min | Hardware sourcing |
| 2 | Add Sentry to backend + mobile | 2 h | Production confidence |
| 3 | Add OpenTelemetry → Grafana Cloud | 2 h | Production confidence |
| 4 | Add Semgrep + Gitleaks to CI | 2 h | Security floor |
| 5 | Add Biome (replace any ad-hoc lint config) | 1 h | DX, code consistency |
| 6 | Decide Clerk vs WorkOS, stub integration | 1 d | T2.2 multi-user |
| 7 | Add GrowthBook self-hosted | 1 d | Real-user launch |
| 8 | Write `docs/aws-migration.md` ADR (the plan, not the migration) | 1 d | Real-money users |
| 9 | Write `docs/threat-model.md` | 1 d | Banking partnership |
| 10 | Implement `audit_log` table + middleware | 1 d | Banking partnership |
| 11 | Execute the AWS migration | 1 weekend | Real-money users |
| 12 | Write native BLE modules (Swift + Kotlin) | 1 week | Phase 2 hardware |

Total: ~3 weeks of solo work to take the stack from "polished prototype" to
"production-grade fintech-hardware product."

---

## Open questions to resolve

1. **Clerk vs WorkOS AuthKit** — recommendation: Clerk (better mobile DX).
   Final pick before T2.2.
2. **GrowthBook vs Statsig** — recommendation: GrowthBook (open-source, no
   vendor lock-in). Final pick before first real-user launch.
3. **AWS CDK vs Terraform** — recommendation: CDK in TypeScript (language
   consolidation). Lock in before starting the AWS migration.
4. **nRF52840 vs nRF54L15** — defer to Phase 2 hardware kickoff. Default
   nRF52840 unless 30% extra battery savings is judged material.
5. **Native rewrite trigger for mobile** — set a concrete trigger: HealthKit
   need, or >25k MAU, or >2 mobile devs. Re-evaluate quarterly.

---

## What stays UNCHANGED from the original plan

- Plaid as primary aggregator
- Postgres + Drizzle
- Fastify + TypeScript backend
- GitHub Actions for CI
- pnpm + Turborepo monorepo
- Conventional Commits + branch protection
- Self-merge while solo (with branch-guard hook)
- Vitest + PGlite for tests
- React Native + Expo for the mobile app shell
- mTLS-style production secrets (now Fly secrets, eventually AWS Secrets Manager)

The audit found these decisions are correct or acceptable at our stage. Don't
churn on them.
