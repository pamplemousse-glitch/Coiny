# Coiny pre-launch verification: Part 1, Security

**This is a Part 1 pilot.** The brief in `docs/prompts/prompt-prelaunch-verification.md`
specifies seven parts. This file contains Part 1 (Security), sections 1.0 to
1.12, only. Parts 2 to 7 (privacy, interface craft, performance, compliance,
accessibility, the ordered runbook) are deliberately absent and are not implied
by anything here.

**Written 2026-08-15** against the working tree at commit `14150c0`, branch
`docs/prelaunch-verification`. Every VERIFIED and FAILS row rests on a line of
this repository read on that date, or on a command run on that date with its
exit code recorded. UNVERIFIED rows name the instrument and the event that would
settle them.

Severity uses the PRD scale: **BLOCKER** (ships broken, loses data, breaks the
law, or fails review), **MAJOR** (materially wrong inside 30 testers), **MINOR**
(real but survivable), **LATER** (correct at scale, premature now, trigger
stated).

This document does not repeat `docs/launch-gap-analysis.md` and does not rewrite
`docs/obligations.md` §5. It cites both and extends them.

---

## 1.0 Threat model first, controls second

Method per the OWASP Threat Modeling Cheat Sheet: scope, model, identify,
mitigate. The scope is the deployed staging system plus the two clients, because
production does not exist. `docs/obligations.md` §5 is the asset-by-asset table;
what follows is the STRIDE pass over trust boundaries that §5 does not have,
plus the attacker ranking it does not have.

### Trust boundaries, STRIDE

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 1.0.1 | Device to backend: spoofing is prevented by a bearer credential the server minted, not by anything the client asserts | Read the auth plugin and confirm every protected route resolves a server-side row before the handler runs | VERIFIED | `backend/src/plugins/auth.ts:14-23` rejects any request whose bearer does not resolve through `validateSession`; `server.ts:141-182` registers all 39 API modules inside that scope |
| 1.0.2 | Device to backend: tampering with the request body cannot bypass server-side business rules | Confirm the displayed-truth rules are computed server-side, not accepted from the client | VERIFIED | R-14.2 exclusion and pace math run in `backend/src/goals/refresh.ts` and `networth/read.ts`; no route accepts a client-computed total |
| 1.0.3 | Device to backend: repudiation is bounded, the server can say which session acted | Check what the audit trail records per request | FAILS | `plugins/logger.ts:1-14` records method, url and status only; no `user_id` or session id on the request line, so "which account did this" is not answerable from logs. Safeguards 314.4(c)(8) asks for monitoring of authorised-user activity. MINOR |
| 1.0.4 | Backend to Plaid: the access token is never at rest in plaintext and never leaves the process in a log | Read the write path and grep the log call sites | VERIFIED | `store/items.ts` encrypts via `util/crypto.ts:21`; no log object in `backend/src` carries an access token (grep for `log.*access` returns nothing) |
| 1.0.5 | Backend to the other integrations: an operator-scoped key can never serve one user another user's data | Enumerate every operator key used inside a per-user request path and confirm each read is scoped by a user-supplied identifier | VERIFIED with one deliberate exception | Coinbase shared-key mode is confined to non-production (`config.ts:181-183`); Zerion, Spinwheel, Polymarket and the price vendors are operator-keyed but scoped by wallet address, `spinwheelUserId` or a holding row already filtered by `userId` |
| 1.0.6 | Plaid and Apple to the webhook endpoints: elevation of privilege via a forged push is impossible | Read both verifiers before any state is read from the payload | VERIFIED | `webhook/plaid.ts:129-133` verifies ES256 plus `request_body_sha256` before parsing; `webhook/appstore.ts:41-45` verifies the pinned Apple chain before reading the payload |
| 1.0.7 | Founder laptop to Fly and Neon: a laptop compromise does not silently become a data compromise | Check MFA on every account that can reach customer information | UNVERIFIED | Dashboard check, not a code check. `docs/obligations.md` §5 flags it and R-21.2 owns it; settles by logging into Fly, Neon, Plaid, Apple Developer and GitHub. It is a Safeguards 314.4(c)(5) obligation, not a preference |
| 1.0.8 | CI to production: a workflow cannot deploy to production without a human | Read the deploy workflow's gate and query the environment's protection rules | VERIFIED against accident, not against account compromise | `backend-deploy.yml:85-110` requires `workflow_dispatch` with `inputs.environment == 'production'`, the `production` environment, and refuses if the Fly app is absent; `gh api repos/:owner/:repo/environments` shows one `required_reviewers` rule whose reviewer is the same solo account that would trigger it |
| 1.0.9 | CI to production: a compromised action cannot exfiltrate deploy credentials from an unrelated job | Check `permissions:` on every workflow and confirm least privilege | VERIFIED with an exception | Nine of eleven workflows declare `contents: read` or narrower; `auto-merge.yml:7-9` and `dependabot-auto-merge.yml:6-8` take `contents: write` plus `pull-requests: write`, both gated on trigger and actor. No `pull_request_target` anywhere (grep across `.github/workflows` returns none) |

**Ranking.** The two boundaries that carry real risk today are the founder's
accounts (1.0.7) and CI (1.0.9), because both hold the encryption key or the
means to obtain it, and neither is verified by anything in the repository. Every
other boundary has a control that a line of code enforces.

### Attacker classes, and what each gets today

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 1.0.10 | Someone holding a stolen, already unlocked phone gets the app's data but cannot extend the compromise beyond it | Read what the app holds locally and what a signed-in session can do | FAILS | The session token is in the Keychain and the app renders the full net worth, but there is no revoke-all path, so the legitimate owner cannot end that session from a second device (`store/sessions.ts:61-65` deletes by the raw token only; R-15.3 Unbuilt). MAJOR |
| 1.0.11 | Someone holding a stolen locked phone gets nothing | Read the Keychain accessibility class and the file protection class of the cached data | FAILS | Token class is correct (`Keychain.swift:19`), but `NetWorthCache.swift:23-24` writes the whole net-worth snapshot to Application Support with the platform default file protection, which is readable after the first unlock since boot. MAJOR |
| 1.0.12 | Someone holding the IPA and nothing else gets no credential | Grep the client sources for embedded keys and check what a strings dump would surface | VERIFIED | `grep -rnE "(api[_-]?key\|secret\|password\|token) *= *\"[A-Za-z0-9_-]{16,}" ios/Coiny android/app/src` returns nothing; the only embedded constants are the staging host (`project.yml:85`) and the bundle id |
| 1.0.13 | Someone with a read-only database dump and no key learns nothing that identifies a person's behaviour | Enumerate the plaintext columns | FAILS | Merchant names and provider tokens are encrypted, but `schema.ts:147-149` leaves amount, date and category plaintext and `schema.ts:223` leaves the credit score a plaintext integer. See 1.3.1. MAJOR |
| 1.0.14 | Someone who compromises one npm dependency reaches nothing at install time and only the request path at run time | Check whether lifecycle scripts run and what the runtime image contains | VERIFIED | `pnpm-workspace.yaml:11-13` allowlists builds for `esbuild` and `unrs-resolver` only, so no other package's postinstall executes; `backend/Dockerfile:66-95` ships no package manager and runs as uid 1000 |
| 1.0.15 | Someone who phishes the founder's GitHub account cannot silently ship code | Query the live branch protection rather than reading the local hook | FAILS | `gh api repos/:owner/:repo/branches/main/protection` shows six required checks, linear history, and force-push and deletion both blocked, but `enforce_admins.enabled` is `false` and no `required_pull_request_reviews` rule exists, so the single owner account bypasses every check by pushing to `main`. `required_signatures.enabled` is also `false`. MAJOR, and it is a settings change, not code |
| 1.0.16 | A curious authenticated user poking at object IDs sees only their own rows | Sweep every store and route for a where-clause that matches by id without a user scope | VERIFIED | Script over `backend/src/store/*.ts` and `backend/src/api/*.ts` returned four `where(... .id ...)` clauses without `userId`, all of them legitimate: `users.ts:48,57` and `sessions.ts:48` key on the authenticated principal itself, `pokemon-cards.ts:109` updates a row already selected under `eq(pokemonCardHoldings.userId, userId)` at `:92` |

**What the ranking says to do.** Three of the seven attacker classes currently
succeed at something (1.0.11, 1.0.13, 1.0.15), and none of the three is fixed by
adding a control. 1.0.11 is one line of file protection. 1.0.15 is a GitHub
setting, not code, and it is the cheapest of the three by an order of magnitude.
1.0.13 is a real design decision argued in 1.3.

Sources for this subsection:
[OWASP Threat Modeling Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html),
[Threat Modeling Manifesto](https://www.threatmodelingmanifesto.org/),
[Shostack's resource index](https://shostack.org/resources/threat-modeling),
[STRIDE per element type](https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats),
[FAPI 2.0 attacker model](https://openid.net/specs/fapi-security-profile-2_0-final.html),
[Plaid trust centre](https://security.plaid.com/).
Coiny is not an OAuth authorization server and does not implement FAPI; the
attacker model is used only as the calibration for what "financial-grade" means,
and the deliberate gap is that Coiny has no sender-constrained tokens (1.4.9).

---

## 1.1 Structure the audit against MASVS, and test rather than assert

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 1.1.1 | The audit is organised by a published control set, not an invented list | Map each subsection below to a MASVS group | VERIFIED | 1.2 to MASVS-STORAGE, 1.3 to MASVS-CRYPTO, 1.4 to MASVS-AUTH, 1.6 to MASVS-NETWORK, 1.2/1.8 to MASVS-PLATFORM and MASVS-CODE, 1.12 to MASVS-RESILIENCE, Part 2 (unwritten) to MASVS-PRIVACY |
| 1.1.2 | Every control claimed as met cites the test that demonstrates it | Check that each VERIFIED row in 1.2, 1.6 and 1.8 carries a MASTG test id or a repository command | FAILS, partially | Rows in 1.2, 1.6 and 1.8 carry MASTG ids fetched from the live test index; rows in 1.3, 1.4, 1.5, 1.9 and 1.10 are server-side and have no MASTG equivalent, so they cite ASVS or the vendor contract instead. MINOR |
| 1.1.3 | The brief's own route from control to test is usable | Load `https://mas.owasp.org/checklists/` | FAILS | The checklists page was removed on 2026-07-14 and now redirects to a removal notice; the brief cites it six times as "the bridge from control to test". Control-to-test mapping must come from `https://mas.owasp.org/MASTG/tests/` and the MASWE weakness index instead. MINOR, and it is a defect in the brief rather than in Coiny |
| 1.1.4 | Mobile Top 10 (2024) is cross-referenced so an external assessor recognises the findings | Map each FAILS row to an M-number | VERIFIED | M9 Insecure Data Storage (1.0.11, 1.2.4), M10 Insufficient Cryptography (1.3.2, 1.3.3), M3 Insecure Authentication/Authorization (1.0.10, 1.4.5, 1.7.6), M2 Inadequate Supply Chain Security (1.9.5, 1.9.7), M8 Security Misconfiguration (1.0.15, 1.9.4), M6 Inadequate Privacy Controls (1.8.3) |
| 1.1.5 | Findings are nameable in language an assessor recognises | Map the storage findings to MASWE ids | VERIFIED | 1.2.4 is MASWE-0001 (sensitive data stored unencrypted in private storage); 1.8.3 is MASWE-0005 (insertion of sensitive data into logs); 1.2.6 is MASWE-0006 (sensitive data not excluded from backup) |

Sources: [MASVS](https://mas.owasp.org/MASVS/),
[MASTG tests](https://mas.owasp.org/MASTG/tests/),
[MASTG techniques](https://mas.owasp.org/MASTG/techniques/),
[MASTG best practices](https://mas.owasp.org/MASTG/best-practices/),
[MASWE](https://mas.owasp.org/MASWE/),
[Mobile Top 10 2024](https://owasp.org/www-project-mobile-top-10/),
[mastg repository](https://github.com/OWASP/mastg). The eight group pages
(`MASVS/05-` through `MASVS/12-`) load; the checklists index does not, per 1.1.3.

---

## 1.2 Key and token storage on device

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 1.2.1 | The session token is in the Keychain, not UserDefaults, under a device-only class | Read the Keychain wrapper and every call site that persists the token | VERIFIED | `ios/Coiny/Services/Keychain.swift:19` defaults to `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly`; `grep -rn "UserDefaults" ios/Coiny` returns four writes, all onboarding flags and declared-asset magnitudes, no token. MASTG-TEST-0052 |
| 1.2.2 | The single token write path cannot silently fall back to a weaker store | Confirm there is exactly one save call site and that its failure propagates | VERIFIED | `API.swift:132` is the only `sessionStore.save` in the app; it is `try`, not `try?`, and the throw reaches `SignInView.swift:105-106` which renders the message |
| 1.2.3 | The passcode-less-device failure is surfaced rather than swallowed | Trace what a user with no device passcode sees | FAILS | The throw is surfaced but as `"Keychain save failed: -34018"` (`Keychain.swift:75`) with no explanation and no remedy, so the only user-visible instruction for the one configuration that cannot work is an OSStatus number. MINOR, and it will be the first TestFlight support ticket |
| 1.2.4 | Nothing sensitive is cached to disk under a weaker protection class than the token | Read every file the app writes and check its Data Protection class | FAILS | `NetWorthCache.swift:23-24,34` writes the full per-class net-worth snapshot to Application Support with `.atomic` and no `.completeFileProtection`, so it inherits the platform default (complete until first user authentication) while the token that fetched it is at the strictest class. MAJOR. MASWE-0001, MASTG-TEST-0052 |
| 1.2.5 | Declared-asset magnitudes in UserDefaults are defensible there | Read what the values are and what a dump of them reveals | VERIFIED | `DeclaredAssets.swift:170-192` stores bucketed self-reported magnitudes with the stated rationale at `:171-175`; these are the user's own rough numbers, not account data, and the required-reason declaration exists at `PrivacyInfo.xcprivacy:155-160` (CA92.1) |
| 1.2.6 | Nothing sensitive survives an iCloud backup or a restore onto another device | Read the backup exclusion on every file and the Keychain class | VERIFIED | `NetWorthCache.swift:55-60` sets `isExcludedFromBackup`; the Keychain class is a `ThisDeviceOnly` variant, so the token is excluded from backup and from device migration by construction. MASWE-0006, MASTG-TEST-0058 |
| 1.2.7 | The chosen Keychain class's cost is accepted knowingly | State what it buys and what it costs | VERIFIED | It is the strictest common class: a thief with a locked device gets nothing, and a device with no passcode cannot store a token at all, which is 1.2.3. It also means a user restoring onto a new phone re-authenticates, which for Sign in with Apple is one tap and therefore free |
| 1.2.8 | Android stores the session token at least as well as iOS | Read the Android persistence and compare | FAILS | `android/.../data/SessionStore.kt:10` persists the bearer in a plain DataStore preference with a written rationale at `:14-20`; `backup_rules.xml:4-5` asserts "auth tokens (when added) will be in EncryptedSharedPreferences", which is the opposite of what the adjacent code does. MINOR today (Android does not ship), MAJOR at Android public launch |
| 1.2.9 | Android backup cannot exfiltrate the unencrypted token | Read the manifest and the extraction rules | VERIFIED | `AndroidManifest.xml:16` sets `allowBackup="false"` and `data_extraction_rules.xml` excludes root, file, database, sharedpref and external from both cloud backup and device transfer, so 1.2.8's plaintext token never leaves the device by that path |
| 1.2.10 | Stolen Device Protection is recommended where it helps and not relied on | Decide whether to surface it | NOT APPLICABLE as a control, recommended as copy | It is a user-side iOS setting Coiny cannot enforce or detect; the honest action is one line in the eventual security page, not a runtime check |

Sources: [kSecAttrAccessible](https://developer.apple.com/documentation/security/ksecattraccessible),
[Restricting Keychain item accessibility](https://developer.apple.com/documentation/security/restricting-keychain-item-accessibility),
[Data Protection classes](https://support.apple.com/guide/security/data-protection-classes-secb010e978a/web),
[the Secure Enclave](https://support.apple.com/guide/security/the-secure-enclave-sec59b0b31ff/web),
[Apple Platform Security guide](https://help.apple.com/pdf/security/en_US/apple-platform-security-guide.pdf),
[Android Keystore](https://developer.android.com/privacy-and-security/keystore),
[hardware-backed Keystore and StrongBox](https://source.android.com/docs/security/features/keystore),
[Stolen Device Protection](https://support.apple.com/en-us/120340).
StrongBox is explicitly not recommended for 1.2.8: an Android Keystore-wrapped
preference is the proportionate fix and StrongBox adds constraints for a
revocable opaque session id.

---

## 1.3 Encryption at rest, key management, and the field-level question

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 1.3.1 | The field-encryption line is drawn where it changes an attacker's outcome, not where it is convenient | Enumerate what a dump without the key still reveals | FAILS as currently drawn | `schema.ts:147-149` leaves `amount`, `date` and `category` plaintext and `schema.ts:223` leaves `last_credit_score` a plaintext integer, so a dump yields a dated spending series and a credit score per pseudonymous user. MAJOR. Argument below |
| 1.3.2 | The blind index's leakage is bounded and stated | Read `blindIndex` and the column it keys | VERIFIED, leakage accepted | `util/crypto.ts:78-87` is a deterministic HMAC-SHA256 over the normalized merchant, keying `category_overrides.merchant_name`; it reveals which override rows share a merchant and nothing more, which is strictly less than the plaintext `transactions.category` already discloses |
| 1.3.3 | The blind index key is separated from the encryption key | Compare against a production searchable-encryption design | FAILS | `util/crypto.ts:85` derives the HMAC key from `config.DATA_ENCRYPTION_KEY` directly, the same bytes `createCipheriv` uses at `:28`; CipherSweet gives every blind index a distinct HKDF-HMAC-SHA256-derived key precisely so compromise of one does not yield the other. MINOR: one `hkdf` call at the next touch of `crypto.ts` |
| 1.3.4 | Ciphertext cannot silently degrade to plaintext | Read `decryptString` and ask what it does with a value that fails the envelope shape | FAILS | `backend/src/util/crypto.ts:46` returns any non-envelope value unchanged, so a row written during a key-unset window stays readable forever and is indistinguishable from an encrypted one. MAJOR |
| 1.3.5 | Encryption cannot be silently skipped at write time | Read `encryptString`'s key-unset branch | FAILS | `util/crypto.ts:22-27` returns plaintext whenever `DATA_ENCRYPTION_KEY` is empty and `NODE_ENV !== 'production'`; `fly.toml:28` ships `NODE_ENV=production` on staging so staging is covered, but the no-op is implicit rather than an opt-in flag. R-21.1 already owns this. MINOR |
| 1.3.6 | Rotation after a suspected key exposure has a path | Look for a key version in the envelope and for rotation tooling | FAILS | `util/crypto.ts:9` fixes the envelope at `hex(iv):hex(tag):hex(ct)` with no version byte, and no re-encryption script exists (`backend/src/db/backfill-encrypt-pii.ts` migrates plaintext to ciphertext, not key to key), so rotation means an untested ad-hoc pass over every encrypted column. MINOR now, BLOCKER the day a key is suspected |
| 1.3.7 | The GCM implementation itself is correct | Check IV length, IV uniqueness, tag length and tag enforcement | VERIFIED | `util/crypto.ts:29` draws a fresh 12-byte `randomBytes` IV per write, `:32` captures the 16-byte tag, `:50-51` passes `authTagLength: 16` and calls `setAuthTag` before `final`, so a tampered ciphertext throws rather than returning garbage |
| 1.3.8 | A malformed key cannot reach production undetected | Read the config schema's constraint on the key | FAILS | `config.ts:33` is `z.string().default('')` and `:150-155` checks presence only, so a key of the wrong length passes boot and fails at the first `createCipheriv` call, which is the first write of a real user's token. MINOR: add `.regex(/^[0-9a-f]{64}$/)` |
| 1.3.9 | The document does not credit application encryption with protection the platform already provides | Read what Neon encrypts by default | VERIFIED | Neon encrypts NVMe volumes with AES-256 in a hardware module under AWS KMS or Azure Key Vault and enforces TLS 1.2/1.3 on connections ([Neon security overview](https://neon.com/docs/security/security-overview)), so field encryption buys exactly one thing: protection against an attacker who reaches the database through the application or a leaked connection string, which is the only realistic dump path |
| 1.3.10 | The key's crypto period is a decision, not an accident | State how long one key may live and what ends it | UNVERIFIED | NIST SP 800-57 Pt 1 Rev 5 frames this as originator-usage versus recipient-usage period; Coiny has one key, no stated period and no rotation path (1.3.6), so the honest answer is that the period is "forever" by default. Settles when 1.3.6 lands, and the trigger stays as written in `docs/obligations.md` §7: first suspected exposure or first employee |
| 1.3.11 | Existing rows are actually encrypted, not just newly written ones | Check whether the one-shot backfill has run anywhere with real data | NOT APPLICABLE today | `backend/src/db/backfill-encrypt-pii.ts` exists and `docs/build-status.md` records it as owed against production after deploy; production does not exist and staging holds synthetic data only, so there is nothing to backfill. It becomes a Gate 2 item the moment production is created |
| 1.3.12 | The primitives are the boring right ones | Compare against practitioner defaults | VERIFIED | AES-256-GCM and HMAC-SHA256 are exactly what [Cryptographic Right Answers](https://www.latacora.com/blog/2018/04/03/cryptographic-right-answers/) prescribes; nothing exotic is used and nothing exotic should be added |

**The verdict on the line, argued once.** Encrypting merchant names while leaving
amounts, dates and categories plaintext is a real boundary, not a comfortable
one, but it is narrower than the schema comment at `schema.ts:126-141` claims.
The comment's case is that "an amount without a merchant is a magnitude, not a
profile". That is true of a single row and false of a table: 200 dated amounts
plus a coarse category per row reconstructs rent, payday, commute and
subscription cadence without a single merchant string, and the credit score at
`schema.ts:223` is by itself a sensitive consumer attribute. The FTC's
definition is what makes this concrete: 16 CFR 314.2 counts information as
unencrypted for notification purposes when it is not encrypted, so an exfiltrated
dump today is a reportable notification event on the strength of the plaintext
columns alone, which is precisely the outcome `docs/obligations.md` §1 says field
encryption exists to avoid. The recommendation is not to encrypt `amount`: the
schema comment is right that `getWeeklySpendByCategory` needs SQL aggregation on
it and moving that into Node on every sync is a real cost. The recommendation is
narrower and cheaper: encrypt `last_credit_score` (R-13.4 already calls this
MINOR and it is one column with no query on it), and stop describing the current
line as making a dump a non-event, because it does not.

**On what neither layer defends against.** Neon's disk encryption defends
against media theft and disposal. Field encryption defends against an online
attacker who reaches the database through the application or a leaked
connection string. Neither defends against an attacker who reaches the running
backend, because the backend holds the key by construction. That is the honest
ceiling and it is why 1.0.7 (MFA on the accounts that can reach the key) is the
highest-value unverified row in this document.

Sources: [Encryption at rest, whose threat model is it anyway](https://scottarc.blog/2024/06/02/encryption-at-rest-whose-threat-model-is-it-anyway/),
[Azure: encryption at rest](https://learn.microsoft.com/en-us/azure/security/fundamentals/encryption-atrest),
[Naveed, Kamara and Wright, Inference Attacks on Property-Preserving Encrypted Databases](https://cs.brown.edu/people/seny/pubs/edb.pdf),
[CipherSweet security model](https://ciphersweet.paragonie.com/security),
[CipherSweet design rationale](https://paragonie.com/blog/2019/01/ciphersweet-searchable-encryption-doesn-t-have-be-bitter),
[OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html),
[NIST SP 800-57 Pt 1 Rev 5](https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final),
[Google Cloud KMS envelope encryption](https://cloud.google.com/kms/docs/envelope-encryption),
[Neon security overview](https://neon.com/docs/security/security-overview).
Envelope encryption with a per-write DEK is the shape that removes 1.3.6
entirely, and it is explicitly **not** recommended now: it adds a KMS
dependency, a monthly bill and an availability coupling for a system with one
key and one operator. Trigger to revisit: the first employee, or the first
suspected exposure, whichever comes first.

---

## 1.4 Authentication, sessions, and what happens when a device is stolen

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 1.4.1 | Session tokens are unguessable and never stored recoverably | Read the mint and the column | VERIFIED | `store/sessions.ts:15` mints 32 bytes from `randomBytes`; `:25` stores only `sha256(raw)`, so a database dump yields no usable bearer |
| 1.4.2 | Sessions expire on two clocks, idle and absolute | Read the TTL constants and the validation path | VERIFIED | `store/sessions.ts:7-8` sets a 30-day sliding TTL and a 90-day absolute cap; `:47-50` deletes the row when the absolute cap is passed rather than merely refusing it |
| 1.4.3 | Session tokens rotate on use | Check whether a new token is issued during a session's life | FAILS by design, correctly | `store/sessions.ts:53-56` slides `expiresAt` and does not re-mint. RFC 9700's rotation guidance targets OAuth refresh tokens held by public clients; Coiny's opaque session is server-revocable by row, so rotation buys detection of theft that revocation already remediates. Accepted, no change |
| 1.4.4 | A session can be revoked | Read the logout path end to end | VERIFIED | `api/auth.ts:93-97` deletes by token hash; `API.swift:147-159` clears the Keychain first and then fires the logout request, so a network failure cannot leave the client signed in |
| 1.4.5 | A user who loses their phone can end every session from anywhere else | Look for a revoke-all endpoint and a session cap | FAILS | No such route exists in `backend/src/api/auth.ts`, sessions per user are unbounded, and the only device the user still holds cannot enumerate the others. R-15.3 tracks it as MINOR; this document rates it **MAJOR** and Gate 1, because it is the single control that turns 1.0.10 from permanent to temporary and the 2am story below has no other ending |
| 1.4.6 | The Apple identity token is verified against issuer, audience and `sub` | Read the verification call and the cross-check | VERIFIED | `api/auth.ts:37-40` pins `issuer: 'https://appleid.apple.com'` and `audience: config.APPLE_BUNDLE_ID`; `:47-50` rejects when the JWT `sub` and the client-supplied `user_id` disagree, which closes the substitution the client could otherwise attempt |
| 1.4.7 | JWKS material is fetched fresh enough and cached safely | Read the JWKS construction | VERIFIED | `api/auth.ts:9-11` builds one `createRemoteJWKSet` per provider at module load, which caches with jose's own TTL and refetches on an unknown `kid`, so an Apple key rotation self-heals without a deploy |
| 1.4.8 | Algorithm confusion is impossible on the identity tokens | Check whether an algorithm allowlist is stated | VERIFIED by library invariant, not by declaration | `api/auth.ts:37,71` pass no `algorithms` option, so the defence is jose refusing an HMAC algorithm against an asymmetric JWKS key; the Plaid verifier by contrast states `algorithms: ['ES256']` (`plaid/signature.ts:74`). RFC 8725 §3.1 wants the allowlist stated. MINOR: two words, and it makes the invariant survive a library upgrade |
| 1.4.9 | Sign in with Apple is replay-resistant beyond TLS | Check whether a nonce is requested and verified | FAILS | `SignInView.swift:46-48` sets `requestedScopes` only, never `request.nonce`, and `api/auth.ts:37-41` never checks a `nonce` claim, so an identity token captured within its lifetime is replayable at `/api/auth/apple`. MINOR: the audience pin already confines it to this bundle and TLS covers the capture, but the nonce is two lines on each side |
| 1.4.10 | The logout route's stated scope matches its actual scope | Read the comment against the registration site | FAILS | `api/auth.ts:92` says "Protected by auth plugin when registered inside the protected scope", but `server.ts:128-136` registers `registerAuthApi` in the **public** scope, so logout is unauthenticated. The consequence is nil (deleting a session still requires the token, and the response is a constant `{ ok: true }` so it is not an oracle), but this is the same defect class as the deploy-workflow comment that asserted the opposite of its behaviour. MINOR |
| 1.4.11 | Sender-constrained tokens are refused knowingly rather than by omission | State the decision | NOT APPLICABLE, deliberate | RFC 9449 DPoP binds a token to a client-held key so a stolen bearer is useless. It requires a proof JWT per request, key management on two clients, and clock tolerance. For a single-purpose first-party client whose token is already in the strictest Keychain class, the cost lands on the founder every time a proof fails and the benefit overlaps 1.4.5. Do 1.4.5 instead. Trigger to revisit: any web client, or a second party consuming this API |
| 1.4.12 | Device binding via App Attest is decided, not deferred | Take a position on both halves | NOT APPLICABLE, deliberate, with a trigger | App Attest would prove a request came from a genuine build on a genuine device, which raises the cost of scripted abuse of the ~36-call fan-out. It also adds a server-issued challenge, an attestation store, a per-install assertion counter and a failure mode that bricks sign-in for real users on a bad iOS release, all maintained by one person with no on-call. Coiny's abuse surface is authenticated and rate-limited per session (`server.ts:93-106`), so attestation guards a door that already has a lock. Trigger: measured abuse of a per-user quota that costs real money, which is a Part 4 measurement, not a Part 1 judgment |
| 1.4.13 | Account deletion revokes the identity provider's grant | Grep for Apple's revoke endpoint | FAILS | `grep -rn "auth/revoke" backend/src ios/Coiny` returns only the JWKS URL at `api/auth.ts:9`; nothing calls `https://appleid.apple.com/auth/revoke`. Already found in `docs/launch-gap-analysis.md` §1 item 3 and not re-derived here; recorded because TN3194 is the page that says what "done" looks like when no usable token is held. BLOCKER at submission |
| 1.4.14 | The auth surface is guarded against regression | Check test coverage of the files that hold these controls | FAILS | R-23.4 and Appendix C both record `api/auth.ts` as untested, so every VERIFIED row from 1.4.1 to 1.4.8 rests on today's source and nothing stops tomorrow's edit. MAJOR before TestFlight, and it is the cheapest way to make this section stay true |
| 1.4.15 | Plaid OAuth, when it lands, follows the native-app profile | Confirm the redirect will be an https universal link, not a custom scheme | UNVERIFIED, blocked on a domain | RFC 8252 §7.2 prefers claimed https redirects and Plaid refuses custom-scheme redirect URIs outright; Coiny has neither domain nor `applinks` entitlement (`ios/project.yml` has no associated-domains). Tracked in `docs/launch-gap-analysis.md` §1 item 1; settles when the name and domain are chosen |

**The 2am story, which is the point of this subsection.** A user's phone is
taken while unlocked. Today they can: change their Apple ID password, which does
not touch a Coiny session; delete their account from another device, which they
cannot do because sign-in requires the device they no longer have; or contact
support, which is an email address that is itself unverified (PRD §29). There is
no path that ends the thief's session. That is what makes 1.4.5 a Gate 1 blocker
rather than the MINOR the PRD calls it, and the fix is one endpoint that deletes
`sessions` by `userId` plus a Settings row that calls it. Half a day.

Sources: [RFC 9700 OAuth 2.0 Security BCP](https://www.rfc-editor.org/rfc/rfc9700.html),
[RFC 8252 OAuth for Native Apps](https://www.rfc-editor.org/rfc/rfc8252.html),
[RFC 9449 DPoP](https://www.rfc-editor.org/rfc/rfc9449.html),
[RFC 7009 Token Revocation](https://www.rfc-editor.org/rfc/rfc7009.html),
[RFC 8725 JWT BCP](https://www.rfc-editor.org/rfc/rfc8725.html),
[NIST SP 800-63B-4](https://pages.nist.gov/800-63-4/sp800-63b.html) and its
[publication record](https://csrc.nist.gov/pubs/sp/800/63/b/4/final),
[OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html),
[TN3194](https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple),
[Sign in with Apple revoke endpoint](https://developer.apple.com/documentation/signinwithapplerestapi/revoke_tokens),
[App Attest, client](https://developer.apple.com/documentation/devicecheck/establishing-your-app-s-integrity),
[App Attest, server](https://developer.apple.com/documentation/devicecheck/validating-apps-that-connect-to-your-server).

---

## 1.5 API authorisation, IDOR and BOLA, rate limiting, enumeration

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 1.5.1 | Every store function that reads or mutates a user-owned row is scoped by `userId` | Sweep every `where(...)` in `store/` and `api/` for an id match without a user scope, rather than trusting rule 6 | VERIFIED | A script over `backend/src/store/*.ts` and `backend/src/api/*.ts` returned four unscoped `.id` clauses, all legitimate: `users.ts:48,57` and `sessions.ts:48` key on the authenticated principal, and `pokemon-cards.ts:109` updates rows already selected under `eq(pokemonCardHoldings.userId, userId)` at `:92`. `docs/launch-gap-analysis.md` reported this clean across 45 tables; this re-run covers the routes added since |
| 1.5.2 | The deliberate exceptions are named rather than assumed absent | List every operator-scoped credential serving a per-user read | VERIFIED | Coinbase `dev_key` mode, confined to non-production at `config.ts:181-183`; Zerion, Polymarket and the chain clients, scoped by a user-supplied public wallet address; Spinwheel, scoped by `spinwheelUserId`; the price vendors, which receive a holding description and return a price with no user identity at all |
| 1.5.3 | Object ids do not leak the existence of other users' rows | Compare the response for a non-existent id against one belonging to another user | VERIFIED | `api/goals.ts:145-146` returns 404 for both cases because `getGoal(userId, id)` filters first; `api/manual-assets.ts:101-111` returns 204 unconditionally, so neither route is an existence oracle |
| 1.5.4 | Sequential integer ids are not themselves a finding | Check what an enumerated id yields | VERIFIED with the reason stated | 20 tables use `serial('id')` (`schema.ts:72` onward), so ids are guessable, but 1.5.1 and 1.5.3 together mean a guessed id yields 404 or 204. Sequential ids leak an aggregate row count to anyone who creates one row, which is a business-metrics leak and not a data one. Accepted, no change |
| 1.5.5 | Rate limits are per user, not per network address | Read the key generator | VERIFIED | `server.ts:96-105` keys on `sha256(bearer)`, which maps 1:1 to a session row, and falls back to `req.ip` for unauthenticated traffic, so one user on a shared NAT cannot exhaust another's budget |
| 1.5.6 | The expensive routes carry their own limits, not only the global one | Grep for per-route `config.rateLimit` | FAILS, partially | Two routes have their own limits (`api/telemetry.ts:49` at 60/min, `api/spinwheel.ts:40` at 3/min for SMS), which is the right instinct applied twice. `GET /api/net-worth`, the route that fans out to roughly 36 external calls, has only the global 100 requests per second (`config.ts:45-47`), so a single client loop burns third-party quota at 100x the intended rate. MAJOR, and it is one `config` object |
| 1.5.7 | The rate limiter still works with more than one instance | Read the store the plugin uses | FAILS at production's configuration | `server.ts:93-106` registers `@fastify/rate-limit` with no `redis` or custom store, so the counter is per process. `fly.toml:47` runs staging at `min_machines_running = 0` (one machine, fine) but `fly.production.toml:44` sets `min_machines_running = 1` with `auto_start_machines`, so the moment production scales past one machine every limit silently multiplies. MINOR now, MAJOR at the second machine, and the honest fix at this size is to record the constraint rather than add Redis |
| 1.5.8 | No `GET` mutates state | Read the route that used to | VERIFIED | `grep -n "\.update(\|\.insert(\|\.delete(" backend/src/api/net-worth.ts` returns nothing; `api/net-worth.ts:22` is a pure read and the milestone write moved to the scheduler, closing R-14.3 and the `docs/obligations.md` §5 row that flagged it |
| 1.5.9 | The fan-out cannot be turned into a denial of service against Coiny's own vendors | Reason about the documented amplification | UNVERIFIED | The fan-out count (~36) comes from `docs/obligations.md` §5 and the PRD, not from a measurement; whether it still holds after R-16.1 moved the read path to DB-only is a Part 4 measurement. Settles by instrumenting outbound calls per request |
| 1.5.10 | Authorisation is enforced at a chokepoint, not per handler | Read where the check lives | VERIFIED | `server.ts:141-142` registers `registerAuthPlugin` once at the head of the protected scope and every one of the 39 API modules inside it, so a new route is protected by default and would have to be moved out of the scope to become public |
| 1.5.11 | Response timing does not distinguish an existing object from a missing one | Trace the work done on each branch | VERIFIED for object routes, FAILS for one auth branch | `api/goals.ts:145-146` returns 404 before the extra `getGoalPaces` query runs, so a hit is measurably *slower* than a miss but only reveals ownership of an id the caller already guessed, which 1.5.3 has already denied. The real timing asymmetry is at `api/auth.ts:37-50`: a token failing JWKS verification returns after a signature check, while a token passing it but failing the `sub` cross-check returns after an extra comparison. Both return the identical body, and the gap is microseconds against a network round trip. MINOR, no action |

Sources: [API Security Top 10 2023](https://owasp.org/API-Security/editions/2023/en/0x11-t10/),
[API1:2023 BOLA](https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/),
[IDOR Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html),
[Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html),
[ASVS 5.0](https://github.com/OWASP/ASVS),
[REST Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html),
[Denial of Service Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html),
[fastify-rate-limit](https://github.com/fastify/fastify-rate-limit).
ASVS Level 2 is the bar used here; Level 3 is not attempted and should not be.

---

## 1.6 Transport security

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 1.6.1 | Everything the backend serves is HTTPS-only | Read the platform config | VERIFIED | `fly.toml:44` and `fly.production.toml:40` both set `force_https = true`, and Fly terminates with a managed certificate, so protocol and cipher selection are the platform's and not Coiny's to misconfigure |
| 1.6.2 | HSTS is served so a first plaintext request cannot be intercepted | Grep for the header | FAILS, with the exposure argued down | No `Strict-Transport-Security` header is set anywhere (`grep -rn "helmet\|Strict-Transport" backend/src` returns only the rate-limit import at `server.ts:3`); `force_https` redirects rather than instructs. The practical exposure is near nil because both clients are hardcoded to https (`API.swift:49`, `Api.kt:95`) and ATS forbids the downgrade, so this bites only a browser or curl user. MINOR. See 1.10.1 for the dependency question |
| 1.6.3 | The iOS app declares no App Transport Security exceptions | Read the Info.plist and the generator that writes it | VERIFIED | `grep -rn "NSAppTransportSecurity\|NSAllowsArbitraryLoads\|NSExceptionDomains" ios/` returns nothing outside `.spm-cache`; `ios/Coiny/Info.plist` has no ATS key at all, so full default enforcement applies. MASTG-TEST-0322, MASTG-TEST-0342 |
| 1.6.4 | No hardcoded cleartext URL ships in a device build | Read the base-URL resolution | VERIFIED | `API.swift:38-53` returns `http://127.0.0.1:3000` only under `#if targetEnvironment(simulator)`; the device branch accepts a configured value only when `url.scheme == "https"` (`:49`) and otherwise falls back to the https staging host. MASTG-TEST-0321 |
| 1.6.5 | The environment override cannot downgrade a shipped build | Read the override branch | VERIFIED | `API.swift:33-36` accepts `http` from the process environment, which on iOS is settable only from an Xcode scheme, never by a user or an attacker on a distributed build |
| 1.6.6 | The app installs no custom trust evaluation | Grep for URLSession delegate trust handling | VERIFIED | `grep -rn "URLSessionDelegate\|didReceive challenge\|serverTrust" ios/` returns nothing; `HTTPClient.swift:8` binds the protocol straight to `URLSession`, so system trust evaluation is used unmodified. MASTG-TEST-0067, MASTG-TEST-0068 |
| 1.6.7 | Android permits no cleartext | Read the manifest and the target SDK | VERIFIED by platform default | `AndroidManifest.xml` declares neither `android:networkSecurityConfig` nor `usesCleartextTraffic`, and `build.gradle.kts:30` targets SDK 35, so cleartext has been off by default since API 28 and `Api.kt:95` is an https constant. An explicit `network_security_config.xml` would make the guarantee legible rather than inherited; do it with the rest of the Android launch work, not before |

Sources: [Transport Layer Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html),
[Preventing insecure network connections](https://developer.apple.com/documentation/security/preventing-insecure-network-connections),
[Android network security config](https://developer.android.com/privacy-and-security/security-config),
[MASTG tests](https://mas.owasp.org/MASTG/tests/).

---

## 1.7 Webhook authenticity and replay resistance

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 1.7.1 | The Plaid webhook is verified before any part of the body is trusted | Read the handler's first statements | VERIFIED | `webhook/plaid.ts:126-133` registers a buffer content-type parser so the raw bytes survive, then calls `verifyPlaidSignature` and returns 401 before parsing; nothing is read from the payload first |
| 1.7.2 | The Plaid verification matches Plaid's published contract clause by clause | Read `signature.ts` against Plaid's webhook verification page | VERIFIED on five of six clauses | ES256 pinned and any other `alg` rejected (`signature.ts:63,74`); `kid` looked up and cached per key, never evicted because Plaid keys are immutable per `kid` (`:14-16,37-51`); key type constrained to EC P-256 (`:43`); `iat` age bounded both directions at 300s (`:12,81-84`); `request_body_sha256` compared against the raw body (`:86-87`) |
| 1.7.3 | The body-hash comparison is constant-time | Read the comparison operator against Plaid's guidance | FAILS | `plaid/signature.ts:87` uses `payload.request_body_sha256 !== bodyHash`, a variable-time string comparison; Plaid's own page says to "use a constant time string/hash comparison method in your preferred language to prevent timing attacks". Exploitation requires forging an ES256 signature first, so the practical risk is nil. MINOR: `crypto.timingSafeEqual` on two 32-byte buffers |
| 1.7.4 | Plaid webhook replay cannot re-apply a side effect | Read what is idempotent and what is not | FAILS | Transactions are claimed atomically by transaction id (`webhook/plaid.ts:420` into `store/events.ts:10-18`), but the LIABILITIES and ITEM handlers have no claim, so a redelivery inside the 300-second window re-applies the health penalty and re-sends the push. Plaid legitimately redelivers. R-21.3 tracks it as MINOR; the observable cost is a user pushed twice for one event, which is a trust cost in a product whose whole promise is that it only reacts to real behaviour. MINOR, fix with a body-hash claim key |
| 1.7.5 | The App Store notification's signature chain is fully validated, not just parsed | Read every chain step | VERIFIED, and unusually completely | `appstore/jws.ts:79-110` requires `alg` ES256, exactly three certificates, a root that byte-equals a pinned Apple root, `intermediate.verify(root)` and `leaf.verify(intermediate)`, both Apple marker OIDs, all three validity windows, and finally the ES256 signature in ieee-p1363 encoding. This is the step hand-rolled implementations skip and it is not skipped here |
| 1.7.6 | An App Store notification cannot grant an entitlement it did not pay for | Check whether the `environment` claim is enforced | FAILS | `appstore/types.ts:39` parses `environment` as one of Sandbox, Production, Xcode or LocalTesting and `store/entitlements.ts:142` stores it, but nothing anywhere compares it against the running environment (`grep -rn "environment" backend/src/appstore backend/src/store/entitlements.ts backend/src/api/entitlements.ts` returns only those three sites). A Sandbox-signed transaction carries the same Apple chain and the same `bundleId`, so once production exists, anyone with a sandbox tester account grants themselves Individual or Household through `POST /api/entitlements/transaction` (`api/entitlements.ts:66-99`). **MAJOR, and a revenue bug as much as a security one** |
| 1.7.7 | App Store notifications are replay-safe | Read the idempotency claim | VERIFIED | `webhook/appstore.ts:63-76` claims `notificationUUID` with `onConflictDoNothing` before applying and acknowledges a duplicate with 200; `:81-84` releases the claim and returns 500 on a processing failure so Apple retries rather than the event being lost |
| 1.7.8 | The client-reported transaction path cannot bind another user's subscription | Read the binding check | VERIFIED | `api/entitlements.ts:93-97` rejects with 409 when the `originalTransactionId` is already bound to a different user, so a leaked JWS cannot be replayed onto a second account |
| 1.7.9 | Certificate revocation is considered | Check for an OCSP or CRL step | NOT APPLICABLE, deliberate | `appstore/jws.ts` performs no revocation check. Apple's own Node library treats online checks as optional, the root is pinned so a rogue CA is irrelevant, and adding OCSP puts a network call with its own failure mode inside a webhook path that must answer fast. Trigger: Apple publishing a revoked App Store signing certificate, which would be news |
| 1.7.10 | The replay window is a decision, not whichever number the vendor printed | State why 300 seconds | VERIFIED as inherited | 300s is Plaid's own guidance (`signature.ts:12` matches the published five minutes) and Standard Webhooks recommends a tolerance in the same order. The window is not the defect; the missing claim key (1.7.4) is, and shrinking the window would trade a real class of legitimate redelivery failures for a marginal reduction in an attack that already requires signature forgery |

Sources: [Plaid webhook verification](https://plaid.com/docs/api/webhooks/webhook-verification/),
[App Store Server Notifications V2](https://developer.apple.com/documentation/appstoreservernotifications),
[signedPayload and the x5c chain](https://developer.apple.com/documentation/appstoreserverapi/signedpayload),
[Apple's app-store-server-library-node](https://github.com/apple/app-store-server-library-node),
[Standard Webhooks](https://www.standardwebhooks.com/).

---

## 1.8 Secrets: logs, crash reports, analytics, repository, and the binary

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 1.8.1 | The IPA contains no credential | Grep both clients for embedded high-entropy constants and enumerate what a `strings` dump would show | VERIFIED | Nothing matches a key-shaped assignment (see 1.0.12); the recoverable strings are the staging host, the bundle id, the `coiny` URL scheme (`Info.plist:21-31`) and the debug route paths from `API+Debug.swift`, none of which is a secret |
| 1.8.2 | Debug affordances visible in the binary are defended server-side, not by client gating | Read both gates | VERIFIED | `SignInView.swift:56-66` wraps the skip button in `#if DEBUG`, but the real defence is `server.ts:59-61,135,146`, which registers the debug routes only when `NODE_ENV !== 'production'` **and** `PLAID_ENV === 'sandbox'`. That is the fix for the D1 defect and it is in the right place |
| 1.8.3 | Rule 2 (no merchant names, amounts, emails or Apple `sub` in logs) is enforced, not merely stated | Grep every log call site rather than trusting the rule | VERIFIED by convention, FAILS as a control | `grep -rnE "log\.(info\|warn\|error\|debug)\(\{[^}]*(merchant\|amount\|email\|sub\|token\|key\|score\|balance)" backend/src` returns two hits, both App Store notification types and neither PII. But `plugins/logger.ts:1-14` configures serializers only and no `redact` path list, so the rule holds because every author has followed it and nothing would stop the next line that does not. MINOR: a pino `redact` array is one edit and turns a convention into a control. MASWE-0005 |
| 1.8.4 | A 500 does not leak internals to the caller | Read the error handler | VERIFIED | `plugins/error-handler.ts:7` returns the literal `'Internal Server Error'` for any status at or above 500 and logs only `message` and `code`, never a stack |
| 1.8.5 | iOS logging cannot leak financial data | Read every logging call in the app | VERIFIED | One `print` exists in the whole app (`CoinyApp.swift:126`, an APNs registration error) and the two `Logger` instances are telemetry-scoped (`Telemetry.swift:101`, `API+Telemetry.swift:36`); no `.public` annotation appears anywhere, so os_log's private-by-default interpolation applies. MASTG-TEST-0053, MASTG-TEST-0297 |
| 1.8.6 | Nothing sensitive reaches a crash report | Check what crash pipeline exists | **VERIFIED 2026-08-23**, and it is no longer hypothetical | A pipeline now exists (`ios/Coiny/Services/CrashDiagnostics.swift` to `POST /api/diagnostics`), so this stopped being NOT APPLICABLE. What reaches it: `MXCallStackTree.JSONRepresentation`, which its own header defines as binary image name, binary UUID, text-segment offset, address and sample count. UNSYMBOLICATED, so no function names and no file paths. The three free-form fields MetricKit exposes (`terminationReason`, `virtualMemoryRegionInfo`, `exceptionReason.composedMessage`, whose header says it "may have some pieces redacted" and is therefore not something to rely on) are dropped on the device AND rejected again by the route's strictObject, because a control in one place is one refactor from none. Asserted both sides: `testNoFreeFormFieldReachesTheWire` and the 400 in `tests/diagnostics.test.ts` |
| 1.8.7 | Analytics carries no amounts or merchant names by construction, not by discipline | Read the event property shape | VERIFIED | R-22.6 is marked Built in Appendix C on the grounds that properties are closed enums and bucketed values; `api/telemetry.ts` validates the batch with Zod and `:49` rate-limits it to 60/min, so an unbounded free-text property cannot be smuggled in |
| 1.8.8 | Git history, not just the working tree, is free of secrets | Run the project's own gitleaks config over the full history and record the exit code | FAILS | `gitleaks git --log-opts="--all" -c .gitleaks.toml --redact` scanned 485 commits and exited **1** with **6 findings**, all in `ios/CoinyTests/EntitlementsAPITests.swift:35,56,77` across commits `11c103e1` and `9d5ec835`. All six are false positives: a synthetic `appAccountToken` UUID in a JSON fixture. The finding is not a leaked secret, it is that the repository's own config does not pass its own full-history scan. MINOR |
| 1.8.9 | CI's secret scan actually covers what 1.8.8 covers | Compare the CI invocation against the full-history run | FAILS | `.github/workflows/security.yml:62-68` checks out with `fetch-depth: 0` and hands off to `gitleaks-action`, which in pull-request mode scans the PR's commits rather than all history, which is why CI is green while 1.8.8 exits 1. Either add a scheduled full-history job or allowlist `ios/CoinyTests/.*Tests\.swift` the way `backend/tests` already is. MINOR |
| 1.8.10 | The gitleaks allowlist does not create a blind spot | Read `.gitleaks.toml` | FAILS | `.gitleaks.toml:17-20` allowlists the entire `docs/.*\.md` path from scanning. Documentation is exactly where a founder pastes a connection string while writing a runbook, and this repository has 55 files in `docs/`. MINOR, and narrowing it to specific files costs nothing |
| 1.8.11 | Deployed secrets are not readable after being set | Read the platform's guarantee | VERIFIED | Fly injects secrets as environment variables at Machine boot from an encrypted vault and states "we do not allow read access to the plain-text values of secrets" ([Fly secrets](https://fly.io/docs/apps/secrets/)); `fly secrets list` shows names and digests only. The residual, which Fly states plainly, is that anyone with deploy access can print them, which is 1.0.15 |
| 1.8.12 | Local secrets never land in a file | Read the loader | VERIFIED | `bin/load-secrets.sh` reads from the macOS Keychain into the process environment; `.gitignore` excludes `.env` and `*.pem`/`*.key`, and 1.8.8's full-history scan found no credential of any kind |
| 1.8.13 | The built artefact is scanned for what the source scan misses | Check whether an IPA or APK is ever analysed | UNVERIFIED | No MobSF run, no `strings` pass over a built binary, and no Release-configuration build exists in CI at all (`docs/launch-gap-analysis.md` §2.2). Settles by running MobSF against the first archive; it is a one-hour job that only becomes possible once the org enrollment unblocks an archive |

Sources: [Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html),
[gitleaks](https://github.com/gitleaks/gitleaks),
[MobSF](https://github.com/MobSF/Mobile-Security-Framework-MobSF),
[MASTG techniques](https://mas.owasp.org/MASTG/techniques/),
[OWASP WrongSecrets](https://github.com/OWASP/wrongsecrets),
[OSLogPrivacy](https://developer.apple.com/documentation/os/oslogprivacy),
[pino redaction](https://getpino.io/#/docs/redaction),
[Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html),
[Fly secrets](https://fly.io/docs/apps/secrets/).
On the other half of the logging question: the audit trail is currently too
thin, not too rich. 1.0.3 records that no request line carries a user id, which
means the Safeguards 314.4(c)(8) monitoring obligation has no substrate. That is
the same one-line pino change as 1.8.3, in the opposite direction.

---

## 1.9 Supply chain

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 1.9.1 | CI installs exactly the lockfile, never a resolved-fresh tree | Read every install step | VERIFIED | `backend-ci.yml:31`, `security.yml:124` and `Dockerfile:35,63` all use `pnpm install --frozen-lockfile`; the one exception is `dependabot-auto-merge.yml:36`, which is `--no-frozen-lockfile` by design and gated on `github.actor == 'dependabot[bot]'` at `:16` |
| 1.9.2 | No dependency is fetched from outside the registry | Grep the lockfile for non-registry resolutions | VERIFIED | `grep -nE "resolution: \{(tarball\|directory\|repo)" pnpm-lock.yaml` and `grep -nE "git\+\|github:\|http://" pnpm-lock.yaml` both return nothing; `node_modules/.modules.yaml:565-567` shows two registries, npmjs and jsr |
| 1.9.3 | A malicious package cannot execute on `install` | Read the lifecycle-script policy | VERIFIED, and this is the strongest control in the section | `pnpm-workspace.yaml:11-13` sets `allowBuilds` to `esbuild` and `unrs-resolver` only, confirmed applied at `node_modules/.modules.yaml:757-760` with `pendingBuilds: []`. This is exactly the primitive the Shai-Hulud worm needed and did not have here |
| 1.9.4 | Every GitHub Action is pinned to a full commit SHA | Grep for any `uses:` that is not 40 hex characters | FAILS on two of eleven workflows | `grep -rn "uses:" .github/workflows/ \| grep -vE "@[0-9a-f]{40}"` returns `firmware-ci.yml:12` and `firmware-release.yml:10`, both `actions/checkout@v6`. Firmware is parked, and `firmware-release.yml` triggers on `fw/v*` tags that will never be pushed, so the exposure is theoretical. MINOR: pin them or delete them, and deleting is more honest |
| 1.9.5 | The container scan gate means what it says | Read `.trivyignore` and check each suppression against the installed tree | FAILS, and this is the worst finding in the section | `.trivyignore` suppresses four HIGH/CRITICAL CVEs on the stated grounds that "The Node/Fastify backend is being replaced by Go (docs/tech-stack.md §2)" and that Fastify is on 4.x. Both premises are false: `backend/package.json:24` and `pnpm-lock.yaml:1249` show `fastify@5.11.3`, there is no Go rewrite, and `docs/tech-stack.md` is on `CLAUDE.md`'s do-not-cite list. `picomatch` is suppressed as "fix available in 4.0.4 but locked by upstream" while `pnpm-lock.yaml:1401` resolves `picomatch@4.0.5`. **MAJOR**: every entry rests on a stale premise, so the HIGH/CRITICAL gate is looser than anyone believes and nobody knows by how much |
| 1.9.6 | Trivy actually scans the thing that ships | Read the scan target | VERIFIED | `security.yml:90-102` builds `backend/Dockerfile` and scans the resulting image, not the working tree, so the runtime dependency set is what is measured. `ignore-unfixed: true` is defensible for a solo operator who cannot act on an unfixed advisory anyway |
| 1.9.7 | The security scans cannot be skipped by a PR that changes something dangerous | Read the path gate against the required status checks | FAILS | `security.yml:32` classifies a change as code only if it falls outside `^(docs/\|\.github/workflows/\|.*\.md$)`, so a PR touching **only workflow files** is treated as docs and skips Semgrep, Trivy and SBOM. `security.yml:16-18` states the consequence itself: "Skipped jobs via `if:` count as passing for required status checks". `gh api repos/:owner/:repo/branches/main/protection` confirms those three are required contexts. A PR that swaps an action for a malicious one therefore passes every required check without a single scanner running. MAJOR |
| 1.9.8 | On a push event the gate compares the right range | Read the base computation | FAILS | `security.yml:31` falls back to `HEAD~1` when there is no pull request, so a push of five commits is judged by the last one alone. MINOR, and the same edit fixes 1.9.7 |
| 1.9.9 | Registry signatures are verified, not only known vulnerabilities | Check for a signature-verification step | FAILS | `backend-ci.yml:34` runs `pnpm audit --audit-level=high`, which checks advisories; there is no equivalent of `npm audit signatures` in the pipeline and pnpm has no direct counterpart. MINOR. The proportionate mitigation at this size is a cooling-off window on new versions rather than a signature step |
| 1.9.10 | Coiny's own build level is stated honestly rather than aspired to | Compare against the SLSA levels | FAILS at Build L1 | No provenance attestation is produced for the backend image or either client (`grep -rn "attest" .github/workflows` returns nothing), and SLSA Build L1 requires provenance to exist. Coiny is L0 by the definition while carrying several L2 practices (hosted build, SHA-pinned actions, no self-hosted runners). **Do not chase a level.** One `actions/attest-build-provenance` step would reach L1 honestly; anything beyond that is not worth it for a single-consumer image |
| 1.9.11 | The SBOM is used, not merely produced | Ask what consumes it | FAILS | `security.yml:126-133` generates a CycloneDX SBOM per build and uploads it as an artifact; nothing reads it, diffs it, or alerts on it. It is a compliance artefact, not a control. MINOR, and the honest options are to wire it to a diff on every PR or to say plainly that it exists for the Plaid questionnaire |
| 1.9.12 | The dependency surface is small enough that one person can know it | Count production dependencies | VERIFIED | `backend/package.json:23-31` lists seven production dependencies. This is the reason 1.9.5 is recoverable at all, and it is the single most valuable supply-chain property this repository has |
| 1.9.13 | Workflow token permissions are least-privilege, and no workflow runs untrusted code with a write token | Read every `permissions:` block and every trigger | VERIFIED | Nine of eleven workflows declare `contents: read`; `codeql.yml:18-21` adds `security-events: write` and `actions: read` with both reasons written inline; `auto-merge.yml:7-9` and `dependabot-auto-merge.yml:6-8` take write scopes but run on `pull_request`, where a fork's `GITHUB_TOKEN` is read-only regardless, and the lockfile job additionally gates on `github.actor == 'dependabot[bot]'` (`:16`). No `pull_request_target` anywhere. This is the row GitHub's secure-use reference is written to catch, and it passes |
| 1.9.14 | Repository hygiene is measured rather than asserted | Run OSSF Scorecard | UNVERIFIED | `docker run gcr.io/openssf/scorecard --repo=github.com/pamplemousse-glitch/Coiny` would turn this subsection into measured rows; not run here because it needs a GitHub token with repo scope. Settles in fifteen minutes whenever the founder wants a number |

**What a compromised transitive dependency actually reaches.** At build time:
nothing, because of 1.9.3, unless it is `esbuild` or `unrs-resolver`. At run
time: everything the backend process has, which is `DATA_ENCRYPTION_KEY` and
every provider credential in the environment (1.8.11). There is no sandbox
between a dependency and the process. That asymmetry is why 1.9.3 matters more
than 1.9.5 and why the seven-dependency rule in `.claude/rules/security.md` #7 is
load-bearing rather than stylistic.

Sources: [CISA advisory on the npm Shai-Hulud compromise](https://www.cisa.gov/news-events/alerts/2025/09/23/widespread-supply-chain-compromise-impacting-npm-ecosystem),
[GitHub's plan for a more secure npm supply chain](https://github.blog/security/supply-chain-security/our-plan-for-a-more-secure-npm-supply-chain/),
[npm provenance statements](https://docs.npmjs.com/generating-provenance-statements),
[SLSA levels](https://slsa.dev/spec/v1.0/levels),
[OSSF Scorecard](https://github.com/ossf/scorecard),
[GitHub Actions secure use](https://docs.github.com/en/actions/reference/security/secure-use),
[npm audit](https://docs.npmjs.com/cli/v10/commands/npm-audit),
[Trivy](https://github.com/aquasecurity/trivy),
[Syft](https://github.com/anchore/syft).

---

## 1.10 Backend and platform hardening

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 1.10.1 | Security headers are present or their absence is a decision | Grep for helmet or manual headers | FAILS as a decision not yet made | `@fastify/helmet` is not a dependency (`backend/package.json:23-31`) and no header is set manually. For a JSON-only API consumed by two native clients, CSP, frame options and referrer policy are all inert; only HSTS (1.6.2) and `X-Content-Type-Options` do anything. **Recommendation: do not add the dependency.** Set the two headers in an `onSend` hook, six lines, no new supply-chain surface, consistent with rule 7. MINOR |
| 1.10.2 | Every externally supplied body is validated at a Zod boundary | Count body-accepting routes against validation calls, and find any handler that reads `req.body` without one | VERIFIED | A script over `backend/src/api/*.ts` found **zero** handlers that touch `req.body` without a `safeParse`; 80 POST/PUT/PATCH routes, 63 `safeParse` calls, the difference being routes that take no body. Config is validated the same way (`config.ts:3-160`) |
| 1.10.3 | Webhook bodies are validated after verification, not before | Read both webhook parse orders | VERIFIED | `webhook/plaid.ts:235-241` runs `ItemWebhookSchema.safeParse` only after the signature check; `webhook/appstore.ts:47-51` applies `notificationPayloadSchema` after chain verification and 400s on a malformed payload |
| 1.10.4 | The application database role does not hold privileges the application never uses | Inspect the role's grants | UNVERIFIED | `DATABASE_URL` is a Fly secret and cannot be read (1.8.11), and Neon's default is a single owner role with DDL. The application does need DDL today because `fly.toml:23` runs migrations as a release command with the same connection string, so splitting into a migrator role and a runtime role is a real change, not a config toggle. Settles by running `\du` against the Neon branch; do it before production is created, when the role split is free |
| 1.10.5 | Row level security is considered and decided, not skipped | Grep the migrations for policies and reason about the alternative | NOT APPLICABLE, deliberate, with a trigger | `grep -rln "ROW LEVEL SECURITY\|CREATE POLICY" backend/drizzle/` returns nothing. RLS would move rule 6 from 45 careful call sites into the database, which is strictly better in principle. It requires a per-connection `SET LOCAL` user context, and Neon's pooled connections make that a correctness hazard rather than a config line. Given 1.5.1 came back clean twice under two different sweeps, the marginal value today is low. **Trigger: the first BOLA defect found in review, or the first non-founder writing a store function.** Either one flips this immediately |
| 1.10.6 | Node's own runtime hazards are addressed | Check the prototype-pollution and traversal surface | VERIFIED by construction | Every body is parsed through Zod object schemas (1.10.2), which strip rather than merge unknown keys, and no route reads a filesystem path from user input (`grep -rn "readFile\|createReadStream" backend/src/api` returns nothing) |
| 1.10.7 | The runtime image is minimal and unprivileged | Read the Dockerfile's final stage | VERIFIED | `Dockerfile:73` removes npm and npx from the runtime layer, `:75-82` copies only the resolved tree and compiled output, `:91` sets `USER node` (uid 1000), and no compiler or package manager survives. This is better than the norm for a solo project and worth protecting |
| 1.10.8 | The platform's own guarantees are known so the document neither double-counts nor assumes them | Read both vendors' security pages | VERIFIED | Neon: AES-256 at rest in a hardware module under AWS KMS or Azure Key Vault, TLS 1.2/1.3 enforced, `verify-full` supported, SOC 2 and ISO 27001 audited annually, production access limited to managers and on-call ([Neon](https://neon.com/docs/security/security-overview)). Fly: encrypted secret vault, no read-back of plaintext values ([Fly](https://fly.io/docs/apps/secrets/)). Both are load-bearing for the Safeguards 314.4(f) service-provider row in `docs/obligations.md` §1 |
| 1.10.9 | The Fly and Neon account access model is known | Enumerate who can reach each console and with what factor | UNVERIFIED | Same check as 1.0.7 and R-21.2. One person, five consoles, MFA state unknown. It is five minutes and it is the highest-value unverified row in Part 1 |

Sources: [Node.js security best practices](https://nodejs.org/en/learn/getting-started/security-best-practices),
[Node best practices](https://github.com/goldbergyoni/nodebestpractices),
[fastify-helmet](https://github.com/fastify/fastify-helmet),
[Postgres row level security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html),
[Neon security overview](https://neon.com/docs/security/security-overview),
[Fly security](https://fly.io/docs/security/).

---

## 1.11 Incident response, breach notification, and disclosure

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 1.11.1 | The small-institution exemption is stated correctly, as a waiver of four paragraphs and not of the Rule | Read 16 CFR 314.6 rather than a summary | VERIFIED | "Section 314.4(b)(1), (d)(2), (h), and (i) do not apply to financial institutions that maintain customer information concerning fewer than five thousand consumers" ([16 CFR 314.6](https://www.law.cornell.edu/cfr/text/16/314.6), fetched 2026-08-15). Waived: the written risk assessment, penetration testing plus biannual vulnerability assessment, the written incident response plan, and the annual report. Everything else in 314.4 applies at the first real bank connection |
| 1.11.2 | Which of 314.4 still binds today is named, not implied | List the non-waived paragraphs that touch engineering | VERIFIED | (a) a designated qualified individual, (c)(1) access controls, (c)(3) encryption in transit and at rest, (c)(5) MFA for anyone reaching customer information, (c)(6) disposal within two years of last use, (c)(8) monitoring of authorised-user activity, (e) training, (f) written service-provider oversight. Of these, (c)(5) is 1.0.7, (c)(8) is 1.0.3, and (c)(6) is R-22.3, all open |
| 1.11.3 | The FTC notification trigger is stated with its exact threshold, clock and encryption carve-out | Read 16 CFR 314.4(j) and the definitions in 314.2 | VERIFIED, via `docs/obligations.md` §1 which cites both | 500 or more consumers, electronic notice as soon as possible and no later than 30 days after discovery, for unauthorised acquisition of **unencrypted** customer information, and information counts as unencrypted when the key was also accessed. This is why 1.3.1 is a compliance row and not only a security one |
| 1.11.4 | State breach notification is understood as applying regardless of size | Check for a small-business exemption and the tightest clock | VERIFIED | No state exempts small businesses. California is now the binding clock: "The disclosure required by this subdivision shall be made within 30 calendar days of discovery or notification of the data breach", as amended by Stats. 2025 Ch. 319 (SB 446), effective 2026-01-01 ([Civ. Code 1798.82](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.82), fetched 2026-08-15) |
| 1.11.5 | MFA is enabled on every account that can reach customer information | Log into each console and check | UNVERIFIED | Five accounts: Fly, Neon, Plaid, Apple Developer, GitHub. Not a code check and not delegable to an agent. It is a 314.4(c)(5) obligation, R-21.2 owns it, and it has been open since 2026-08-12. **This is the first thing to do after reading this document** |
| 1.11.6 | A one-person incident response plan exists in the only form one person will use | Decide what "plan" means at this size | FAILS, cheaply | The written plan is waived by 314.6(h), which is why nothing exists. But the waiver is of the document, not of the 30-day clocks in 1.11.3 and 1.11.4, and a founder discovering a breach at 2am needs three things on one page: the FTC's [Safeguards Rule notification form](https://www.ftc.gov/business-guidance/privacy-security/gramm-leach-bliley-act/safeguards-rule-form), the list of consoles whose credentials must be rotated, and the order to rotate them in. One hour, not a programme. MINOR |
| 1.11.7 | Key rotation has a rehearsed path before it is needed in anger | Check whether rotating `DATA_ENCRYPTION_KEY` is possible | FAILS | 1.3.6 established there is no versioned envelope and no re-encryption tooling, so "rotate the key" in an incident means "every stored token becomes garbage and every user re-links everything" (R-20.3 states exactly this). The incident plan in 1.11.6 must say so in writing, because the alternative is discovering it during the incident. MINOR now, BLOCKER during an incident |
| 1.11.8 | A vulnerability researcher has somewhere to send a report | Look for `security.txt` and a SECURITY.md | FAILS, blocked on one prior decision | Neither `.well-known/security.txt` nor `SECURITY.md` exists (`ls SECURITY.md .well-known` returns not found), and RFC 9116 requires a hosted URL, which requires the domain that `docs/launch-gap-analysis.md` §8 item 1 already makes the week's first decision. `SECURITY.md` in the repository costs ten minutes and works today; the hosted `security.txt` follows the domain. MINOR |
| 1.11.9 | The support address that a disclosure would arrive at actually exists | Check the address | UNVERIFIED | PRD §29 records `contact@athanorworks.com` as Unverified, domain and alias unconfirmed. Settles with the same decision as 1.11.8 |
| 1.11.10 | NIST's incident-response framing is used for what a solo founder can do, not imported wholesale | State which functions are performable | VERIFIED as a judgment | Of SP 800-61r3's CSF 2.0 profile, one person can genuinely perform Respond (contain, eradicate) and Recover (restore from the Neon branch); Detect is aspirational because nothing alerts (1.0.3 has no substrate), and Govern is 1.11.6's one page. Do not adopt the document; adopt the page |

Sources: [16 CFR 314.4](https://www.ecfr.gov/current/title-16/part-314/section-314.4),
[16 CFR 314.6](https://www.law.cornell.edu/cfr/text/16/314.6),
[16 CFR Part 314](https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-314),
[FTC Safeguards Rule guide](https://www.ftc.gov/business-guidance/resources/ftc-safeguards-rule-what-your-business-needs-know),
[FTC on the notification requirement](https://www.ftc.gov/business-guidance/blog/2024/05/safeguards-rule-notification-requirement-now-effect),
[the reporting form](https://www.ftc.gov/business-guidance/privacy-security/gramm-leach-bliley-act/safeguards-rule-form),
[FTC data breach response guide](https://www.ftc.gov/business-guidance/resources/data-breach-response-guide-business),
[NIST SP 800-61r3](https://nvlpubs.nist.gov/nistpubs/specialpublications/nist.sp.800-61r3.pdf),
[50-state survey](https://privacyrights.org/resources-tools/reports/data-breach-notification-laws-50-state-survey-2026-edition),
[15 U.S.C. 6801](https://www.law.cornell.edu/uscode/text/15/6801),
[RFC 9116 security.txt](https://www.rfc-editor.org/rfc/rfc9116.html),
[CISA on security.txt](https://www.cisa.gov/news-events/news/securitytxt-simple-file-big-value).
Note on sources: **`www.ecfr.gov` returns a 302 to an anti-automation page** and
could not be fetched on 2026-08-15. The 314.6 text in 1.11.1 was verified against
Cornell's LII mirror instead, added because it is the same regulatory text from a
source that serves automated clients; the eCFR links above are kept because they
are the citation a reader should follow in a browser.

---

## 1.12 Where the honest limits are

Every row here is a control Coiny is **not** adding, with the trigger that would
change the answer. A document that recommends all of them is a wish list.

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 1.12.1 | Certificate pinning is refused on the platform vendor's own advice, not from laziness | Read Apple's position and OWASP's counter-argument, then decide | NOT APPLICABLE, deliberate | Apple: "Pinning certificates is not required. You should deploy pinning configurations with caution, and only if absolutely necessary... In most cases, pinning is not necessary and should be avoided" ([Identity Pinning](https://developer.apple.com/news/?id=g9ejcf8y), fetched 2026-08-15). Against that, the [OWASP Pinning Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Pinning_Cheat_Sheet.html) argues pinning defeats a user-installed proxy CA. That threat is a jailbroken or MDM-managed device, which 1.12.2 already concedes. **Trigger: a written Plaid or partner requirement naming specific CAs.** Nothing else |
| 1.12.2 | The maintenance cost of pinning is stated, not hand-waved | Name what breaks and who fixes it | VERIFIED as a cost estimate | A pin outlives its certificate only if a backup pin is deployed first; Android's own guidance warns that without one a key change severs connectivity, and that pin expiry is itself a bypass. For Coiny that means a solo founder shipping an App Store update, waiting on review, and hoping every user upgrades before the pin expires. The failure mode is total and unrecoverable from the server side |
| 1.12.3 | Jailbreak and root detection is refused with a cost, not dismissed | Cost the control against the tool that defeats it | NOT APPLICABLE, deliberate | Client-side integrity checks are defeated in minutes by [Frida](https://frida.re/), which hooks the check itself; the control deters casual tampering and delays nobody determined. Everything worth protecting is behind a server-side session (1.5.10) and the client is not the authority on entitlement (1.7.8). **Trigger: a fraud pattern that a device-side signal would actually detect**, which for a read-only net-worth app does not obviously exist |
| 1.12.4 | Anti-tampering and obfuscation is refused | State what a repackaged build could do | NOT APPLICABLE, deliberate | A repackaged Coiny talks to the same API with the same auth and gets the same data the legitimate user already has; there is no client-side secret to protect (1.8.1) and no client-enforced business rule (1.0.2). Obfuscation would cost every crash report its legibility, which the app cannot afford given it has no crash pipeline yet. Trigger: shipping a client-side algorithm that is itself the product, which R-14.2 forbids by design |
| 1.12.5 | OWASP's own framing of resilience is represented accurately | Quote the standard | UNVERIFIED as a quote | The brief attributes to [MASVS-RESILIENCE](https://mas.owasp.org/MASVS/11-MASVS-RESILIENCE/) the sentence that "the absence of resilience measures is not in itself a vulnerability". The page as fetched on 2026-08-15 sets out four perspectives (business, transparency, platform lock-in, malware and testing) and frames the controls as threat-specific additions, but that exact sentence could not be located on it. The conclusion in 1.12.3 and 1.12.4 rests on the Frida argument and on Coiny's own architecture, not on that quote |
| 1.12.6 | A bug bounty programme is refused for now | Name what it costs one person | NOT APPLICABLE, premature | A bounty is a queue of reports a solo founder must triage, most of them automated scanner noise, with a payment obligation attached. The prerequisite is a disclosure channel, which is 1.11.8 and costs ten minutes. **Do 1.11.8, not this.** Trigger: unsolicited reports arriving faster than one a month, which is the signal that the queue exists whether or not it is paid |
| 1.12.7 | SOC 2 is refused | Check who is asking | NOT APPLICABLE, premature | No enterprise buyer or partner has asked; Plaid's production review at this scale is a questionnaire, not an audit report. `docs/obligations.md` §7 already states this and this audit confirms rather than revises it. Trigger: a bank, benefits channel or B2B partner asking for the report |
| 1.12.8 | A formal incident response plan is refused, but not the one page | Separate the statutory waiver from the practical need | NOT APPLICABLE as a formal plan, FAILS as a page | 314.6 waives 314.4(h)'s written plan below 5,000 consumers (1.11.1), so the formal document is genuinely premature. The one page in 1.11.6 is not, and conflating the two is how a solo founder ends up with neither. Trigger for the formal plan: the 5,000th consumer, alarmed at 4,000 |
| 1.12.9 | RASP is refused | Name the dependency it adds | NOT APPLICABLE, premature | Runtime application self-protection means a commercial agent inside the Node process with its own update cadence, its own CVEs and its own vendor DPA, added to a service with seven dependencies (1.9.12) whose small surface is its main defence. It would make the supply chain worse to defend against attacks nothing has observed. Trigger: none foreseeable at this architecture |
| 1.12.10 | A WAF is refused | Compare it against the limits already in place | NOT APPLICABLE, premature, with a real trigger | Fly ships no WAF, so this means putting Cloudflare or similar in front, which adds a hop, a TLS terminator that sees every request in plaintext, and a second console to secure (making 1.11.5 six accounts rather than five). Every route already requires a session and carries a per-session rate limit (1.5.5). **Trigger: measured abuse of an unauthenticated surface**, of which there are exactly three: `/health`, `/webhooks/plaid` and `/webhooks/appstore`, all of which reject unsigned input in a few milliseconds |

**The one thing to add, and the one thing not to.** Add **revoke-all-sessions**
(1.4.5): it is half a day, it is the only ending the 2am story has, and it is the
control every other item in 1.12 is a worse substitute for. Do not add
**certificate pinning** (1.12.1): the platform vendor says avoid it, the failure
mode is an unrecoverable outage shipped through App Review, and it defends
against an attacker who has already won on a device Coiny does not control.

---

## What this pilot did not cover

Parts 2 through 7 of the brief are unwritten by design. Nothing in Part 1 should
be read as a verdict on privacy documentation (Part 2), interface craft (Part 3),
performance budgets (Part 4), fintech compliance beyond the Safeguards Rule
(Part 5), accessibility (Part 6), or the ordered gate-by-gate runbook (Part 7).
Several rows above defer to those parts by name: 1.5.9 and 1.8.13 are Part 4
measurements, 1.4.15 is a Part 5 dependency, and 1.1.1 maps MASVS-PRIVACY to a
Part 2 that does not yet exist.
