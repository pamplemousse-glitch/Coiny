# DRAFT PROMPT — pre-launch verification PRD. For review before dispatch.

---

You are a principal engineer who has taken consumer fintech apps through App
Store review, a security assessment, and a real launch. Write the document
Coiny gets verified against before it ships.

<the_framing>
**Almost everything in this repository is asserted. Almost nothing is verified.**

That is the honest state, and it is what this document exists to fix.

- `docs/engineering-budgets.md` sets latency, cost and freshness budgets.
  **No budget has ever been measured.** Not once, on any device.
- `docs/design-direction.md` §3 is a file-by-file anti-slop checklist naming
  real lines of code. **It was written against code that has since been
  rewritten.** Nearly every screen changed in one night of parallel work. Nobody
  has checked whether the old tells were removed or whether new ones arrived.
- `.claude/rules/security.md` states seven security rules. **They have never
  been audited against any standard.** No MASVS pass, no threat model walk, no
  dependency review beyond automated scanning.
- The PRD marks requirements Built. **Built means the code exists**, not that
  anyone confirmed the behaviour on a device.
- A human has clicked through this app exactly once, got as far as the sign-in
  screen, and could not get past it.

So: do not write another list of what is missing. `docs/launch-gap-analysis.md`
already did that and it is good. **Write the document that says, item by item,
what must be true before this ships, how each one is verified, and what the
answer is today.**

Where you can verify something by reading code or running a command, do it and
record the result. Where verification needs a device, a store account or a
human, say exactly what to do and mark it unverified. A checklist nobody can
execute is decoration.
</the_framing>

<what_coiny_is>
An iOS app showing a user everything they own as one number, fronted by a
creature whose state reflects their financial behaviour. Solo founder, one LLC
(Athanor Works), pre-launch, zero users, no team, no ops person.

Fastify + TypeScript + Drizzle on Fly.io, Neon Postgres, native Swift/SwiftUI
via XcodeGen, plus an Android client in Kotlin/Compose that is roughly four
screens behind. Plaid for bank data plus about twenty other integrations.
StoreKit 2 subscriptions. Sign in with Apple.

Handles real people's bank balances, transaction history, credit scores and
debt. Subject to GLBA and the FTC Safeguards Rule. Not a bank, does not move
money, does not touch card data.

Staging is deployed and healthy. Production does not exist yet, deliberately:
it is created when real Plaid and Apple credentials arrive.
</what_coiny_is>

<read_first>
All of it, before writing anything. You are verifying claims, and you cannot
verify a claim you have not read.

  docs/launch-gap-analysis.md   The audit that precedes this. DO NOT DUPLICATE
                                IT. Cite it and build on it.
  docs/prd.md                   The spec, including Appendix C status index.
  docs/design-direction.md      Especially §3, the anti-slop checklist, and §4,
                                the design system. Both predate the rewrite.
  docs/engineering-budgets.md   Every number that was never measured.
  docs/obligations.md           Regulatory and contractual analysis.
  docs/legal/                   Policy, ToS, manifest, labels, Safeguards.
  docs/build-status.md          Honest current state.
  .claude/rules/security.md     The seven rules.
  CLAUDE.md and the per-package ones.

Then the code, properly: `backend/src/`, `ios/Coiny/`, `android/app/`,
`.github/workflows/`, `backend/drizzle/`, `fly.toml`, `ios/project.yml`.
</read_first>

<the_document>
Write `docs/prelaunch-verification.md`. Create no other file. Do not modify code.

Every item in every section takes the same shape, and the shape is the point:

| # | What must be true | How it is verified | Status today | Evidence |

Status is one of: **VERIFIED** (checked, with evidence), **FAILS** (checked, it
is wrong), **UNVERIFIED** (needs a device, an account, or a human), or
**NOT APPLICABLE** (with the reason).

Evidence is a `file:line`, a command and its output, or a link. "Looks fine" is
not evidence.

## Part 1: Security

Structure against **OWASP MASVS** control groups, because a standard beats an
invented list: MASVS-STORAGE, MASVS-CRYPTO, MASVS-AUTH, MASVS-NETWORK,
MASVS-PLATFORM, MASVS-CODE, MASVS-RESILIENCE, MASVS-PRIVACY. Use the MASTG test
cases where they apply. Cross-reference **OWASP Mobile Top 10 (2024)**: M1
Improper Credential Usage through M10 Insufficient Cryptography.

Cover both clients and the backend. Specifically reach a verdict on:

- Token and key storage on device (Keychain attributes, what is in
  UserDefaults, what Android uses and whether it matches)
- Field-level encryption at rest: what is encrypted, what is not, and whether
  the line drawn is defensible. Transaction amounts are deliberately plaintext;
  say whether you agree and what an attacker with a dump learns.
- Session lifecycle: issue, refresh, expiry, revocation, and what happens to a
  stolen device
- TLS, certificate pinning (and whether pinning is worth it here), ATS
- Every route's authorisation. The rule is that every store function is scoped
  by userId. Verify it rather than trusting it, and name any exception.
- Webhook authenticity: Plaid signature verification, App Store Server
  Notification JWS, replay resistance
- Secrets: what reaches a log, what reaches a crash report, what reaches an
  analytics property, what is in the repository, what is in the built binary
- Supply chain: dependency count, pinning, provenance, and what a compromised
  dependency would reach
- Rate limiting, brute force, enumeration, IDOR
- Debug affordances that must not ship, and proof they cannot

## Part 2: Privacy and data protection

- What is collected, where it goes, how long it lives, and whether the privacy
  policy, the privacy manifest and the App Store nutrition labels all say the
  same thing. They were written together; verify they still agree with the code.
- Data minimisation: is anything collected that nothing uses?
- Deletion: what actually gets deleted, what survives, what upstream grants are
  revoked. The audit found Sign in with Apple token revocation missing; check
  for siblings of that mistake.
- Export and portability
- Consent: when it is asked, what it covers, whether it is revocable
- Third-party data flow: every processor, what each receives, and whether it is
  on the service-provider list
- Android's Data Safety form against the same facts

## Part 3: Interface craft, and the anti-slop audit

**This section carries unusual weight. Read `docs/design-direction.md` §3 and
§4 first.**

That checklist named specific tells in specific files: an indigo-purple-pink
gradient on the onboarding hero, spring-and-bounce easing, SF Symbols standing
in for character art, and more. **It was written against code that has since
been rewritten almost entirely.** So:

1. **Re-audit every tell in §3 against the current code.** Removed, still
   present, or reintroduced somewhere new?
2. **Audit the new code for tells §3 never anticipated.** The rewrite added
   onboarding, a journey surface, a debt module, a Wealth rebuild, a paywall.
   Nobody has looked at any of it with this lens.
3. **Verify the design system is actually applied**, not merely documented:
   typography, the single-accent colour rule, the money-colour rule, spacing,
   radius, motion durations and easing, iconography.

Then go beyond the existing checklist. The goal is an interface that reads as
made by a person with taste, not assembled from defaults. Judge:

- **Default-component tells.** Stock SwiftUI styling left untouched, system blue
  tint, default list chrome, unstyled navigation bars, symbol icons used where a
  drawn mark belongs.
- **Copy tells.** Exclamation marks, "Oops!", "Let's get started", em dashes,
  emoji, cheerfulness where a person would be plain. §10 of the PRD has real
  strings; check the code uses them rather than improvising.
- **Layout tells.** Everything centred, uniform card grids, equal visual weight
  on unequal information, no considered hierarchy, spacing that is just the
  default gap repeated.
- **Motion tells.** Bounce, overshoot, spring physics on things that are not
  physical, animation applied because it was available.
- **The empty, error and loading states**, which is where generated interfaces
  are laziest and where a real product shows its manners.
- **Consistency across surfaces.** Do onboarding, the journey, Wealth and the
  paywall look like the same product designed by the same person, or like four
  screens built by four different agents in parallel? They were.

Be concrete and merciless. Name the file and line. "Feels generic" is not a
finding; `PaywallView.swift:88 uses .tint(.blue), the system default, on the
primary purchase action` is.

## Part 4: Performance, latency and efficiency

`docs/engineering-budgets.md` sets the numbers. **Nothing has been measured.**

For each budget: what it is, how to measure it, and what the answer is today or
what would produce one. Cover at minimum:

- Cold start to first meaningful frame, on the oldest supported device
- Time to the first net worth number (R-5.1's 90-second target)
- Scroll performance and frame drops on the longest lists
- API response times per endpoint, and the p95 rather than the mean
- Payload sizes, and whether the client fetches more than it renders
- Database query plans on the largest tables, and the missing-index question
- Background work: the scheduler's cost per tick, and what it wakes
- Memory and battery, particularly anything holding a timer
- App binary size and launch-time dependency cost

Say plainly which budgets are unmeasurable today and what tooling would fix
that: Instruments, MetricKit, XCTest performance tests, `EXPLAIN ANALYZE`.

## Part 5: Compliance, fintech-specific

Build on the audit's compliance sweep rather than repeating it. Go deeper on the
finance-specific obligations a general checklist misses:

- GLBA and the FTC Safeguards Rule 16 CFR 314: which elements apply below 5,000
  consumers, which are waived, and what the 4,000 tripwire triggers
- State privacy law: CCPA/CPRA and the newer state acts, thresholds, and when
  each starts applying
- Plaid's own developer policy and production launch requirements
- Apple's finance-specific rules, including 3.2.1(viii) and 3.2.2(ix), and Google
  Play's Financial Features Declaration
- Advertising and claims: what the app may say about savings or outcomes, and
  the accuracy disclaimer's dependency on staleness actually being surfaced
- Record retention and disposal, and the difference between the ceiling and a
  policy
- Incident response: what is legally required at this size, what is not, and what
  the founder should have written down anyway

## Part 6: The ordered pre-launch runbook

Everything above, collapsed into one sequence a solo founder can actually walk.
Each item labelled **[Founder]** or **[Agent]**, grouped by gate:

  Gate 1: before the first external TestFlight tester
  Gate 2: before the first real bank connection
  Gate 3: before App Store submission
  Gate 4: before the first paying user

Ordered within each gate by lead time, so the long poles start first. If an item
blocks another, say so.
</the_document>

<research>
Ground this in real sources, not recollection.

- **OWASP**: MASVS control groups, MASTG test cases, Mobile Top 10 2024
- **Apple**: App Store Review Guidelines, Human Interface Guidelines, privacy
  manifest and required-reason APIs, TestFlight, StoreKit 2, MetricKit
- **Google Play**: Core App Quality, Data Safety, Financial Features Declaration
- **Plaid**: developer policy, production launch checklist, security guidance
- **FTC**: Safeguards Rule text and the small-entity guidance
- **GitHub**: security checklists for mobile fintech; open-source finance apps
  and how they handle key storage, session lifecycle and deletion; iOS
  performance testing setups. Name every repository you read.
- **Practitioner writing** on mobile security assessments and App Review
  rejections in the finance category

**WebSearch is exhausted in this session and will refuse.** Use WebFetch against
URLs you know or can derive, and the context7 MCP (`resolve-library-id` then
`query-docs`). Other MCP servers are connected; find them with ToolSearch. If a
source will not load, mark the item Unverified with what would settle it rather
than guessing.
</research>

<constraints>
1. **Solo founder, no ops, no on-call.** Every recommendation carries an ongoing
   attention cost. Say it. An architecture nobody maintains is worse than a
   simpler one they will.
2. **First-party analytics is a deliberate decision.** PRD §24 chose no vendor
   SDK; the privacy manifest, the nutrition labels and the privacy policy all
   rest on it. Anything you propose that collects data must be reconciled with
   those three or explicitly rejected.
3. **Pre-revenue.** Real monthly costs, or say it is free.
4. **Do not import enterprise practice wholesale.** Certificate pinning,
   anti-tampering, a SOC 2 programme and a formal IRP may all be premature. Say
   so, and name the trigger that changes it.
5. **Be willing to conclude that something is fine.** A verification document
   whose every row says FAILS is not credible and will not be used.
</constraints>

<anti_patterns>
Do not duplicate `docs/launch-gap-analysis.md`. Cite it.
Do not produce a survey where a verdict is possible.
Do not write an item that cannot be verified by a specific action.
Do not pad. Length is not thoroughness.
No em dashes (U+2014). No emoji.
</anti_patterns>

Budget: up to 400 tool calls. This is a large document and the reading alone is
substantial. Reserve enough headroom to write it in full; running out mid-write
wastes the run.

You are autonomous; nobody will answer questions mid-run. Where you must choose,
choose and say what you chose.

Your final message is read by someone who saw none of your working: how many
items are VERIFIED against FAILS against UNVERIFIED, the three most serious
FAILS, the single worst interface tell you found, and what to do first.
