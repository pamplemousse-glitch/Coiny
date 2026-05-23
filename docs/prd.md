# Coiny — Product Requirements Document

**Status:** Draft — filled from project context, verify/update anything marked ⚠️
**Last updated:** 2026-05-21
**Owner:** Antoine Wiley

---

## 1. Project Overview

Coiny is a financial companion app — eventually a physical carry device — that reacts to your real bank transactions in real time with a character (sprite/pet) that expresses emotions based on your spending behavior. Think Tamagotchi meets your bank account.

The physical device (coin-sized, BLE, fits in your pocket) reacts with animations, an LED, haptics, and sound when you overspend, get your paycheck, pay a bill on time, or hit a savings goal. The iOS app is the companion: onboarding, bank linking, push notifications, and a full-resolution version of the pet.

**Current phase:** Building a phone-only MVP (no hardware) to validate the core emotional feedback loop before investing in hardware. 3 friends on TestFlight using real bank data.

**Strategic bet:** People don't change financial behavior because of spreadsheets or shame. They change because of habit and emotional connection. Coiny makes being financially aware feel like caring for something — not like doing accounting.

---

## 2. Problem Statement

People overspend not because they don't know better, but because financial feedback arrives too late and feels too sterile. You check your banking app on Sunday and see you spent $300 on food this week — but the spending happened on Tuesday, Wednesday, Thursday. By the time the feedback arrives, the behavior is already done and the emotion is gone.

Existing financial tools treat this as an information problem. It's actually a timing and emotional resonance problem. No current product delivers instant, ambient, non-judgmental feedback at the moment of financial behavior — in a way that builds a habit rather than a guilt trip.

Coiny closes the feedback loop to under 5 seconds. The reaction is emotional, not analytical. The pet is sad when you overspend — not accusatory. It celebrates when your paycheck hits — not with a chart. Over time, users build a relationship with the pet that makes financial awareness feel like a daily habit, not a chore.

---

## 3. Goals & Objectives

1. **Validate the emotional loop** — do users actually feel something when the pet reacts? Does it change how they think about spending in the moment?
2. **Ship a phone-only MVP to 3 real users** with real bank data before touching hardware
3. **Build a daily-use habit** — Coiny should be something users open or think about every day, not a once-a-month review tool
4. **Prove the pet metaphor works** — that a non-judgmental character produces better behavior change than a sterile dashboard
5. **Lay the foundation for hardware** — the app is the validation step; hardware is the product vision

---

## 4. Success Metrics / KPIs

| Metric | Target | Why |
|---|---|---|
| D7 retention | > 40% | Early signal of habit formation |
| D30 retention | > 20% | Sustained engagement past the novelty phase |
| Push notification open rate | > 30% | Industry avg is ~10%; we should beat it because push = something happened to YOUR pet |
| Time to first reaction (post bank link) | < 24 hours | Plaid initial sync should trigger reactions quickly |
| Tester self-report: "I thought about a purchase differently because of Coiny" | > 2 of 3 first testers | The actual thesis validation |
| Onboarding completion rate (link bank) | > 70% | If people abandon at bank link, the product doesn't work |

---

## 5. Target Users / Personas

**In one sentence:** Coiny is for 22–30 year olds who grew up with Tamagotchis, feel mild anxiety about money, and want to be more financially aware — but would rather have a companion than a spreadsheet.

**Three archetypes:**

| # | Name + role | Money problem | Why Coiny |
|---|---|---|---|
| 1 | Maya, 24, UX designer, first real job | Earns well but bleeds money on DoorDash and impulse buys without noticing | Coiny gives her a gentle "oof" in the moment — not a Sunday guilt spiral |
| 2 | Jordan, 27, grad student, side gig income | Irregular income makes budgeting feel impossible; bounces between anxious and avoidant | Coiny reacts to the actual texture of their money life — not a fixed budget they can't keep |
| 3 | Priya, 29, software engineer, saving for a house | Disciplined but wants positive reinforcement, not just warnings | Coiny celebrates savings milestones and paycheck hits — makes the good stuff feel good |

**Anti-targets:**
- Power users who want detailed investment tracking and financial modeling (use Monarch Money / Personal Capital)
- People who want a budgeting app with categories, rules, and reports (use YNAB)
- Users who are actively avoiding their finances — Coiny requires linking a real bank, which is a commitment
- Enterprise / B2B buyers (this is a consumer product)

---

## 6. User Stories & Use Cases

**Core loop:**
- As Maya, I want to get a push notification when I overspend on food so I feel it in the moment, not days later
- As Jordan, I want my pet to celebrate when my paycheck hits so payday actually feels good
- As Priya, I want to see my pet's mood improve as I make good financial decisions so I feel progress

**Onboarding:**
- As a new user, I want to link my bank in under 2 minutes so I can get to the actual product
- As a new user, I want to understand what Coiny does before I connect my bank so I trust it with my data
- As a new user, I want to approve push notifications because I understand they're the main way Coiny communicates

**Edge cases:**
- As a user, I want my pet to still exist and have a mood even when no transactions have happened recently
- As a user, I want to be able to unlink my bank if I change my mind
- As a user, I want to see a history of what my pet reacted to so I can understand my spending patterns
- As a user who's offline, I want the app to degrade gracefully and show last-known state with a clear "offline" indicator
- As a user whose bank connection expired, I want to be clearly told and walked back through Plaid Link to reconnect — not left wondering why my pet stopped reacting
- As a user who denied push notifications, I want to still see reactions inside the app so the product isn't broken for me
- As a user with accounts at two banks, I want both banks' transactions to feed my pet so the picture is complete
- As a user setting up Coiny, I want to set my spending goals before my first reaction fires so the thresholds actually reflect my life

---

## 7. Functional Requirements

### P0 — Must ship before any real user touches the app

- Apple Sign In + per-user data isolation (every user has their own pet, own bank, own history)
- Plaid Link bank connection (via LinkKit on iOS)
- Plaid webhook → rule engine → pet reaction pipeline
- Push notification on every reaction (APNs, direct — no Firebase)
- Pet sprite with at least 2 distinct animations: celebrate and sad
- Onboarding flow: Welcome → **Set Goals** → Link Bank → Push Permission → Meet Pet
- Goals configuration step in onboarding — user sets their own thresholds before first reaction fires; defaults shown as starting point, not forced
- Plaid bank re-authentication flow — when Plaid sends `PENDING_EXPIRATION` or `USER_PERMISSION_REVOKED`, the app surfaces a "Your bank needs to reconnect" banner and walks user back through Plaid Link to restore the connection
- Push permission denied fallback — if user denies push, the app shows an in-app notification center (unread reaction badge on Pet tab, reactions visible without push)
- Spending/reaction history screen
- Settings: linked bank status, unlink bank, app version, notification permission status + deep link to iOS Settings if denied
- Backend deployed on Fly.io (already done)
- No unauthenticated API access
- Notification deep linking — tapping a push notification opens the app directly to the Pet tab and triggers the reaction animation

### P1 — Should ship in first real build

- Real Plaid Development environment (not sandbox) so testers use their actual bank
- Debug "fire test reaction" button visible in TestFlight builds (hidden in App Store)
- Multiple reaction animations: celebrate, sad, concerned, sleeping, neutral
- Background push refresh (app updates pet state when push arrives without tap)
- Pet mood decay over time (pet gets sad if no financial activity)
- Subscription detection reaction ("Coiny noticed Netflix is a recurring charge")
- Idle breathing animation
- Multi-bank support — link up to 3 Plaid items per user; rule engine aggregates transactions across all linked banks
- Basic analytics — track: onboarding step completion, push permission accept/deny rate, push open rate, reaction view rate, D1/D7 session counts; stored in our own `events` table (zero third-party SDK)
- Polling optimization — foreground poll interval backs off from 3s to 30s; resets to immediate on push receipt; eliminates unnecessary battery drain
- App version check — `GET /health` returns `min_client_version`; app shows non-dismissible "Please update Coiny" screen if current build is below minimum
- Biometric app lock — optional Face ID / Touch ID required to open app after 5 minutes in background; toggle in Settings; default off
- VoiceOver / Dynamic Type support — all screens must be navigable by VoiceOver; all text must respect Dynamic Type size settings; required for App Store submission
- Screen content protection — blur sensitive financial content (Spending tab, reaction reasons) when app enters background, preventing iOS app-switcher screenshots

### P2 — Nice to have for MVP, required for real launch

- Pet visual customization (species, colors, accessories)
- Sound on reactions
- Streaks & achievements (unlocked by financial milestones)
- Daily/weekly digest push notification
- BLE connection to hardware device (Phase 2 — hardware dependent)
- Android (Kotlin + Compose, post-iOS validation)
- Net worth tracking
- Cash flow forecast
- Offline cache — persist last-known pet state to local storage so the pet is visible even with no network; show staleness indicator if data is >1 hour old

---

## 8. Security Requirements

Security is the non-negotiable foundation of this product. Coiny handles real bank transaction data via Plaid. Every architectural decision is evaluated against this section first. Applicable standards: **GLBA Safeguards Rule (2023)**, **OWASP MASVS L2**, **OWASP API Security Top 10**.

---

### 8.1 Authentication & Session Management

**Apple Sign In (primary auth):**
- Use `AuthenticationServices` framework — never a third-party auth library
- Verify Apple's `identityToken` (ES256 JWT) using Apple's public keys fetched from `https://appleid.apple.com/auth/keys` — keys cached per `kid`, rotated automatically
- Extract stable `sub` (Apple user ID) — this is the permanent `user_id` across all sessions
- Never trust the client-provided `sub` — always re-derive from the verified token server-side

**Session tokens:**
- Issued as cryptographically random 32-byte values (`crypto.randomBytes(32).toString('hex')`)
- Stored in DB as SHA-256 hash only — raw token is never persisted anywhere server-side
- iOS stores raw token in Keychain with protection class `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly` — never in `UserDefaults`, `AppStorage`, `@AppStorage`, or any `@State` variable
- Expiry: 30-day rolling idle timeout; 90-day absolute max
- Each device has its own session row — multi-device logout is per-device or "log out everywhere"
- Logout immediately marks `revoked = true` in `sessions` table — server checks on every request
- Schema: `sessions(id, user_id, token_hash TEXT UNIQUE, device_hint TEXT, created_at, expires_at, last_used_at, revoked BOOLEAN DEFAULT false)`

**What is never acceptable:**
- HS256 or `"none"` algorithm JWTs
- Tokens in URL query parameters
- Session data in cookies without `HttpOnly` + `Secure` + `SameSite=Strict`
- Tokens persisted to `AsyncStorage`, `UserDefaults`, or any unencrypted store

---

### 8.2 API Authorization

**Every route requires authentication.** No exceptions except `/health` (read-only liveness) and `/webhooks/plaid` (authenticated by Plaid's own JWT signature, not session tokens).

**Fastify middleware (applied globally before any route handler):**
```
Authorization: Bearer <session-token>
```
- Middleware hashes the received token (SHA-256), looks up in `sessions` table
- Rejects if: not found, `revoked = true`, `expires_at < NOW()`
- On valid session: attaches `userId` to `request.user` — all subsequent handlers use `request.user.id`, never a client-supplied user ID
- Updates `last_used_at` on every valid request (rolling expiry)
- Returns `401 Unauthorized` with no additional detail on failure — no "token expired" vs "token not found" distinction (prevents enumeration)

**Per-user data isolation:**
- Every DB query is scoped with `WHERE user_id = request.user.id`
- No query ever returns rows across users — enforced at the query layer, not application logic
- Drizzle ORM parameterized queries throughout — no raw SQL, no string interpolation

**Rate limiting:**
- Global: 100 req/s per IP (existing)
- Per-user: 20 req/min on `/api/plaid/*` and `/api/devices/*` — sensitive endpoints
- Per-user: 5 req/min on `/api/auth/*` — brute-force protection
- Implementation: `@fastify/rate-limit` with Redis or in-memory store keyed on `user_id`

---

### 8.3 Transport Security

- **TLS 1.3 minimum** — Fly.io enforces this; no TLS 1.0/1.1/1.2 cipher suites that lack perfect forward secrecy
- **HSTS header** on all responses: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- **No HTTP fallback** — all HTTP traffic rejected at Fly.io edge, not redirected
- **Certificate pinning (iOS):** pin the backend's leaf certificate public key hash in `URLSession` configuration using `URLSessionDelegate.urlSession(_:didReceive:completionHandler:)` — reject connections whose certificate chain doesn't match. Allows rotation without app update (pin 2 keys: current + next).
- **Forbidden:** any webhook URL that is not HTTPS; any API call over HTTP

---

### 8.4 Plaid Data Security

**Access token handling (most sensitive asset in the system):**
- Plaid `access_token` is encrypted with **AES-256-GCM** before insertion into `plaid_items` table
- Encryption key: 32-byte random secret stored in Fly secrets as `DATA_ENCRYPTION_KEY` — never in code, never in logs, never returned in any API response
- Decryption happens only inside the backend process, only when a Plaid API call requires it
- If `DATA_ENCRYPTION_KEY` is rotated: re-encrypt all stored tokens before deploying new key
- A compromised Neon DB without `DATA_ENCRYPTION_KEY` cannot read any Plaid access tokens

**Webhook security (already implemented — verify remains in place):**
- Every `POST /webhooks/plaid` request verified via Plaid's JWT (ES256) + `request_body_sha256` matching raw body
- Public keys cached per `kid`, fetched from Plaid's JWKS endpoint on first use
- Reject without processing if signature invalid or `request_body_sha256` mismatch
- Timing-safe comparison for all HMAC/hash checks

**Token revocation on bank unlink:**
- Call `POST /api/plaid/item/remove` (Plaid API) to revoke the access token at Plaid's end
- Only after successful Plaid revocation: delete row from `plaid_items`
- Also delete: all rows in `transactions`, `processed_events` for that user — right to erasure
- Failure to revoke at Plaid's end: log error, surface to user, do not silently swallow

**Data minimization:**
- Store per transaction: `transaction_id`, `account_id`, `merchant_name`, `amount`, `date`, `category`
- Never store: full account numbers, routing numbers, SSN, raw Plaid response blobs, balance history beyond what rules require
- Push notification payloads: never include transaction amounts or merchant names — reaction reason text only (e.g. "You've been spending a lot on food lately" not "You spent $47.23 at McDonald's")
- Retention: transaction rows deleted when user unlinks bank or deletes account

---

### 8.5 iOS Client Security

**Biometric app lock:**
- Optional Face ID / Touch ID lock after app backgrounds for >5 minutes
- Implemented via `LocalAuthentication.LAContext.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, ...)`
- If biometrics unavailable: fall back to device passcode (`deviceOwnerAuthentication`)
- If authentication fails: app stays on lock screen, does not show financial content
- Toggle in Settings (`@AppStorage("biometricLockEnabled")`) — default off for MVP, default on post-launch
- Lock state persisted via `sceneDidEnterBackground` timestamp; checked on `sceneWillEnterForeground`

**Screen content protection:**
- On `sceneDidEnterBackground`: overlay a blur view (`UIBlurEffect`) or replace sensitive views with app icon to prevent iOS capturing financial content in the app switcher snapshot
- Remove overlay on `sceneWillEnterForeground` after biometric auth passes (if lock enabled)
- The Spending tab (transaction reasons, amounts) and any screen showing financial data must be covered
- Never allow screenshots of financial content to appear in iOS Photos via screen recording — use `UITextField.isSecureTextEntry` equivalent where applicable

**Clipboard:**
- Disable copy/paste on any text field that could surface financial data
- Never call `UIPasteboard.general.string = ...` with transaction amounts or merchant names

**Keychain storage:**
- Session token: `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly` — wiped if device passcode removed
- `kSecAttrSynchronizable = false` — never syncs to iCloud Keychain (session tokens are device-scoped)
- Do not store anything sensitive in `UserDefaults`, `@AppStorage`, or `NSUbiquitousKeyValueStore`

**Background app snapshot:**
- When app enters background (`sceneDidEnterBackground`): overlay a blur view or replace sensitive content with the app icon — prevents iOS from capturing transaction history in the app switcher screenshot

**Data in memory:**
- Plaid access tokens never exist in the iOS app — backend only
- Session token in memory only for the duration of a request — not stored in any observable `@State` or `@Published` property that could be serialized

**Jailbreak / debugger detection (OWASP MASVS L2):**
- On launch: check for common jailbreak indicators (writable `/private`, Cydia, unusual file paths)
- If jailbroken: warn user that security guarantees cannot be maintained; optionally refuse to run
- Anti-debugging: in Release builds, `ptrace(PT_DENY_ATTACH, 0, 0, 0)` to block debugger attachment (standard for banking apps)

**App Transport Security:**
- `NSAllowsArbitraryLoads = false` (default, never override)
- Explicitly list `coiny-backend.fly.dev` with `NSRequiresCertificateTransparency = true`

---

### 8.6 Logging & Observability Hygiene

**Never log:**
- Transaction amounts, merchant names, account IDs
- Session tokens (raw or hashed)
- Plaid access tokens (encrypted or not)
- Apple `sub` / user ID in conjunction with any financial data
- Full request/response bodies on financial endpoints

**Always log (pseudonymous only):**
- `transaction_id` (opaque Plaid ID — not linkable to a person without the DB)
- `item_id` (Plaid item — opaque)
- HTTP status codes, route names, latency
- Webhook type + code
- Auth failures (no detail, just the event)

**Log retention:** Fly.io default 7 days — acceptable for MVP. No persistent log sink until post-launch.

**Audit trail:** All `plaid_items` inserts/deletes and `sessions` revocations should log a structured audit event — who (user_id hash), what, when. This is the GLBA "audit log" requirement.

---

### 8.7 Error Handling

- All 4xx/5xx responses return only: `{ "error": "<short generic message>" }` — no stack traces, no internal error codes, no framework error details
- `500 Internal Server Error` → `{ "error": "Something went wrong" }` always
- `401` → `{ "error": "Unauthorized" }` — no distinction between expired/revoked/missing token
- `404` → `{ "error": "Not found" }` — never leak whether a resource exists for a different user
- Fastify's default error serializer must be overridden to strip `stack` and `code` fields in production
- Uncaught exceptions: crash the process (Fly.io restarts it) — never swallow and continue with corrupted state

---

### 8.8 Secrets Management

| Secret | Storage | Never in |
|---|---|---|
| `DATA_ENCRYPTION_KEY` (AES key for Plaid tokens) | Fly secrets | Code, logs, Git |
| `APNS_KEY` (.p8 content) | Fly secrets | Code, Git, any file |
| `PLAID_CLIENT_ID` / `PLAID_SECRET` | Fly secrets | Code, Git |
| Session token (raw) | iOS Keychain only | UserDefaults, DB, logs |
| Apple Sign In private key (if generated) | Fly secrets | Code, Git |
| Local dev secrets | macOS Keychain via `bin/load-secrets.sh` | `.env` files |

**Git enforcement:**
- `.gitignore` covers: `*.env`, `.env.*`, `*.pem`, `*.key`, `*.p8`, `secrets/`, `credentials/`
- Pre-commit hook: `git-secrets` or `gitleaks` scan blocks commits containing high-entropy strings matching key patterns
- If a secret is ever committed: rotate immediately, then remove from history with `git filter-repo` — assume it is compromised the moment it touches a commit

---

### 8.9 Dependency Security

- **Backend:** GitHub Dependabot on `backend/package.json` — auto-PRs for patch/minor updates; manual review for major
- **iOS:** Dependabot on `Package.swift` / Swift Package Index
- **`npm audit`** runs in CI on every PR — fails build on high/critical severity unfixed vulnerabilities
- **No new dependencies without justification** — each package is a supply-chain surface (from CLAUDE.md, enforced)
- **GitHub Actions:** all actions pinned to full commit SHA (e.g. `actions/checkout@a81bbbf` not `@v3`) — prevents tag-hijacking supply chain attacks
- **License audit:** no GPL dependencies in the iOS app (App Store restriction)

---

### 8.9b Advanced Attack Surface Controls

**BOLA / IDOR (OWASP API Security #1 — Broken Object Level Authorization):**
- All DB object IDs exposed in API responses must be UUIDs, never sequential integers — sequential IDs allow enumeration attacks
- Every endpoint that takes an object ID (`/api/pets/:id`, `/api/transactions/:id`) must verify `WHERE id = ? AND user_id = request.user.id` — never just `WHERE id = ?`
- A user who guesses another user's UUID must receive `404 Not Found`, not `403 Forbidden` — `403` confirms the object exists
- This is the #1 API vulnerability class — a single missing `user_id` check exposes every user's financial data

**Mass Assignment / BOPLA (OWASP API Security #3):**
- All request body parsing uses explicit Zod schemas that allowlist exactly the fields accepted — unknown fields stripped before reaching handlers
- Sensitive fields (`user_id`, `is_admin`, `session_token`, `access_token`) never accepted from client input under any circumstance
- Zod's `.strict()` mode on all request schemas — extra fields cause a `400` rejection, not silent ignore

**JWT Algorithm Confusion:**
- Apple Sign In tokens: only accept `alg: ES256` — reject `alg: none` and any HMAC algorithm
- Session tokens are random bytes, not JWTs — no algorithm confusion surface
- `jose` library configured with explicit algorithm allowlist — never auto-detect from token header

**Replay Attack Protection on Webhooks:**
- Plaid includes a `Plaid-Verification` JWT with `iat` claim — reject if `iat` is older than 300 seconds
- Additionally: store processed Plaid `jti` (JWT ID) values in a short-TTL cache (5 min Redis or in-memory LRU) — reject duplicate `jti` values within the window
- HMAC verification alone does not prevent replays — a valid captured webhook can be replayed indefinitely without this

**Clipboard Data Leakage (iOS):**
- Disable copy/paste on any text field that could contain sensitive data (account numbers, session tokens if ever shown)
- Never programmatically write financial data to `UIPasteboard.general`
- iOS 16+: use `UIPasteboard.general.detectPatterns` to audit what the app touches

**Universal Links (not custom URL schemes):**
- Any deep links into the app must use Universal Links (`https://coiny.app/...`) backed by `apple-app-site-association` at `/.well-known/apple-app-site-association` — served over HTTPS, no redirects
- Never use custom URL schemes (`coiny://`) for anything that carries auth state — other apps can register the same scheme and intercept

**Secure Enclave for Key Operations:**
- Session token signing keys (if we ever sign anything client-side) must use `SecureEnclave.P256.Signing.PrivateKey` — private key never leaves hardware
- Only P-256 curve supported in Secure Enclave — plan accordingly

**PKCE for OAuth 2.0 flows:**
- Apple Sign In on iOS uses `ASAuthorizationAppleIDRequest` which handles PKCE internally
- If any future OAuth flow is added (Google, etc.): code verifier = 43–128 char random string; code challenge = `BASE64URL(SHA256(verifier))`; `response_type=code` only — never `response_type=token` (implicit flow is deprecated and insecure on mobile)

**Business Logic Hardening:**
- Rule engine: each transaction processed exactly once — idempotency enforced by `processed_events` table (already implemented)
- No client-controlled fields that affect financial rule evaluation — all rule thresholds come from server-side `goals` table, never from request body
- Concurrent webhook delivery: Plaid may deliver the same webhook twice in parallel — `claimEvent()` uses DB-level upsert to prevent double-reactions
- Test for: duplicate webhook delivery, out-of-order delivery, webhook for unlinkd item

**Server-Side Jailbreak Enforcement (FFIEC guidance):**
- Client-side jailbreak detection is bypassable with tools like Shadow, Liberty, Frida
- Backend: device attestation via Apple DeviceCheck or App Attest API — validates the device is running unmodified Apple-signed iOS on genuine hardware
- On jailbreak signal: log the anomaly, flag the session, optionally require step-up auth — do not silently trust
- App Attest implementation: `DCAppAttestService.shared.generateKey()` on first launch, attest with Apple, store attestation receipt server-side

---

### 8.10 GLBA Safeguards Rule Compliance (Required — applies to all fintech regardless of size)

The GLBA Safeguards Rule (effective June 9, 2023) applies to any company that handles nonpublic personal financial information. Coiny qualifies. Requirements:

| Control | Implementation |
|---|---|
| Designated security lead | Antoine Wiley (sole founder) |
| Written information security program | This document + `docs/security.md` |
| Risk assessment | Documented in Section 16 (Risks) of this PRD |
| Access controls | Per-user data isolation + session auth (Section 8.1–8.2) |
| Encryption at rest | AES-256-GCM for Plaid tokens; Neon encrypted at rest for all other data |
| Encryption in transit | TLS 1.3 (Section 8.3) |
| MFA for systems access | Apple Sign In on iOS = possession (device) + inherence (Face ID/Touch ID). Fly.io dashboard: MFA required on Antoine's account. |
| Monitoring & logging | Structured audit log (Section 8.6) |
| Vendor management | Plaid (SOC 2 Type II certified), Fly.io (SOC 2), Neon (SOC 2) — verify annually |
| Incident response plan | See Section 8.11 |
| Annual penetration test | Required before public launch (Phase 4). MVP phase: self-assessment using OWASP MASVS checklist. |
| Breach notification | FTC notification within 30 days if ≥500 consumers affected AND data was unencrypted. Sub-500 users: notify affected users promptly. |

---

### 8.11 Incident Response Plan

**Definition of an incident:** unauthorized access to any user's financial data, Plaid access token exposure, session token compromise, or DB breach.

**Response steps:**
1. **Detect** — Fly.io alerts on unusual traffic/errors; user reports; automated audit log anomaly
2. **Contain** — revoke all active sessions (`UPDATE sessions SET revoked = true`); rotate `DATA_ENCRYPTION_KEY`; revoke all Plaid access tokens via `/item/access_token/invalidate`; take backend offline if breach is active
3. **Assess** — determine scope: which users affected, what data was accessible, whether Plaid tokens were exposed
4. **Notify** — affected users via email within 24 hours; FTC notification if ≥500 users (not applicable at MVP scale); Plaid security team at `security@plaid.com`
5. **Remediate** — patch vulnerability, re-encrypt data with new key, re-issue all tokens
6. **Post-mortem** — written root cause + timeline within 7 days

---

## 8b. Performance Requirements

- **Push latency:** reaction push must arrive on device within 5 seconds of Plaid webhook
- **App launch:** cold start < 2 seconds on iPhone 12 or newer
- **API response:** all authenticated endpoints < 500ms p99 (Fly.io + Neon, same region)
- **Availability:** Fly.io auto-restart on crash; Neon managed uptime. No SLA required for MVP.
- **iOS target:** iOS 17+, iPhone only for MVP
- **Polling strategy:** foreground poll interval = 30 seconds (not 3s — the current implementation is battery-hostile). Resets to immediate on push notification receipt. The `onChange(of: lastReactionAt)` animation trigger means aggressive polling adds no UX value.
- **Offline:** app must not crash when backend is unreachable. Show last-known pet state from local cache with a "Last updated X ago" label. Cache invalidates after 24 hours (show "Unable to connect" at that point). All network calls wrapped in `do/catch` — no unhandled throws that could crash the app.

---

## 9. User Flows

**First launch (no onboarding complete):**
1. App opens → Welcome screen (Meet Coiny + Get Started)
2. Link Bank screen → tap "Link with Plaid" → Plaid Link sheet opens
3. User enters their bank credentials in Plaid's UI (never touches our server)
4. Success → public token exchanged → bank linked → `bankLinked = true`
5. Meet Pet screen → pet animation → "Let's go" → main app

**Main loop (post-onboarding):**
1. Plaid detects a new transaction → fires webhook to backend
2. Backend verifies signature → runs rule engine → creates reaction → updates pet state
3. Backend fans out APNs push to user's registered device(s)
4. User receives push: "🎉 Coiny is celebrating!" or "😢 Coiny noticed something"
5. User taps push → app opens → pet plays reaction animation (celebrate bounce or sad droop)
6. Pet returns to idle breathing animation after 3–4 seconds

**Background (app closed):**
1. Push arrives with `content-available: 1`
2. iOS wakes app in background → `didReceiveRemoteNotification` fires
3. App silently re-fetches `/api/pets` → updates local pet state
4. Next time user opens app, pet state is already current

**Onboarding (updated — goals before bank link):**
1. Welcome screen → Get Started
2. **Set Goals screen** — sliders/inputs for weekly food budget, savings target, paycheck minimum, large purchase threshold. Defaults shown. User confirms or adjusts. Saved to backend before proceeding.
3. Link Bank → Plaid Link sheet → exchange token
4. Push Permission → `UNUserNotificationCenter` permission request with explicit rationale shown first ("Coiny notifies you the moment your pet reacts — usually within 5 seconds of a transaction")
5. If denied: show "No worries — you can always enable later in Settings" and continue; in-app notification center activates
6. Meet Pet → main app

**Plaid bank re-authentication:**
1. Backend receives `TRANSACTIONS/PENDING_EXPIRATION` or `ITEM/USER_PERMISSION_REVOKED` webhook
2. Backend sets `plaid_items.needs_reauth = true` for that item
3. `GET /api/pets` response includes `bankStatus: 'needs_reauth' | 'active' | 'unlinked'`
4. iOS: on `bankStatus == 'needs_reauth'`, show a persistent non-dismissible banner: "Your bank connection needs attention — tap to reconnect"
5. Tapping banner → calls `POST /api/plaid/link-token` with `access_token` to create an update-mode Link token → opens Plaid Link in update mode
6. On success → `bankStatus` returns to `'active'` → banner dismissed → pet resumes reacting

**Push permission denied (fallback):**
1. User denies push permission during onboarding (or revokes later in iOS Settings)
2. App detects denied status via `UNUserNotificationCenter.current().notificationSettings()`
3. Pet tab shows unread reaction badge (red dot) when new reactions have fired since last app open
4. Settings screen shows "Notifications: Off" with a "Enable in Settings" deep-link button that opens `UIApplication.shared.open(URL(string: UIApplication.openSettingsURLString)!)`
5. Reactions are still visible in the app — the product is degraded but not broken

**Notification deep linking:**
1. User receives push: "🎉 Coiny is celebrating!"
2. User taps notification
3. `UNUserNotificationCenterDelegate.userNotificationCenter(_:didReceive:withCompletionHandler:)` fires
4. App navigates to Pet tab regardless of which tab was last active
5. App immediately polls `GET /api/pets` and triggers the reaction animation on the fresh data

**Offline:**
1. App launches with no network
2. Show last-known pet state from local cache with a subtle "Last updated X ago" label
3. All API calls fail gracefully — no crashes, no empty states, no spinners that run forever
4. When connectivity restores: silently refresh and update state; remove staleness indicator if data is fresh

**Unlink bank:**
1. Settings → Bank account → "Unlink bank" (destructive)
2. Client calls `POST /api/plaid/unlink` → backend revokes Plaid token + deletes transaction data
3. Clears `bankLinked` flag locally
4. Returns user to onboarding Link Bank step (not full onboarding restart — pet and goals preserved)

**Multi-bank add:**
1. Settings → Bank account → "Add another bank"
2. Same Plaid Link flow as initial onboarding
3. Up to 3 banks linked simultaneously
4. Each bank shown in Settings with institution name and "Remove" action

---

## 10. Design & UX Notes

**Pet personality:** Encouraging, never judgmental. The pet is sad when you overspend — not angry. It celebrates wins enthusiastically. Think Studio Ghibli sidekick: quietly caring, expressive, a little goofy.

⚠️ **Antoine to lock:** Pick one from each pair:
- Encouraging vs Judgmental → **Encouraging**
- Cute/soft vs Edgy/weird → ⚠️ TBD
- Earnest vs Sarcastic → ⚠️ TBD
- Optimistic vs Realistic → ⚠️ TBD
- Modern minimal vs Retro nostalgia → ⚠️ TBD

**Visual direction:** The pet should feel alive — constant idle breathing, micro-expressions, smooth spring animations. Not a static image. The SF Symbol placeholder will be replaced by a commissioned or AI-generated sprite before the App Store submission.

**Tone:** The app is not a financial tool that happens to have a pet. It's a pet that happens to know about your money. Financial data is context, not the product.

**What it should NOT feel like:** Mint. YNAB. A bank app. Anything with charts, graphs, or red numbers.

---

## 11. Technical Requirements

### 11.1 iOS Client

| Requirement | Spec |
|---|---|
| Language | Swift 5.10+, SwiftUI |
| Minimum deployment target | iOS 17.0 |
| Project management | XcodeGen (`project.yml`) — no manual Xcode project edits |
| Bank connection | LinkKit (Plaid Link SDK 5.6+) |
| Push notifications | `UNUserNotificationCenter` + APNs direct (no Firebase) |
| Authentication | `AuthenticationServices` — Apple Sign In only |
| Keychain | `Security` framework — session token stored with `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly` |
| BLE (Phase 2) | `CoreBluetooth` — no third-party BLE library |
| Networking | `URLSession` with custom `URLSessionDelegate` for certificate pinning |
| Background modes | `remote-notification` (push refresh), `bluetooth-central` (Phase 2) |
| Compiler settings | `SWIFT_TREAT_WARNINGS_AS_ERRORS = YES` — zero warnings in CI |
| Hardware targets | iPhone only for MVP; iPad later if demand exists |

### 11.2 Backend

| Requirement | Spec |
|---|---|
| Runtime | Node 22 LTS |
| Framework | Fastify 5.x |
| Language | TypeScript strict mode (`strict: true`, no `any` without justification) |
| Input validation | Zod schemas on all external input — HTTP bodies, env vars, webhook payloads |
| ORM | Drizzle ORM — parameterized queries only, no raw SQL |
| Auth middleware | Custom Fastify plugin — validates session token on every route except `/health` and `/webhooks/plaid` |
| Encryption | Node `crypto` module — AES-256-GCM for Plaid access tokens at rest |
| Push | `jose` (ES256 JWT) + Node built-in `node:http2` for APNs — zero new dependencies |
| Plaid webhook auth | JWT ES256 + SHA-256 body hash — already implemented, must not be removed |
| Rate limiting | `@fastify/rate-limit` — global + per-user on sensitive routes |
| Package manager | pnpm 11.x |
| Test framework | Vitest — minimum 80% coverage on business logic (rules engine, auth, webhook handler) |

### 11.3 Database

| Requirement | Spec |
|---|---|
| Provider | Neon (managed Postgres 16) |
| Encryption at rest | Enabled by Neon — AES-256 |
| Encryption of sensitive columns | `plaid_items.access_token` additionally encrypted at application layer (AES-256-GCM) before insert |
| Migrations | Drizzle Kit — versioned, forward-only migrations in `backend/drizzle/` |
| Connection | SSL required (`sslmode=require` in connection string) — never plain TCP |
| Backups | Neon managed daily backups — verify restore procedure documented in `docs/security.md` |
| Multi-user isolation | All tables include `user_id TEXT NOT NULL` FK to `users` table — all queries scoped |

### 11.4 Infrastructure

| Service | Purpose | Config |
|---|---|---|
| Fly.io | Backend hosting | Auto-restart on crash; secrets via `fly secrets set`; no `.env` files |
| Neon | Postgres | SSL-only connection; daily backups |
| GitHub Actions | CI/CD | `pnpm test`, `tsc --noEmit`, `npm audit` on every PR |
| Dependabot | Dependency updates | Auto-PRs for `backend/package.json` and `ios/Package.swift` |
| gitleaks | Secret scanning | Pre-commit hook + CI step — blocks high-entropy strings in commits |

### 11.5 API Contract

- All requests: `Content-Type: application/json`, `Authorization: Bearer <token>` (except `/health`, `/webhooks/plaid`)
- All responses: `Content-Type: application/json`
- All errors: `{ "error": "<short message>" }` — no stack traces, no internal codes
- All object IDs in responses: UUID v4 — never sequential integers (BOLA/enumeration prevention)
- Versioning: no versioning for MVP; add `/v2/` prefix before any breaking change post-launch
- **OpenAPI spec:** generated from Fastify JSON Schema definitions and committed to `docs/openapi.yaml` — this is the contract Android will implement against when the time comes; must stay in sync with code

### 11.6 Data Retention & Deletion

- **Transaction rows:** retained while the user has a linked bank. Deleted in full when user unlinks bank or deletes account.
- **Reaction history:** retained up to 90 days, then purged automatically (cron job). User can request immediate deletion.
- **Session tokens (hashed):** deleted on logout or expiry. Expired rows purged by daily cron.
- **Device tokens:** deleted when user logs out or unlinks the device. Stale tokens (APNs returns 410) removed immediately.
- **Account deletion:** full erasure — `users`, `plaid_items`, `transactions`, `reaction_history`, `processed_events`, `device_tokens`, `sessions`, `category_overrides` — all rows for that `user_id` deleted. Plaid `/item/remove` called first.
- **CCPA / right to erasure:** account deletion endpoint (`DELETE /api/account`) satisfies this. Must complete within 30 days of request (aim for immediate).
- **Backups:** Neon daily backups retain 7 days. Deleted user data will be gone from backups after 7 days — acceptable and required for compliance.

### 11.7 Staging Environment

- **Production:** `coiny-backend.fly.dev` + Neon production DB — live user data
- **Staging:** `coiny-backend-staging.fly.dev` + Neon staging DB (separate Neon branch) — used for all PR testing before merge to main
- Staging uses `PLAID_ENV=sandbox` always — never real bank data in staging
- CI deploys to staging automatically on merge to `main`; production deploy is manual (Antoine triggers via `fly deploy`)
- This prevents untested code from hitting live users

### 11.8 Observability (Zero-Cost for MVP)

- **Uptime monitoring:** UptimeRobot free tier — pings `/health` every 5 minutes, emails Antoine on down
- **Error alerting:** Fly.io `fly logs --app coiny-backend` for manual review; structured JSON logs parseable by `jq`
- **Post-launch:** add Sentry free tier for error tracking when real users are affected
- **No Datadog, no Grafana, no paid APM** — budget constraint; revisit at Phase 4

### 11.9 App Store Privacy Nutrition Label (Required before App Store submission)

Apple requires an accurate `PrivacyInfo.xcprivacy` manifest and App Privacy declaration. Based on what Coiny collects:

| Data type | Collected | Linked to identity | Used for tracking |
|---|---|---|---|
| Financial info (transaction amounts, merchants) | Yes | Yes | No |
| Identifiers (Apple user ID) | Yes | Yes | No |
| Device ID (APNs token) | Yes | Yes | No |
| Usage data (pet reactions, app opens) | Yes | Yes | No |
| Diagnostics (crash logs) | No | — | — |

- **Third-party SDKs that require privacy manifest entries:** LinkKit (Plaid) — verify Plaid's current `PrivacyInfo.xcprivacy` before submission
- This declaration must exactly match reality — App Store rejection or removal if mismatched

### 11.6 Future Hardware (Phase 2)

| Component | Spec |
|---|---|
| Production MCU | Nordic nRF54L15 (Arm Cortex-M33, BLE 5.4, 6–9 month battery target) |
| Prototype MCU | M5StickS3 (ESP32-S3, for firmware development — large, not the final form factor) |
| Haptics | DRV2605L driver + LRA coin motor |
| Display | JDI LPM013M126A memory LCD (replaces obsolete Sharp LS013B7DH06) |
| Audio | MAX98357A I2S amp + 8Ω dynamic speaker |
| Power | nPM1300 PMIC + 200mAh LiPo |
| Antenna | Johanson 2450AT18A100 |
| Waterproofing | IPX4 via conformal coating + USB-C port gasket |
| BLE firmware SDK | nRF Connect SDK (Zephyr RTOS) |
| iOS BLE | `CoreBluetooth` — `CBCentralManager` + `CBPeripheral` |
| BLE security | LE Secure Connections (LESC) pairing — not legacy pairing |

---

## 12. Assumptions

1. **Users will link a real bank** — the core product requires Plaid access. If users refuse to link, the product doesn't work. Assumption: the target user (22–30, tech-savvy) is comfortable with Plaid because they've seen it in other apps (Venmo, Robinhood, etc.)
2. **Emotional feedback changes behavior** — the entire product thesis. Unvalidated. The 3-friend TestFlight is designed to test this.
3. **Phone-only is sufficient to validate the thesis** — we don't need the physical device to know if the emotional loop works. The app can prove or disprove the concept.
4. **Plaid Development approval is fast** — requesting Development access is free and typically instant. Production approval takes longer and requires LLC, privacy policy, etc.
5. **3 friends is enough signal** — for the specific question "does the pet reaction change how you feel about spending," 3 engaged users who actually use it is more valuable than 100 passive downloads.
6. **iOS-first is correct** — target demographic skews iPhone. Android comes later.

---

## 13. Constraints & Limitations

- **Budget:** ~$200–300 total. No paid SaaS (Datadog, Sentry, LaunchDarkly, etc.) until post-revenue. Free tiers only: Fly.io hobby, Neon free, GitHub free.
- **Team:** Solo. Antoine handles physical setup, hardware, phone testing, signups. Claude Code writes the code.
- **Hardware timeline:** nRF54L15 production PCB is months away. M5StickS3 prototype hardware is ordered but the firmware sprint hasn't started. Hardware is NOT a constraint for MVP-A (phone-only).
- **Plaid production:** requires LLC, privacy policy, and Plaid's approval process. Not needed for Development (100 real users free). Needed before public App Store launch.
- **Apple App Store:** financial apps face stricter review. Privacy policy URL and App Privacy nutrition label must match reality. Fine for TestFlight (no review required for internal testers).
- **No Android yet:** iOS only for the entire MVP-A and MVP-B phases.

---

## 14. Dependencies

| Dependency | Status | Blocking what |
|---|---|---|
| Apple Developer account | ✅ Done ($99 paid) | TestFlight, APNs, App Store |
| APNs key (.p8) | ✅ Done (Key ID: PXH9Y63579) | Push notifications |
| Fly.io deployment | ✅ Live | Backend reachable from real device |
| Neon Postgres | ✅ Live | Pet state persistence |
| Plaid Development key | ❌ Need to request in dashboard | Real bank data for testers |
| Apple Sign In + multi-user | ❌ Not built | Any real multi-user testing |
| LLC formation | ❌ Not done | Plaid production, App Store financial app |
| Privacy policy | ❌ Not written | App Store submission, Plaid production |
| Pet sprite art | ❌ Placeholder SF Symbols | App Store submission (TestFlight fine) |

---

## 15. Competitive Analysis

| Product | What it is | Gap vs Coiny |
|---|---|---|
| **Cleo** | AI financial assistant, chat-based, roasts your spending | Text/chat only, no pet, shame-based humor, no physical device |
| **Finch** | Self-care pet app, daily check-ins | No bank integration — pet is not reacting to real financial behavior |
| **Monarch Money** | Beautiful budgeting app, charts and trends | No emotional feedback, no pet, feels like a finance tool |
| **YNAB** | Zero-based budgeting | High friction, spreadsheet energy, shame-based, no ambient feedback |
| **Tamagotchi** | Physical carry pet | No bank integration — purely entertainment, no behavior change loop |
| **Flipper Zero** | Hacker carry device | No pet, no finance, different audience |

**Coiny's moat:** The specific intersection of (1) real financial data → (2) instant emotional feedback → (3) non-judgmental character → (4) physical ambient presence. No current product hits all four. Phone-only MVP proves (1)+(2)+(3). Hardware adds (4).

**Defensibility:** The physical device is the hard-to-copy part. Software alone is replicable in weeks. A coin-sized device in your pocket that buzzes when you overspend — that takes hardware investment, supply chain, and regulatory work that most software companies won't bother with.

---

## 16. Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Users don't link real bank (privacy fear) | Medium | High — product doesn't work | Clear Plaid trust messaging in onboarding ("your credentials never touch our servers") |
| Emotional loop doesn't change behavior | Medium | High — core thesis fails | TestFlight with 3 friends is specifically designed to test this. Pivot to pure entertainment pet if false. |
| Plaid production approval delayed | Medium | Medium — blocks public launch | Start LLC + privacy policy early; Development (100 users) covers MVP phase |
| No auth / data leak with real bank data | High (current state) | High | Build Apple Sign In + multi-user BEFORE switching to `PLAID_ENV=development` |
| Apple App Store rejection | Low | High for timeline | TestFlight bypasses review. Fix for App Store submission: privacy policy + nutrition label. |
| Hardware complexity delays prototype | High | Low for MVP-A | MVP-A is phone-only. Hardware is MVP-B. Decoupled. |
| Solo developer burnout / context loss | Medium | Medium | Claude Code maintains session context; CLAUDE.md + docs persist decisions |

---

## 17. Out of Scope

**Forever (not this product):**
- Financial advice or investment recommendations (regulatory minefield)
- Real money transfers or payments
- Joint/family accounts (Phase 5 at earliest — privacy/consent complexity)
- Crypto / DeFi integration

**Not in MVP-A or MVP-B:**
- Android (Kotlin + Compose — post-iOS validation)
- Plaid Investments product (portfolio/dividends — Phase 5)
- Pet visual customization (species, accessories — Phase 3)
- Audio customization / sound packs (Phase 3)
- Social features (pet-to-pet interactions, leaderboards — Phase 5)
- ML-based insights (requires real user dataset first)
- Manual transaction entry (cash transactions — Phase 3)
- Public App Store listing (TestFlight only for MVP)
- Hardware device (MVP-B, after phone-only MVP-A is validated)

---

## 18. Timeline & Release Plan

| Phase | Deliverable | Key work | Status |
|---|---|---|---|
| **MVP-A** | Phone-only TestFlight, 3 internal testers, real bank data | Apple Sign In, multi-user, Plaid Development, push, pet reactions | 🔴 In progress — auth/multi-user not built yet |
| **MVP-B** | Hardware prototype, same 3 testers | M5StickS3 firmware, CoreBluetooth in iOS, BLE reaction relay | ⚪ Not started — hardware ordered, firmware not written |
| **Phase 3** | Closed beta, ~20-50 users, App Store | Pet customization, audio, more reactions, Plaid production approval, LLC, privacy policy | ⚪ Not started |
| **Phase 4** | Public App Store launch | Full feature set, proper hardware form factor (nRF54L15 PCB), App Store listing | ⚪ Not started |

**Immediate next steps (in order):**
1. Build Apple Sign In + multi-user (backend + iOS) — **blocker for real bank data**
2. Request Plaid Development key in dashboard — **Antoine action**
3. Merge PR #45 (push notifications) + PR #46 (MVP-A polish) once CI green
4. TestFlight Archive → upload → invite 3 testers
5. Begin firmware sprint (M5StickS3 + CoreBluetooth) after MVP-A is live

---

## 19. Stakeholders & Roles

| Person | Role | Owns |
|---|---|---|
| Antoine Wiley | Product owner, founder | All product decisions, hardware setup, physical testing, account signups (Plaid, Apple, Fly.io, Neon), legal (LLC, privacy policy) |
| Claude Code | Engineering | All code — backend, iOS, firmware. Proposes architecture; Antoine approves before major changes. |

**External dependencies with decision power:**
- **Apple:** App Store review, TestFlight, APNs key management
- **Plaid:** Development/production access approval, bank data quality
- **Fly.io / Neon:** infrastructure uptime (managed, no action needed)

---
