# Launch gap analysis: what the spec never thought to ask

**Written 2026-08-15** against the working tree at commit `fbb9dfd` (branch
`feat/simulator-env-select`; PR #191/#192 merged). Method: read
`docs/prd.md`, `docs/obligations.md`, `docs/engineering-budgets.md`,
`docs/build-status.md`, the environments pair, `docs/legal/`, all four
CLAUDE.md files, then the backend, iOS, and Android source, the eleven CI
workflows, the migrations, and the deploy configs; then checked each system
against primary Apple, Google, Plaid, and FTC sources and against eleven
shipped open-source mobile apps (named in section 4). External claims carry
links; claims about Coiny carry file paths; what could not be verified is
marked "Unverified" with what would settle it.

Two kinds of gap are tracked: **absence** (things shipped apps have that this
repo has nothing of) and **divergence** (things this repo has, built
differently from how the industry does it). The known-missing list in the
brief (demo account, revoke-all, purge job, VoiceOver pass, backups
rehearsal, org enrollment, household consent, simulator-to-staging) is not
rediscovered here; two known items reappear only because their urgency is
misjudged, and that is said explicitly where it happens.

---

## 1. The ten things most likely to bite, ranked

The honest headline: **items 1 to 5 are the ones that actually bite before
anything ships to a human.** Items 6 to 9 have real but later triggers, and
item 10 is the summary judgment. Ranked by consequence, not category.

### 1. Plaid OAuth is filed under "Phase 2+", but it gates most real US banks

- **What it is.** OAuth-based institutions require an HTTPS universal-link
  redirect URI registered in the Plaid dashboard, an
  `apple-app-site-association` file hosted on a domain Coiny controls, the
  `applinks` associated-domains entitlement, and `redirect_uri` passed in
  `/link/token/create`. Plaid: "Plaid does not support registering URLs with
  custom URL schemes as redirect URIs", and if the AASA file is removed,
  "OAuth sessions will fail" ([Plaid OAuth docs](https://plaid.com/docs/link/oauth/)).
  Coiny has none of this: no domain, no AASA, no `applinks` entitlement in
  `ios/project.yml`, and `redirect_uri` deliberately omitted with the comment
  "omitted Phase 1, required for OAuth banks (Chase, BofA, WF)"
  (`docs/plaid-integration.md:428`, `backend/src/plaid/client.ts`).
- **What goes wrong.** Plaid's current docs describe OAuth as effectively
  universal for US institutions. Chase, Bank of America, Wells Fargo, and
  US Bank, meaning the banks most testers actually use, cannot be linked.
  "Phase 2+" was a reasonable label when written; it is now a
  first-real-tester requirement. Chase additionally requires the completed
  security questionnaire before production access, and Schwab can add up to
  six weeks after approval ([Plaid OAuth docs](https://plaid.com/docs/link/oauth/)).
  Sandbox never surfaces any of this, which is exactly why nobody has felt it.
- **Cost.** A domain (~$15/yr, already recommended by
  `docs/environments-research.md` §8 for API hostnames; this adds the AASA
  reason), one to two days of code and dashboard registration, plus Plaid's
  registration lead time.
- **Gate.** Blocks any TestFlight wave that links real banks. Do the domain,
  AASA, entitlement, and `redirect_uri` work now, while it is cheap.

### 2. The in-app legal surface does not exist, and the paywall is missing the highest-frequency rejection item

- **What it is.** Guideline 3.1.2 requires functional Terms of Use (EULA) and
  privacy policy links with the subscription offer, and the missing Terms of
  Use link is among the most common subscription rejections
  ([Apple subscriptions](https://developer.apple.com/app-store/subscriptions/),
  [guidelines 3.1.2](https://developer.apple.com/app-store/review/guidelines/)).
  5.1.1(i) requires the privacy policy link in-app as well as in metadata.
  Today `ios/Coiny/Views/PaywallView.swift` shows price, disclosure, and
  restore, but links to nothing, and `ios/Coiny/Views/SettingsView.swift`
  contains no privacy, terms, or contact link at all (grep verified). The §29
  support address is also not wired anywhere. The policy and ToS documents
  exist (`docs/legal/`) but are hosted nowhere and accepted nowhere; ToS
  acceptance at signup is required by `docs/obligations.md` §2 at first
  paying user.
- **What goes wrong.** A guaranteed metadata rejection at paid submission,
  and a 5.1.1 rejection risk at any submission including external TestFlight
  (Beta App Review applies the same guidelines,
  [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/overview-of-testflight)).
- **Cost.** Half a day of iOS work once the attorney-reviewed documents have
  URLs (hosting is founder checklist item 4, `docs/legal/founder-checklist.md`).
- **Gate.** Blocks external TestFlight (policy link) and paid launch (EULA
  link, acceptance).

### 3. Account deletion does not revoke the Sign in with Apple token

- **What it is.** Apple's account-deletion guidance: apps that offer Sign in
  with Apple must use the Sign in with Apple REST API (`/auth/revoke`) to
  revoke user tokens when deleting an account
  ([Offering account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/)).
  Coiny's deletion is otherwise unusually honest (Plaid `itemRemove` per
  item, TrueLayer revocation, cascade delete;
  `backend/src/api/account.ts:23-40`, `backend/src/revoke/upstream.ts`), but
  nothing anywhere calls Apple's revoke endpoint (grep across `backend/src`
  finds no `auth/revoke`). R-15.6 caught the non-Plaid providers and missed
  the identity provider itself. The Android sibling (Google Sign-In
  disconnect on deletion) is the same gap one platform over.
- **What goes wrong.** A 5.1.1(v) finding at review or, worse, after launch;
  and the S-27 deletion copy ("tells your banks to cut access") is true for
  banks and false for Apple.
- **Cost.** Under a day: the revoke call needs a client-secret JWT signed
  with the existing Apple key material, same log-and-continue pattern the
  deletion path already uses.
- **Gate.** Blocks submission (it is part of the account-deletion
  requirement the PRD already treats as Built).

### 4. Shipped clients live forever, and nothing can retire one

- **What it is.** The API contract is additive-only with no versioned URLs
  (R-14.1), which is the right choice for first-party clients, but the other
  half of that pattern is missing everywhere the industry has it: there is no
  minimum-supported-build handshake, no forced-upgrade screen, and no kill
  switch (grep for any version gate across `backend/src` and
  `ios/Coiny/Services` returns nothing). Two adjacent findings sharpen it:
  `docs/openapi.yaml` has not been touched since 2026-05-21 (git log) and
  documents an API roughly forty migrations old, and the Android decoders
  default every missing field to zero (`android/.../data/Models.kt`:
  `healthScore: Int = 0`, `mood: Int = 0` with `ignoreUnknownKeys`), so the
  legacy-column drop planned in R-13.3 (`docs/prd.md` §13) would not crash
  the Android app, it would silently render a dead pet with zeroed data,
  which is the exact silent-wrong-number failure class the backend spent a
  week eradicating (R-8.1).
- **What goes wrong.** The moment the first external TestFlight build exists,
  the contract freezes against clients that cannot be recalled. Every
  breaking change afterwards needs either eternal compatibility or a gate
  that does not exist. Wikipedia ships server-driven config for exactly this
  ([WMFFeatureConfigResponse.swift](https://github.com/wikimedia/wikipedia-ios/blob/main/WMF%20Framework/Event%20Platform/EventPlatformClient.swift)
  sibling files), and `docs/environments-research.md` §10 already endorses a
  flags table with a kill switch "at launch". Launch is the wrong trigger;
  first external build is the right one.
- **Cost.** One day: a `GET /api/meta` (or a field on `/health`) carrying
  `minimum_build` per platform, a blocking screen in both clients, plus a
  shared JSON fixture set exercised by backend, Swift, and Kotlin decode
  tests so a contract change fails a test instead of a user.
- **Gate.** Must exist before the first build leaves the building.

### 5. iOS release mechanics: the second TestFlight upload fails

- **What it is.** `CFBundleShortVersionString` is "0.2.0" and
  `CFBundleVersion` is the literal string "1" in `ios/project.yml:52-53`;
  there are zero git tags in the repo (`git tag` is empty); there is no
  CHANGELOG, no upload lane, no archive script, and the stated process is
  "iOS ships manually via Xcode" (`docs/prd.md` §28). `DEVELOPMENT_TEAM` is
  empty in `project.yml:19`.
- **What goes wrong.** The first upload works. The second is rejected for a
  duplicate build number, and every subsequent build needs a hand edit that
  is not recorded anywhere, so a crash report can never be mapped to a
  commit. Every shipped repo read for this analysis automates exactly this
  and nothing more at small scale: isowords bumps via agvtool and tags in a
  [Makefile](https://github.com/pointfreeco/isowords/blob/main/Makefile);
  ivy-wallet's bot PR bumps CalVer in
  [automatic_release.yml](https://github.com/Ivy-Apps/ivy-wallet/blob/main/.github/workflows/automatic_release.yml).
- **Cost.** Half a day: a 50-line script that sets `CFBundleVersion` from
  the commit count or a counter, tags the archive commit, archives, and
  uploads with an App Store Connect API key. Not fastlane (section 7).
- **Gate.** Blocks TestFlight in practice, though not in principle. Blocked
  behind the org enrollment anyway, so write the script while waiting.

### 6. Android's launch surface is calendar time, not code time

Itemized fully in section 5. The short form: if the Play developer account
is a personal one, Google requires a closed test with at least 12 testers
opted in for 14 uninterrupted days before production access
([Play testing requirements](https://support.google.com/googleplay/android-developer/answer/14151465));
the Data Safety form, the Financial Features Declaration, and a **web** URL
for account deletion are all mandatory and none is drafted anywhere in
`docs/` (grep for "Data Safety" hits only the Plaid vendor dump); and Play
Billing plus its server-side notification path (RTDN via Google Cloud
Pub/Sub) is a genuinely new build with no iOS code to copy. The one-day
parity estimate covers the screens and almost nothing else. **Gate:** blocks
Android launch; the 14-day clock and the org-account decision (section 8, Q2)
should start long before the code port does.

### 7. Crash and hang visibility is a written decision with zero code behind it

`docs/environments-research.md` §10 already decided this correctly: no
vendor crash SDK (it would undo PRD §24 and the privacy manifest), MetricKit
plus Xcode Organizer instead. What the decision paper misses is that nothing
implements it: no `MetricKit` import exists anywhere in `ios/Coiny` (grep
verified), and R-28.1's tester-wave pause rule gates on a crash-free number
nobody is wired to produce. Two facts soften the deadline: TestFlight users
share crash reports automatically regardless of device settings
([Apple crash reports doc](https://developer.apple.com/documentation/xcode/acquiring-crash-reports-and-diagnostic-logs)),
and the shipped privacy-first cohort (Signal, Wikipedia, DuckDuckGo,
Thunderbird, ivy-wallet, section 4) ships without any crash vendor at all,
so the first-party stance is validated practice, not a quirk. The gap opens
at public launch, when only opted-in users appear in Organizer (fraction
unpublished by Apple; Unverified, settle by comparing MetricKit counts
against Organizer once live). **Do:** a `MXMetricManager` subscriber posting
crash/hang diagnostic payloads to the existing `/api/telemetry` endpoint
(one day), and add Crash Data to `ios/Coiny/PrivacyInfo.xcprivacy` and the
label checklist, since first-party crash upload is still "collection"
([App privacy details](https://developer.apple.com/app-store/app-privacy-details/)).
**Gate:** blocks public launch, not TestFlight; the Organizer weekly ritual
plus the pause rule covers 30 testers.

### 8. Export compliance and store-record hygiene, nowhere in any document

`ITSAppUsesNonExemptEncryption` appears nowhere in `ios/project.yml` or any
plist (grep verified). Without it, every single upload stops on the App
Store Connect encryption questionnaire; with it set to `false` (HTTPS-only
apps are exempt) uploads flow through
([export compliance overview](https://developer.apple.com/help/app-store-connect/manage-app-information/overview-of-export-compliance)).
Adjacent one-time items in the same session: the age rating (obligations §7
already suggests 17+ to bury the COPPA question), guideline 2.5.1's
expectation that the description mentions the financial-data integration,
and the annual US BIS encryption self-classification report that even
"exempt" apps owe (Unverified in detail; settle when filing the first one).
**Gate:** none of it blocks approval by itself; all of it produces friction
at every upload. One hour, total.

### 9. Backend error triage has a decision that contradicts the compliance docs

`docs/environments-research.md` §10 says: at first external tester, add
Sentry to the backend only. But `docs/legal/service-providers.md`, the
privacy policy, and the Safeguards 314.4(f) service-provider oversight row
(`docs/obligations.md` §1) all enumerate a closed set of processors, and
Sentry is in none of them; error payloads can carry request context that the
no-PII logging rule (`.claude/rules/security.md` #2) exists to keep out of
third parties. This is not a "never": it is an unreconciled decision. The
shipped privacy-first cohort splits here too (WordPress and Firefox use
Sentry; Signal, Thunderbird, DuckDuckGo do not, section 4). **Do:** either
reverse the §10 line and stay first-party (pino serializers already scrub;
Fly log retention is the real weakness, and the log-ship trigger in the same
section covers it), or adopt Sentry deliberately: DPA, `service-providers.md`
row, privacy policy sentence, scrubbing config, in the same PR that adds the
SDK. Recommendation: stay first-party until 1,000 users, same trigger as
PRD §24, because a solo founder debugging 30 testers reads logs either way.
**Gate:** decision integrity, not a launch blocker.

### 10. The judgment

Items 1 to 5 are launch-path work totaling roughly a week, and every one of
them is invisible in sandbox, which is why a week of spec-writing never
surfaced them. Items 6 to 9 have stated triggers and owners. Everything else
found in this audit is either already tracked in the PRD's own gap lists
(which are unusually honest), already deliberately deferred with a written
trigger, or genuinely small; the divergence audit below records those
verdicts so nobody re-litigates them. Nothing found here contradicts the
app-first pivot or suggests new infrastructure; the theme of every real gap
is the same: **the last mile between "the code is right" and "a store, a
bank, and a stranger's phone will accept it."**

---

## 2. The divergence audit

For each significant system: how Coiny does it, how it is normally done, and
a verdict. **Defect** = will cost something concrete, with what and when.
**Deliberate trade** = diverges for a reason that holds, with the condition
under which it stops holding. **Better** = do not "fix" it back to the norm.

### 2.1 Database migrations

- **Coiny:** hand-written SQL in `backend/drizzle/` with a hand-maintained
  `meta/_journal.json`; run as a Fly `release_command` before machines take
  traffic (`fly.toml:22-23`); a unit test asserts journal ordering
  (`backend/tests/migration-journal.test.ts`, referenced in
  `.github/workflows/migration-rehearsal.yml`); and a CI rehearsal applies
  pending migrations to a disposable Neon branch of the real production
  database on every migrations-touching PR
  (`.github/workflows/migration-rehearsal.yml`).
- **Norm:** generated migrations (`drizzle-kit generate`, which also writes
  the journal), applied by a release step. Almost nobody rehearses against a
  production copy in CI.
- **Verdict: deliberate trade, now well-defended, with one residual edge.**
  The journal silently skipped four migrations across two incidents
  (`docs/build-status.md`, `backend/CLAUDE.md`) before the test and the
  rehearsal existed; those two controls now catch the failure class, and the
  release-command placement (deploy aborts, previous version keeps serving)
  is exactly the industry pattern. The residual edge: the journal is still
  edited by hand, so the defect is prevented by tests rather than made
  impossible. When next convenient, generate journal entries with the
  already-present `db:generate` script (`backend/package.json`) or a tiny
  append script, and the class disappears at the source. Stops holding: never;
  this is cheap insurance either way.

### 2.2 CI pipeline

- **Coiny:** eleven workflows, all actions SHA-pinned: backend
  (audit, copyleft-license gate, Biome, typecheck, coverage at 75%), iOS
  (SwiftLint strict, unit + UI tests on a dynamically selected simulator,
  xcresult artifact on failure, macOS-cost path gating), Android (lint +
  JVM unit tests, path-gated), CodeQL (JS/TS + Swift), Semgrep, Gitleaks,
  Trivy on the built image, CycloneDX SBOM, migration rehearsal, deploy
  (`.github/workflows/`).
- **Norm** (from the eleven repos in section 4): tests + lint + a release
  lane. Very few small shipped apps carry SBOM, license gates, image
  scanning, or migration rehearsal.
- **Verdict: better than the norm on rigor, with two missing stages every
  mobile pipeline has.** (1) No workflow ever builds the **Release**
  configuration of either client: iOS CI runs Debug tests only
  (`ios-ci.yml:99-113`), Android runs `lintDebug`/`testDebugUnitTest` only
  (`android-ci.yml:53-59`), so a release-only break (optimization,
  entitlement, R8 once minification turns on) is invisible until an archive
  fails at the worst moment. Add one `xcodebuild -configuration Release
  build` job and one `assembleRelease` job before the first TestFlight
  build; roughly an hour. (2) No distribution lane at all, covered in
  section 1 item 5. Also worth naming as fine: no emulator/instrumented
  Android job is a documented, correct deferral (`android-ci.yml:88-91`).

### 2.3 Release process and versioning

- **Coiny:** backend deploys to staging automatically on merge via a
  `pull_request: closed` trigger (a documented workaround for GITHUB_TOKEN
  not firing downstream workflows, `backend-deploy.yml:7-12`); production is
  a separate never-yet-created app behind a GitHub Environment with a
  required reviewer and a refuse-if-absent guard (`backend-deploy.yml:99-110`).
  Clients: no tags, no changelog, static version strings everywhere
  (`ios/project.yml:52-53`, `android/app/build.gradle.kts:31-32`).
- **Norm:** tagged releases, scripted bump, changelog discipline, a human
  approval gate before store publish (Thunderbird's
  [shippable_builds.yml](https://github.com/thunderbird/thunderbird-android/blob/main/.github/workflows/shippable_builds.yml)
  is the fullest example).
- **Verdict: backend better, clients defect.** The staging/production split,
  the environment gate, and the honest "production does not exist yet" are
  ahead of most solo projects, and the `pull_request: closed` trigger is an
  acceptable workaround (its only miss, direct pushes to main, is blocked by
  the branch-guard hook anyway, `.claude/hooks/branch-guard.sh`). The client
  side costs real money at the second upload (section 1, item 5). One more
  client defect: every device build bakes `coiny-backend.fly.dev` into the
  binary (`ios/project.yml:85`, `android/.../Api.kt:95`);
  `docs/environments-research.md` §8 already orders the domain bought before
  any distributed build, and item 1 above gives the same domain a second,
  harder deadline.

### 2.4 Test taxonomy and coverage

- **Coiny:** backend, 117 test files, real SQL through PGlite, HTTP through
  `app.inject()`, fixture-driven webhook tests, network interception
  asserted as a test of its own (`docs/build-status.md`); iOS, 53 unit-test
  files plus 6 UI test files run against a `--ui-testing` fixture backend
  (`ios/Coiny/Support/UITestSupport.swift`); Android, exactly one unit test
  (`android/.../PetStateDecodingTest.kt`).
- **Norm:** mock-heavy unit tests, some snapshot testing on design-led apps
  (isowords generates its App Store screenshots from snapshot tests;
  nowinandroid runs Roborazzi screenshot tests in CI), a thin E2E layer.
- **Verdict: backend better; iOS partial; the cross-client contract layer is
  the real hole.** The backend suite is genuinely unusual in quality for the
  repo's age. The iOS gap is known to the PRD (R-23.5: no authenticated
  smoke path, no snapshot tests for the §8 state matrix or Dynamic Type) and
  matters more than the PRD's Partial suggests for a product whose §8 state
  matrix is its most valuable section: without snapshot tests the matrix has
  no regression net at all. The new hole this audit adds: no test anywhere
  proves the three decoders (Zod, Swift `Codable`, kotlinx) agree on one
  fixture set (section 1, item 4). One Android decode test against live-shape
  fixtures would have caught the healthScore-defaults problem the day the
  response changed.

### 2.5 Error handling and observability

- **Coiny:** per-class `{value, asOf, status}` with server-side exclusion
  (R-8.1 to R-8.4, Built), pino with scrubbing serializers, Fly health
  checks plus a scheduler heartbeat in `/health`, APNs failures dropped by
  design (`backend/src/reactions/dispatch.ts`), no error tracker, no log
  retention beyond Fly's, no uptime pinger yet (decided for go-live,
  `docs/environments-research.md` §10), no client crash pipeline (item 7).
- **Norm:** Sentry everywhere, a log sink, an uptime monitor.
- **Verdict: the freshness/status system is better than the norm** (most
  shipped finance apps render silent zeros; this codebase made them
  unrepresentable and the Android client inherits it server-side). The rest
  is a coherent set of deliberate trades with written triggers, except the
  two items promoted above: the unbuilt MetricKit decision (item 7) and the
  Sentry contradiction (item 9). One small defect found in passing: alert
  pushes are sent with `content-available: 1` in the payload
  (`backend/src/push/apns.ts:31`); Apple reserves that flag for background
  delivery and mixing it into alert pushes is a documented source of
  throttling oddities. Unverified severity; settle against Apple's payload
  reference when next touching `apns.ts`, and drop the flag.

### 2.6 Secrets management

- **Coiny:** macOS Keychain locally via `bin/load-secrets.sh`, Fly secrets
  in deployment, GitHub Actions secrets in CI with the rehearsal workflow
  deliberately using labeled nonsense placeholders
  (`migration-rehearsal.yml:105-115`), Gitleaks on every push, connection
  strings kept out of job logs by redirection (`migration-rehearsal.yml:89-95`).
- **Norm:** `.env` files, often committed once by accident.
- **Verdict: better.** The one open item is the environments doc's own
  recommendation (password manager as canonical store, Keychain as cache,
  key-rotation rehearsal on staging), which is a founder task, not an
  engineering divergence. Keep the APNs-host note from `docs/environments-setup.md`
  (host keyed on `NODE_ENV` at `backend/src/push/apns.ts:28`, so staging
  targets production APNs and local Xcode builds only get sandbox push from
  a locally run backend): that is a **documented deliberate trade** with the
  stated escape hatch (`APNS_ENV`) if staging ever needs sandbox pushes. It
  stops holding the day someone tries to test push end-to-end against
  staging with a Debug build and wonders why nothing arrives; the doc
  already predicts this, so the only risk is not reading it.

### 2.7 Dependency management

- **Coiny:** seven production dependencies on the backend (`backend/package.json`),
  a written no-new-dependencies rule, Dependabot weekly with grouped PRs
  (`.github/dependabot.yml`), `pnpm audit` high-severity gate, copyleft
  license gate, SBOM per build, three-stage Docker with pnpm and npm removed
  from the runtime image and a non-root user (`backend/Dockerfile`), Node
  pinned to one version in all four places after the three-Node-versions
  incident (`docs/build-status.md`).
- **Norm:** dozens of dependencies, a framework for everything, unpinned CI.
- **Verdict: better, and worth protecting.** This is the direct cause of the
  small attack surface, the fast CI, and the absence of a RevenueCat-shaped
  bill. The only watch item: the custom in-house implementations this policy
  forces (APNs over raw http2, App Store JWS verification in
  `backend/src/appstore/`) are exactly the code that must not rot, and they
  are tested (`backend/tests/apns.test.ts`, `appstore-jws.test.ts`), which
  is the right mitigation.

### 2.8 API contract and versioning

- **Coiny:** additive-only, no URL versions, Zod as source of truth
  (R-14.1); hand-written Swift and Kotlin decoders; a stale
  `docs/openapi.yaml` from May (git log); server-enforced business rules so
  clients inherit them (R-14.2).
- **Norm:** for first-party-only APIs, exactly this, plus a version
  handshake; OpenAPI codegen appears mostly in teams with external
  consumers.
- **Verdict: the shape is fine; the missing handshake and the stale spec are
  defects.** Both are covered in section 1 item 4. Delete `docs/openapi.yaml`
  or regenerate it from the Zod schemas; a wrong spec is worse than none
  because it reads as authoritative. The expand-and-contract rule written in
  `docs/environments-research.md` §8 ("the server must always be newer than
  the oldest client") is correct and should be promoted into `CLAUDE.md`
  once a client ships.

### 2.9 Auth and session handling

- **Coiny:** provider JWTs verified against JWKS with issuer/audience pinned
  and `sub` cross-checked; opaque bearer sessions stored as SHA-256 hashes
  with 30-day sliding and 90-day absolute expiry
  (`backend/src/api/auth.ts`, `backend/src/store/sessions.ts`); iOS keeps
  the raw token in the Keychain with
  `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly`
  (`ios/Coiny/Services/Keychain.swift`).
- **Norm:** JWT access/refresh pairs, often unrevocable in practice.
- **Verdict: better.** Opaque hashed server-side sessions are simpler and
  revocable; the known revoke-all gap is tracked (R-15.3). One divergence
  inside the family: Android persists the same session token in a plain
  DataStore with a written rationale comment
  (`android/.../data/SessionStore.kt`). The rationale (opaque, revocable,
  single-session blast radius) mostly holds, but it is weaker than the
  product's own iOS rule and weaker than what the Play Data Safety form will
  want to claim about encryption at rest. **Deliberate trade that stops
  holding at Android public launch:** wrap the token with an Android
  Keystore key before then, or accept it in writing in the Data Safety
  answers.

### 2.10 State management on the clients

- **Coiny iOS:** plain SwiftUI with per-view observable view models, an
  actor-based API client (`ios/Coiny/Services/API.swift`), a persisted
  net-worth cache for offline (`NetWorthCache.swift`). No TCA, no Combine
  graph. **Android:** ViewModel + StateFlow + Compose, ktor client
  (`android/app/src/main/kotlin/app/coiny/`).
- **Norm:** the same, or heavier frameworks.
- **Verdict: fine on both.** The one Android note: `expectSuccess = true`
  with no per-call error mapping (`android/.../data/Api.kt`) means any non-2xx
  throws a generic exception up to the ViewModel; acceptable at four
  screens, worth a typed error layer at parity time, mirroring what
  `APIError` already does on iOS.

### 2.11 Build configuration, both clients

- **iOS:** XcodeGen-managed (`ios/project.yml`), warnings as errors, two
  configurations with the API URL as a build setting and a staging fallback
  chosen so a misconfigured build hits fake data. All good. Defects and
  gaps: static version strings (item 5); no Beta configuration yet (the
  environments doc plans one); `DEVELOPMENT_TEAM` empty; `aps-environment`
  fixed at `development` in the entitlements (`project.yml:70-73`), which
  automatic signing rewrites at distribution export, Unverified until the
  first archive, settle then.
- **Android:** release build is unsigned, unminified (`isMinifyEnabled =
  false`), `versionCode 1`, launcher icon is the literal Android system
  default (`android:icon="@android:drawable/sym_def_app_icon"`,
  `AndroidManifest.xml:19`), and the manifest still declares
  `BLUETOOTH_SCAN`/`BLUETOOTH_CONNECT` for parked hardware
  (`AndroidManifest.xml:8-10`). The iOS side already removed its Bluetooth
  background mode citing App Review 2.5.4 risk (`ios/project.yml:62-65`);
  Android kept the equivalent. **Defect, cheap:** delete the BLE permissions
  now (unused permissions are a standing Play review flag and a Data Safety
  complication), and treat signing, minification with keep rules, icon, and
  version automation as part of the real Android launch list in section 5.

---

## 3. The compliance sweep

Rules that plausibly apply and appear in no Coiny document, plus verdicts.
The existing coverage (`docs/obligations.md`, `docs/prd.md` §26-§27,
`docs/legal/`) is unusually good on Apple 3.1.x/5.1.1, FTC Safeguards, GLBA,
and Plaid's developer policy; this sweep lists only what is absent or
under-weighted. Apple guideline text from the
[App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/);
Google from the linked policy pages.

### Apple

| Rule | What it requires | In docs? | Verdict |
|---|---|---|---|
| 3.2.2(ix) | Personal-loan apps: disclose max APR, no APR above 36%, no repayment demanded within 60 days | No | **Does not apply.** Coiny displays a user's existing APRs and payoff math and originates nothing. Becomes live the day any consolidation/refinance referral ships, which §3.2 already bans. Keep metadata free of "loan" language |
| 3.1.2 EULA/policy links with the offer | Functional Terms of Use and privacy policy links on the paywall and in metadata | No | **Applies; missing** (section 1, item 2) |
| 2.1(a)/(b) | Demo account with backend enabled; all IAPs purchasable at review time | Demo account yes (B9); the IAP-visible-at-review half, no | **Applies.** The review build must complete a purchase; plan sandbox products and the reviewer flow together |
| 2.5.1 | Description should indicate the financial-data integration | No | **Applies, trivial.** One sentence naming Plaid in the listing |
| Account deletion detail | Sign in with Apple token revocation via `/auth/revoke` on deletion ([Apple](https://developer.apple.com/support/offering-account-deletion-in-your-app/)) | No | **Applies; missing** (section 1, item 3) |
| Export compliance | `ITSAppUsesNonExemptEncryption`, plus annual BIS self-classification | No | **Applies** (section 1, item 8) |
| 5.1.2(i) | Explicit permission before personal data reaches third-party AI | No | **Does not apply today.** Binding constraint on any future LLM feature touching financial data; record it before one is built |
| TestFlight external = Beta App Review | External TestFlight builds are reviewed against the guidelines ([TestFlight](https://developer.apple.com/help/app-store-connect/test-a-beta-version/overview-of-testflight)) | Under-weighted | **Urgency correction.** The docs treat demo account, policy URL, and labels as "submission" blockers; they bite at the first *external TestFlight* build, which is the very next milestone |
| 3.1.1 loot-box odds | Odds disclosure for purchasable randomized items | No | **Does not apply** while nothing random is sold. The cosmetics-in-tiers doctrine (R-25.5) keeps it that way; note it so a future "mystery egg" cosmetic does not walk into it |
| EU DSA trader verification | Trader status displayed for EU distribution | No | **Does not apply** (US-only launch). Applies at any EU/UK App Store availability; Unverified detail, settle at that decision |

### Google Play (all absent from the docs except fragments of Core App Quality in PRD §27)

| Rule | What it requires | Verdict |
|---|---|---|
| [Data Safety form](https://support.google.com/googleplay/android-developer/answer/10787469) | Declare every data type leaving the device, encryption in transit, deletion mechanism; inaccuracy blocks updates or removes the app | **Applies.** The Apple label checklist (`docs/legal/app-store-privacy-labels.md`) is the right source material; a Play transcription document does not exist and the mapping is not 1:1 |
| [Financial Features Declaration](https://support.google.com/googleplay/android-developer/answer/9876821) | "Any app that contains any financial features must complete the Financial features declaration form" | **Applies.** Coiny answers "none of the regulated products", but the form is mandatory; exact form contents Unverified (lives in Play Console) |
| [Play Billing](https://support.google.com/googleplay/android-developer/answer/10281818) | Subscriptions unlocking functionality must use Play Billing | **Applies.** No exemption fits; StoreKit entitlement server needs a Play sibling (section 5) |
| [Account deletion](https://support.google.com/googleplay/android-developer/answer/13327111) | In-app deletion AND a web URL for deletion without reinstalling | **Applies.** The web URL half has no iOS equivalent and no home until the domain exists; it is the most-missed item for solo developers |
| [Target API level](https://support.google.com/googleplay/android-developer/answer/11926878) | New apps must target API 35 today; API 36 required from 2026-08-31 | **Applies with a date.** `targetSdk = 35` (`android/app/build.gradle.kts:30`) is compliant only until August 31; any Play submission after that must target 36 |
| [Closed-testing requirement](https://support.google.com/googleplay/android-developer/answer/14151465) | Personal accounts created after 2023-11-13: 12 testers, 14 uninterrupted days, then a production-access application | **Applies if the account is personal.** An organization account is exempt; Unverified which kind exists, or whether one exists at all (section 8, Q2) |
| Core App Quality: unused permissions | Request only what the app uses | **Applies; violated today** by the BLE permissions (section 2.11) |

### Plaid production (absent items only; the rest is well covered)

| Item | Verdict |
|---|---|
| OAuth registration: HTTPS universal-link redirect URI, AASA, dashboard registration, security questionnaire before Chase/PNC ([Plaid OAuth](https://plaid.com/docs/link/oauth/)) | **Applies; missing** (section 1, item 1) |
| Launch Center supersedes the public checklist; contents behind dashboard login | **Unverified**; settle inside the [dashboard](https://dashboard.plaid.com/developers/launch-center) when applying |
| Orphaned-Item billing: errored Items bill until `/item/remove` ([billing](https://plaid.com/docs/account/billing/)) | **Covered**: deletion and per-item disconnect both call `itemRemove` (`backend/src/api/account.ts:35`, `backend/src/api/plaid-link.ts:246`). Recorded so nobody re-checks |
| FTC Safeguards small-institution exemption scope | **Covered and correct** in `docs/obligations.md`; independently re-verified against [16 CFR 314.6](https://www.law.cornell.edu/cfr/text/16/314.6): waives only (b)(1), (d)(2), (h), (i); the 30-day/500-consumer breach notice in (j) applies regardless of size |

---

## 4. What shipped apps have in their repos that we do not

Repositories read: [signalapp/Signal-iOS](https://github.com/signalapp/Signal-iOS),
[wikimedia/wikipedia-ios](https://github.com/wikimedia/wikipedia-ios),
[pointfreeco/isowords](https://github.com/pointfreeco/isowords),
[wordpress-mobile/WordPress-iOS](https://github.com/wordpress-mobile/WordPress-iOS),
[mozilla-mobile/firefox-ios](https://github.com/mozilla-mobile/firefox-ios),
[duckduckgo/apple-browsers](https://github.com/duckduckgo/apple-browsers),
[android/nowinandroid](https://github.com/android/nowinandroid),
[Ivy-Apps/ivy-wallet](https://github.com/Ivy-Apps/ivy-wallet) (finance,
shipped on Play, archived 2026),
[signalapp/Signal-Android](https://github.com/signalapp/Signal-Android),
[thunderbird/thunderbird-android](https://github.com/thunderbird/thunderbird-android),
[AntennaPod/AntennaPod](https://github.com/AntennaPod/AntennaPod).

What they have that this repo does not, in descending order of relevance:

1. **A scripted release ritual.** Universal, even at the smallest scale:
   isowords' [Makefile](https://github.com/pointfreeco/isowords/blob/main/Makefile)
   (agvtool bump, commit, tag, archive), ivy-wallet's CalVer bot PR plus
   [internal_release.yml](https://github.com/Ivy-Apps/ivy-wallet/blob/main/.github/workflows/internal_release.yml)
   (keystore from secrets, fastlane supply to the Play internal track),
   Wikipedia's four TestFlight/App Store lanes in its
   [Fastfile](https://github.com/wikimedia/wikipedia-ios/blob/main/fastlane/Fastfile),
   Thunderbird's fully documented
   [RELEASE.md](https://github.com/thunderbird/thunderbird-android/blob/main/docs/release/RELEASE.md)
   with a human approval gate. Coiny: nothing.
2. **Store metadata as code.** Signal-iOS keeps 43 locales of App Store copy
   in [fastlane/metadata](https://github.com/signalapp/Signal-iOS/tree/main/fastlane/metadata)
   even though its Fastfile is empty; Thunderbird keeps 57 locales in
   [app-metadata/](https://github.com/thunderbird/thunderbird-android/tree/main/app-metadata).
   At Coiny's scale this is one `metadata/en-US` directory holding the
   description, keywords, release notes, and the two legal URLs, versioned
   like everything else. Coiny: nothing (blocked on the name, DR-31, which
   is itself a reason to settle the name).
3. **Screenshot automation.** isowords generates App Store screenshots from
   snapshot tests ([Tests/AppStoreSnapshotTests](https://github.com/pointfreeco/isowords/tree/main/Tests));
   WordPress drives it from config. For Coiny this pairs naturally with the
   R-23.5 snapshot tests the PRD already owes: the same fixtures produce
   both the regression net and the store assets.
4. **A changelog.** RELEASE-NOTES.txt (WordPress), generated changelogs
   (AntennaPod's create-changelog workflow), per-build-code changelog files
   (Thunderbird). Coiny has git history and nothing user-facing.
5. **Release-configuration builds in CI** (Signal builds via
   [Scripts/build-and-test.sh](https://github.com/signalapp/Signal-iOS/blob/main/.github/workflows/main.yml)
   on every PR; nowinandroid assembles all variants). Covered in 2.2.
6. **Crash reporting: the survey validates Coiny's abstention.** Of eleven
   shipped apps, only WordPress and Firefox carry Sentry; Signal (both
   platforms), Wikipedia, DuckDuckGo, Thunderbird, ivy-wallet, and
   AntennaPod ship with no third-party crash SDK, several with first-party
   telemetry (Wikipedia's in-repo event platform client, DuckDuckGo's
   PixelKit) that looks structurally like PRD §24. Coiny is in the majority
   cohort of privacy-positioned apps, not an outlier. The difference: those
   apps implemented their first-party pipelines; Coiny's crash half is
   unimplemented (section 1, item 7).
7. **Not adopted by anyone, so not owed:** Danger appeared in zero repos;
   issue templates and stale bots are universal but meaningless for a solo
   repo with no public issues; reproducible builds (Signal-Android) and
   baseline profiles (nowinandroid) are later-stage concerns.

---

## 5. Android specifically: what a day buys

The estimate under audit: "reaching parity is roughly a day of work."
Current Android state: 16 Kotlin files, 4 screens against the legacy API
surface, Google Sign-In via Credential Manager (done properly), 1 unit test
(`android/app/src/`).

**What a day plausibly buys** (ports of existing iOS surfaces against APIs
that already exist):

- Updating `Models.kt` to the current `/api/pets` and `/api/net-worth`
  shapes (ladder, stage, per-class `{value, asOf, status}`), and rendering
  Wealth's six groups and the read-only journey. The server-side enforcement
  design (R-8.4, R-14.2) genuinely pays off here: exclusion, staleness, and
  pace logic need no Kotlin.
- Removing the BLE permissions, replacing the default icon, wiring the
  deletion and sign-out flows to the existing endpoints.

**What is genuinely new, with no iOS code to copy:**

- **Play Billing.** Not a port of StoreKitService: different client API,
  different server verification, and Real-Time Developer Notifications
  arrive via Google Cloud Pub/Sub, meaning a Google Cloud project and a new
  webhook path beside `backend/src/webhook/appstore.ts`. Days, not hours,
  and it drags the entitlements model into being genuinely cross-platform.
- **FCM push.** The backend speaks raw APNs over http2
  (`backend/src/push/apns.ts`); `device_tokens` has a platform column but no
  FCM sender exists. Second push implementation plus quiet-hours parity.
- **Plaid Link Android SDK** integration, including the Android flavor of
  the OAuth redirect work from section 1 item 1 (App Links + assetlinks.json
  on the same domain).
- **Store surface:** Data Safety form, Financial Features Declaration,
  deletion web URL, signing + Play App Signing, R8 with kotlinx.serialization
  keep rules, target API 36 after 2026-08-31, and the 12-tester/14-day
  closed test if the account is personal (section 3 links).
- **Platform behaviors with no iOS analogue:** process-death state
  restoration, predictive back, runtime `POST_NOTIFICATIONS` permission at
  point of use, TalkBack/48dp pass (PRD §27 knows about these).
- **iOS-parity features that are themselves unbuilt on Android:** the whole
  onboarding rewrite, declared assets, debt UI, goals/guardrails UI,
  subscription reveal, offline cache, telemetry client (the event catalog is
  iOS-only today), biometric app-lock (B11 makes it a Play expectation).

**Honest total:** the screens-against-existing-API claim is roughly right
(call it two or three days with the contract-fixture tests from item 4).
Parity as a shippable Play submission is **four to six weeks of calendar
time**, dominated by Play Billing + RTDN, FCM, the store surface, and the
14-day testing clock, which is consistent with where the PRD already
schedules it (§30, months 4 to 6). The audit therefore supports the PRD
against the one-day framing: the estimate is fine for what it silently
scopes ("the screens"), and misleading as a launch estimate. The two things
worth pulling forward now regardless: create the Play developer account (as
an organization) so the clock and identity questions start, and keep the
Android client compiling against the live contract via the shared fixtures,
which is the PRD's own §3.1 requirement.

---

## 6. What we have that most do not

Worth naming so effort stops being spent where the bar is already cleared:

- **The freshness/status contract** (per-class `{value, asOf, status}`,
  server-side exclusion, no silent zeros): most shipped finance apps do not
  have this; it is the product's honesty story implemented as a schema.
- **Migration rehearsal against a copy of production data in CI**
  (`.github/workflows/migration-rehearsal.yml`): rarer than SBOMs.
- **Supply-chain posture at solo scale:** SHA-pinned actions, license gate,
  Trivy, SBOM, three-stage runtime image with the package managers deleted,
  seven production dependencies.
- **Real-SQL backend tests** (PGlite, no DB mocks) with network-interception
  self-tests after the Node-version incident.
- **Server-authoritative StoreKit 2 entitlements without RevenueCat**
  (`backend/src/appstore/`), which most indie apps buy instead of build.
- **A written obligations analysis with primary sources** and a PRD whose
  Appendix C tells the truth about what is unbuilt. The audit found the
  documents' *blind spots*, but their *claims* verified accurately against
  code in every instance spot-checked, which is not the normal experience.
- **Environment hygiene:** staging-is-default-config, production
  refuses-to-exist-until-real-keys, placeholder secrets that cannot be
  mistaken for real ones.

---

## 7. What I would deliberately not do, and the triggers

- **Full fastlane adoption.** The 50-line script (item 5) covers a solo
  cadence. Trigger: localized metadata in 3+ languages, or more than one
  upload a week, or a second platform's store automation making the shared
  tooling pay. (Precedent: Signal-iOS ships with an empty Fastfile and
  isowords with a Makefile.)
- **RevenueCat.** The server-authoritative entitlements exist and work.
  Trigger: the Play Billing + RTDN build in section 5 exceeding two weeks,
  or a real cross-platform entitlement bug; then weigh the vendor's DPA
  against the maintenance, with the privacy documents updated in the same
  decision.
- **A vendor crash SDK on iOS.** The decision is made, correct, and matches
  the shipped privacy-first cohort. Trigger for revisiting: MetricKit's
  payloads proving insufficient to fix a top crash during launch month.
- **OpenAPI codegen pipeline.** Two hand-written decoders plus shared
  fixtures is the right weight. Trigger: a third client, or the second
  contract-drift bug after the fixture tests exist.
- **Self-hosted Sentry, log aggregation stacks, tracing, BullMQ/Redis, a
  second Fly machine, SOC 2.** All have written triggers in
  `docs/engineering-budgets.md` §1/§5 and `docs/obligations.md` §7 that this
  audit confirms rather than revises.
- **Issue templates, stale bots, Danger, CODEOWNERS.** Solo repo, no public
  issue flow. Trigger: a second regular contributor.
- **A Beta App Review dry-run app or second bundle ID.** Unnecessary; the
  external-TestFlight review IS the dry run if items 1 to 3 land first.

---

## 8. Open questions for the founder, each with a recommendation

1. **Name, then domain, this week.** DR-31 leaves the name unsettled;
   section 1 item 1 and the Play deletion URL now hang infrastructure on a
   domain, and every shipped client bakes the URL in. Recommendation: make
   the name call now, buy the domain the same day, stand up
   `/.well-known/apple-app-site-association`, the policy page, and the
   deletion-request page on it before the first distributed build.
2. **Play developer account: which kind, and when?** If personal, the
   12-tester/14-day gate applies; an organization account is exempt and
   matches the finance-entity posture on both stores (same D-U-N-S the Apple
   org enrollment needs). Recommendation: register the organization account
   when the D-U-N-S arrives, months before Android code resumes. Unverified
   whether any Play account exists today.
3. **Crash data as first-party collection: approve or not?** MetricKit
   payloads posted to `/api/telemetry` mean adding Crash Data to the privacy
   label and manifest. Recommendation: approve; it is the already-written
   §10 decision taken to completion, and the label change is honest and
   small.
4. **Sentry on the backend at first tester: keep or reverse?**
   Recommendation: reverse to first-party-until-1,000-users for the reasons
   in section 1 item 9; if kept, the service-provider and policy updates are
   part of the same PR, not a follow-up.
5. **Force-upgrade UX: approve the mechanism.** A blocking "please update"
   screen keyed on a server minimum-build value. Recommendation: approve
   before the first external build; it is one endpoint and one screen per
   client.
6. **Android calendar honesty.** Accept section 5's four-to-six-week
   framing and keep Android in the months-4-to-6 block, with only the
   account creation and contract fixtures pulled forward. Recommendation:
   yes; the one-day estimate should not survive this document.
7. **The APNs staging trade.** Accept documented behavior (no end-to-end
   push testing against staging with Debug builds) or add `APNS_ENV`.
   Recommendation: accept until the first push-heavy TestFlight build, then
   add the variable; it is four lines.

---

## Appendix: Unverified, collected

- Apple team `UKL98DS9D3` enrollment type; whether a Play developer account
  exists and its type. Settle in the two developer consoles.
- Plaid Launch Center contents, security questionnaire, and production
  review SLA (dashboard login required); CIBC/Canadian OAuth specifics.
- The Play Console Financial Features Declaration form's exact field list
  (in-console only), and whether a distinct US state privacy declaration
  exists in Play Console.
- Fraction of App Store users sharing crash data with developers: Apple
  publishes no number; settle post-launch by comparing MetricKit counts
  against Organizer.
- `aps-environment` rewriting at distribution export with automatic signing;
  settle at the first archive.
- Severity of `content-available: 1` on alert pushes
  (`backend/src/push/apns.ts:31`); settle against Apple's payload reference.
- EU DSA trader-verification mechanics (not applicable until EU
  distribution).
- Whether the deployed staging build serves the exact working-tree contract
  the clients now decode (deploys track merges; this analysis read code, not
  the running service).
