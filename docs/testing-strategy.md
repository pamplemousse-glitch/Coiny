# Coiny End-to-End Test Strategy: Security and Interface

Status: written 2026-08-16. Supersedes nothing; it is the executable counterpart
to `docs/prelaunch-verification/`.

**What this document is.** A plan for the automated tests Coiny should run on
every commit, every release, and once before submission. Each item names the
tool, where it runs, what it fails on, and what it costs.

**What this document is not.** It is not an audit. `docs/prelaunch-verification/`
already holds 696 audited rows across seven parts, and it answers "is this
correct today". This answers "what stops it regressing tomorrow". An audit is a
photograph; this is the alarm system. Do not merge them.

Sources are inline, next to the section each one serves. Every link below was
fetched and confirmed to return real content on 2026-08-16. Note that
`mas.owasp.org/checklists/*` pages return HTTP 200 but serve a 610-byte
JavaScript redirect stub to a removal notice, so they are deliberately not
cited; `MASTG/tests/` is the live path.

---

## 1. Current state, measured

Not estimated. These numbers come from the repository on 2026-08-16.

| Dimension | Measured | Read |
|---|---|---|
| Backend test files | 122 | healthy |
| Backend HTTP routes | 157 | |
| OpenAPI spec paths documented | 15 | **covers under 10% of the API** |
| OpenAPI last updated | 2026-05-21 (PR #47) | **three months stale** |
| iOS UI tests | 25, all passing | shallow but real |
| iOS unit tests | view layer untested by design | covered by UI tests |
| Static security in CI | Semgrep, Gitleaks (incl. full history), Trivy, SBOM, CodeQL nightly | **strong** |
| Dynamic security in CI | none | **the gap** |
| Authorization matrix testing | ad hoc, 11 files mention cross-user cases | **not systematic** |
| Mobile binary analysis | none | gap |
| Visual regression | none | gap |

The headline: **static analysis is well covered and dynamic analysis does not
exist.** Semgrep and CodeQL read the code. Nothing attacks the running system.
For a financial app whose core risk is one user reaching another user's balance,
that is the wrong half to have finished.

---

## 2. The model

Four layers, cheapest and fastest first. A defect should be caught by the
highest layer that can see it, because that is the layer that tells you where it
is.

```
  L4  Pre-release      binary analysis, DAST, full device matrix     minutes-hours, before submit
  L3  E2E / journey    XCUITest against a real backend               minutes, on merge
  L2  Integration      app.inject() + PGlite, authz matrix           seconds, every push
  L1  Unit             pure functions, rule engine, decoders         instant, every save
```

Coiny is strong at L1 and L2 and thin at L3, absent at L4.

---

## 3. Part A: Security testing

### A1. Authorization matrix (BOLA). Highest priority.

Broken Object Level Authorization is ranked API1 in the OWASP API Security Top
10, and it is the single most likely way Coiny leaks money data: any route that
forgets `WHERE user_id = $userId` returns a stranger's net worth.
Source: <https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/>,
the canonical definition and why per-route review does not scale.

`.claude/rules/security.md` #6 already mandates per-user scoping. Nothing
enforces it. With 157 routes and 11 files that happen to mention cross-user
cases, coverage is incidental.

**Build a generated matrix, not hand-written tests.** Enumerate the registered
routes from the Fastify instance at test time, then for each one assert three
things with user B's token against user A's resource: not 200, no bytes of A's
data in the body, and an explicit allowlist entry required for any route that is
legitimately unauthenticated. A new route added without an allowlist entry fails
the suite by default. This is the one test that must be generated, because a
hand-maintained list of 157 routes is a list that goes stale.

Fails on: any route returning another user's data, or any new unauthenticated
route not explicitly declared.
Runs: every push, L2, seconds.

### A2. Restore the API contract, then fuzz it

The spec documents 15 of 157 paths and has not been touched since May. A stale
contract is worse than none: it is a document people trust.

Regenerate it from the running server, then fuzz it. Schemathesis reads an
OpenAPI schema and generates property-based cases against a live API, checking
conformance, 500s, and schema violations rather than a fixed list of inputs.
Source: <https://schemathesis.readthedocs.io/en/stable/>, the tool's own docs
including the CI recipes and the checks it applies by default.

Fails on: any 500, any response that violates the declared schema, any
undocumented route.
Runs: on merge, L3.

### A3. DAST against the running API

Static analysis cannot see authentication bypass, header misconfiguration, or a
route that behaves differently under load. ZAP's API scan runs from a container
against a spec and is the standard free option.
Source: <https://www.zaproxy.org/docs/docker/api-scan/>, the official image and
its flags, including how to authenticate the scan (an unauthenticated scan of an
authenticated API mostly proves the auth is on).

Fails on: new high-severity alerts against a baseline file.
Runs: nightly, L4.

### A4. Mobile binary analysis, MASTG-aligned

The seven MASVS categories (STORAGE, CRYPTO, AUTH, NETWORK, PLATFORM, CODE,
RESILIENCE, PRIVACY) are the standard structure for a mobile assessment, and
each has concrete test IDs rather than principles.
Sources:
<https://mas.owasp.org/MASTG/tests/>, the live test index, which is what to map
findings back to;
<https://owasp.org/www-project-mobile-app-security/>, the project root covering
how MASVS and MASTG relate.

MobSF performs automated static analysis on an `.ipa` and reports hardcoded
secrets, insecure transport settings, and misconfigured entitlements without
requiring a jailbroken device.
Source: <https://mobsf.github.io/docs/>, install and CI-mode usage.

For Coiny specifically the categories that carry real risk are STORAGE (the
session token must be Keychain-only, never `UserDefaults`), NETWORK (TLS, no
cleartext exception), and PRIVACY (the privacy manifest must match what the app
actually collects). RESILIENCE (jailbreak detection, obfuscation) is
deliberately out of scope: it is expensive, it breaks debugging, and it protects
against an attacker who already owns the device, which is not Coiny's threat
model at launch.

Fails on: any hardcoded secret, any cleartext transport exception, any
entitlement not in the declared set.
Runs: pre-release, L4.

### A5. Keep what already works

Semgrep, Gitleaks, Trivy, SBOM and nightly CodeQL are already wired and are the
part most teams skip. Source: <https://semgrep.dev/docs/> for rule authoring,
which is worth using to encode the two project-specific rules that no generic
ruleset knows: "no PII in log statements" and "every store function takes a
userId".

Those two custom rules are cheap and would have caught the class of defect
`.claude/rules/security.md` #2 and #6 describe, at edit time rather than review
time.

---

## 4. Part B: Interface testing

### B1. Exploratory crawl. Built today.

`ios/CoinyUITests/ExploratoryCrawlTests.swift` enumerates every labelled,
hittable button at runtime, taps each one, screenshots the result, and asserts
the app is still in the foreground. It skips destructive controls by label.

It is a crash and dead-end detector, not a correctness check: it cannot know
what a button should do. Its value is that it needs no maintenance as screens
are added, and it found two real defects on its first run (section 6).

Fails on: app leaving the foreground after any tap.
Runs: on merge, L3.

### B2. Accessibility audit. Already built.

`performAccessibilityAudit` ships with Xcode and catches unlabelled elements,
contrast below AA, hit regions under 44pt, and clipping at large Dynamic Type,
with no dependency to add.
Sources:
<https://developer.apple.com/documentation/xctest/xcuiaccessibilityaudittype>,
the audit categories and what each one actually checks;
<https://developer.apple.com/documentation/xctest/xcuiapplication>, the
surrounding API.

Already called once per UI test file, on the screen that file navigates to, so
coverage grows with the tests. Keep this pattern. It is the correct design.

### B3. Fixture completeness. Currently broken.

`--ui-testing` serves deterministic fixtures for pets, journey, and goals. It
serves nothing for net worth, so the Wealth tab falls through to the real API
with no session and renders "Not signed in / Try again" (section 6, finding 1).

A fixture gap is not a cosmetic problem. It means **the Wealth tab has never
been tested by any automated test**, and the crawl cannot reach anything behind
it. Every tab must have a fixture or the layer above it is decorative.

Fails on: a tab rendering an error state under `--ui-testing`.
Runs: every push, L3.

### B4. Visual regression

The design direction is the product's main defensible asset and it is the thing
no assertion catches: a screen can pass every test while looking wrong.
Snapshot testing records a reference image and fails the build on pixel
divergence.
Source: <https://github.com/pointfreeco/swift-snapshot-testing>, the de facto
Swift library, including its strategies for SwiftUI views and how to handle
device and OS variance.

Adopt this **after** the design system is applied consistently, not before.
Snapshotting the current state would lock in finding 4 below.

### B5. Named critical journeys

The crawl covers breadth. These five need depth, written by hand, asserting
outcomes rather than existence:

1. First launch to signed-in home, including the consent acknowledgement
2. Bank link, Plaid sandbox, `user_good` / `pass_good`, to first balance
3. Goal set, transaction ingested, creature reaction visible in Activity
4. Subscription purchase via the local StoreKit configuration, then restore
5. Account deletion, including that the Apple grant is revoked

Journeys 1 and 3 partly exist in `JourneyUITests.swift`. Journeys 2, 4 and 5 do
not exist anywhere, and 5 is the one with a regulatory consequence.

---

## 5. What runs where

| Layer | Trigger | Wall clock | Contents |
|---|---|---|---|
| L1+L2 | every push | under 3 min | unit, integration, **authz matrix (A1)** |
| L3 | on merge to main | under 15 min | XCUITest suite, crawl (B1), fixtures (B3), contract fuzz (A2) |
| L4 nightly | schedule | unbounded | CodeQL, ZAP (A3) |
| L4 pre-release | manual | unbounded | MobSF (A4), device matrix, journeys (B5) |

The rule that keeps this honest: **a layer that is allowed to fail is not a
test, it is a report.** Anything in L1 to L3 blocks the merge or gets deleted.

---

## 6. Findings from today's run, and what was done

Final state: **backend 1,532 tests passing across 122 files; iOS 26 UI tests
passing, including the new crawl.** No new lint violations (10 SwiftLint errors
before and after, all pre-existing in `CoinyTests/`).

All 25 existing UI tests pass. The crawl passes with no crashes. The defects
below came from reading the screenshots the crawl captured, which is precisely
the argument for capturing them.

**1. The Wealth tab is untested and renders an error under `--ui-testing`.**
`ios/Coiny/Support/UITestSupport.swift` has no net worth fixture, so the tab
shows "Not signed in" with a "Try again" button. Severity: high, because it
means an entire tab has no automated coverage at all.

**2. Settings renders an empty "Weekly budgets" section.**
`ios/Coiny/Views/SettingsView.swift:50` declares the section unconditionally
whenever goals exist, so an empty `weeklyBudgetByCategory` produces a header
with no rows. Severity: low, visible on the first screenshot a reviewer sees.

**3. Settings reports the wrong backend.**
`ios/Coiny/Views/SettingsView.swift:69` hardcodes the literal string
`coiny-backend.fly.dev`, while the app actually resolves its base URL from
`COINY_API_BASE_URL` via `Endpoint.baseURL`. On the simulator, pointed at
localhost, Settings claims you are on Fly. Severity: medium, and directly
relevant to the current branch, whose entire purpose is letting a simulator run
target a chosen backend.

**4. The design system is applied to exactly one screen.** Not fixed.
Home uses the cream `CoinyTheme.screen` background and the designed type scale.
Activity, Wealth and Settings are stock white iOS with the system blue tint, as
is the tab bar. Severity: medium, and it is not a test defect, it is a product
one. `docs/design-direction.md` section 3.1 names default system styling as a
tell. This should be fixed before B4 records any snapshots.

**5. Wealth's primary action failed WCAG AA contrast.** Fixed.
Exposed only once finding 1 was fixed and the tab had real content. The
"Add or manage accounts" link used the default accent, roughly 3.6:1 on white
at `.subheadline` (15pt, so normal text needing 4.5:1). Changed to
`CoinyTheme.signal`, measured 5.7:1. This is the argument for the whole
strategy in one defect: **a fixture gap was hiding a shipping accessibility
failure**, and no amount of auditing the code would have found it, because the
screen under audit was rendering an error.

**6. The composition bar's Dynamic Type audit failure is a false positive.**
Excluded, with the measurement written down.
The audit reports the legend rows as "partially unsupported". Probed directly at
`UICTContentSizeCategoryAccessibilityXXXL`, those rows grow from 13.3pt tall to
48pt and 96pt, reflow from a row into a column, and wrap rather than truncate.
They are `.caption2` with a `@ScaledMetric` swatch. The exclusion in
`AccessibilityAudit.swift` records the measurement so it stays reviewable.

Two things were checked and found **not** to be defects, recorded so nobody
re-opens them: Home does not clip at accessibility sizes
(`HomeView.swift:136` switches to a `ScrollView` past the threshold), and the
"Nothing connected yet" text under a non-zero total was a defect in the fixture
this session added, not in the app.

---

## 7. Build order

Ordered by risk removed per hour spent.

1. **A1, authorization matrix.** The only item here that protects money.
2. **B3, fixture gap.** Cheap, and it unblocks all UI coverage of Wealth.
3. **Findings 2 and 3.** Both are single-line fixes.
4. **A2, regenerate the OpenAPI spec.** Unblocks A2 fuzzing and A3 DAST, and
   removes a stale document people currently trust.
5. **A5, the two custom Semgrep rules.** Encodes existing written rules as
   enforced ones.
6. **B5, journeys 2, 4 and 5.**
7. **Finding 4, design system.** Larger, and it gates B4.
8. **A3, A4, B4.** Pre-release, after the above.

Items 1 to 3 are same-day. Items 4 to 6 are a week. Items 7 and 8 are the
pre-submission block.

---

## 8. Stale data and broken connections

Investigated separately, because it is the single most common complaint against
every app in this category and it is a testing problem as much as a product one.

### Why it happens to everyone

Aggregation is a chain: bank, then the bank's OAuth or credential layer, then
the aggregator, then us. Every link breaks on its own schedule and none of them
tell the user. Passwords change, MFA prompts fail to arrive, institutions go
down, and consent expires on a timer the user never agreed to consciously. The
app is blamed because the app is the only part the user can see.

Source: <https://plaid.com/docs/errors/item/>, the full item error list, which
is the actual inventory of ways a connection dies.

### What Coiny already does, verified in the code

Better than most, and worth knowing before adding anything:

- All nine relevant item webhooks are handled: `ITEM_LOGIN_REQUIRED`, `ERROR`,
  `PENDING_EXPIRATION`, `PENDING_DISCONNECT`, `USER_PERMISSION_REVOKED`,
  `LOGIN_REPAIRED`, `NEW_ACCOUNTS_AVAILABLE`, `DEFAULT_UPDATE`,
  `SYNC_UPDATES_AVAILABLE` (`backend/src/webhook/plaid.ts`).
- Transactions use `/transactions/sync`, the cursor-based endpoint, so a missed
  webhook does not silently lose data (`backend/src/plaid/client.ts:144`).
- Update mode is implemented, including the `LOGIN_REPAIRED` completion path
  (`backend/src/api/plaid-link.ts:215`).
- Every asset class carries its own `{ value, asOf, status }` reading, and the
  UI renders staleness per class rather than showing one confident total. That
  is genuinely ahead of the category.

### The gap, and it is one line of design

`ios/Coiny/Views/NetWorthView.swift:105` says it outright:

> Proactive repair (R-8.7): surfaced on open, **in-app only**.

There is no push notification on any connection failure. Grepping the webhook
handler for `sendPush` or `apns` returns nothing. The backend records the break
perfectly and then waits for the user to happen to open the app.

For a net worth tracker, that wait is the whole problem. Nobody opens a net
worth tracker daily. If the connection breaks on the 3rd and they open the app
on the 24th, they spent three weeks trusting a number that was wrong, and the
app knew the entire time.

Worse, `PENDING_DISCONNECT` / `PENDING_EXPIRATION` arrive **seven days before**
consent expires, which is enough time to fix it before anything breaks at all
(source above, and `plaid/docs/link/update-mode/`). Coiny receives that warning,
writes it to a column, and lets it lapse.

### What to code

1. **Push on `ITEM_LOGIN_REQUIRED` and `USER_PERMISSION_REVOKED`.** The APNs
   dispatch path already exists (`backend/src/reactions/dispatch.ts`). This is
   wiring, not new infrastructure. Rate-limit it to one per item per break so a
   flapping institution cannot spam.
2. **Act on the seven-day warning.** On `PENDING_DISCONNECT` /
   `PENDING_EXPIRATION`, schedule a notification: "Your bank connection needs
   renewing this week." A break the user fixes before it happens is not a break.
   This is the highest-value item and the cheapest.
3. **A scheduled connection-health sweep.** `backend/src/scheduler/` currently
   holds only `purge.ts`. A daily job that reconciles item status against
   `/item/get` catches items that broke without a webhook, which is the failure
   mode webhooks alone cannot cover.
4. **Extend the health model past Plaid.** The per-class `status` machinery is
   Plaid-shaped. Coinbase, Kraken, Zerion and the rest can also revoke or expire
   a key, and they need the same `reauth_required` state or the Wealth tab will
   quietly under-report a total while looking confident.

Do not add: aggressive polling, or a second aggregator for redundancy. Both are
expensive, and neither addresses the actual complaint, which is not that
connections break but that **nobody is told when they do.**

### How to test it

Connection breakage is testable without waiting for a real bank to fail. Plaid
sandbox can force an item into `ITEM_LOGIN_REQUIRED` on demand, so each of the
four items above gets an integration test that drives the item into the broken
state and asserts the user was notified, not merely that a column changed. That
assertion, "the user was told", is the one that is currently missing everywhere.
