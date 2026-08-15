# DRAFT PROMPT: pre-launch verification PRD. For review before dispatch.

Structure approved 2026-08-14. Sources researched and link-checked 2026-08-15;
every URL below returned HTTP 200 on that date. Where a source is archived,
stale or secondary, it says so on the line.

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
money, does not touch card data. Some integrations (Kraken, Alpaca, Kalshi)
store user-supplied API keys that can carry trade rights, so the blast radius
of a database plus key compromise is larger than "reads".

Staging is deployed and healthy. Production does not exist yet, deliberately:
it is created when real Plaid and Apple credentials arrive.
</what_coiny_is>

<read_first>
All of it, before writing anything. You are verifying claims, and you cannot
verify a claim you have not read.

  docs/launch-gap-analysis.md   The audit that precedes this. DO NOT DUPLICATE
                                IT. Cite it and build on it.
  docs/prd.md                   The spec, including Appendix C status index.
                                Note: this file's own header states it
                                supersedes `docs/prd-app-v2.md`, while the root
                                `CLAUDE.md` still points at the older one.
                                `docs/prd.md` wins. Flag the stale pointer.
  docs/obligations.md           Regulatory and contractual analysis. §5 is an
                                existing threat model table with file:line
                                evidence. Extend and verify it; do not rewrite
                                it from scratch.
  docs/design-direction.md      Especially §3, the anti-slop checklist, and §4,
                                the design system. Both predate the rewrite.
  docs/engineering-budgets.md   Every number that was never measured. §7 is the
                                backup, restore, RPO and RTO section.
  docs/legal/                   Policy, ToS, manifest, labels, Safeguards,
                                service providers, disposal schedule.
  docs/build-status.md          Honest current state.
  docs/handoff-2026-08-15.md    Read the last section. It lists what the
                                previous session asserted and got wrong.
  .claude/rules/security.md     The seven rules.
  CLAUDE.md and the per-package ones.

Then the code, properly: `backend/src/`, `ios/Coiny/`, `android/app/`,
`.github/workflows/`, `backend/drizzle/`, `fly.toml`, `ios/project.yml`.
</read_first>

<verification_discipline>
The previous session on this repository reported six things as true that were
not, and every one failed the same way: it ran a convenient command instead of
the project's command, or repeated a remembered fact instead of checking it.
The specific failures were reporting lint clean after running biome from the
repo root rather than the package script, reporting the suite green at reduced
parallelism while CI ran at full, and reporting Trivy passing while it had been
emitting "skipping" for several commits.

So, binding rules for every row you mark VERIFIED:

1. **Run the project's own command, at CI's settings.** `backend/CLAUDE.md` and
   `ios/CLAUDE.md` name them. Check the exit code, not the vibe of the output.
   "Skipping" is not "passing".
2. **A tool that reports nothing has not passed.** Confirm it actually ran on
   the paths in question.
3. **Check the claim, not the memory of it.** If a workflow file's comment says
   a thing happens, open the workflow and confirm the thing happens. One of the
   open bugs is precisely a comment asserting the opposite of the behaviour.
4. **Diff against `main` before calling a failure pre-existing.** Four agents
   asserted pre-existing lint errors on a tree that had none.
5. **A source that will not load is not evidence.** Mark the row UNVERIFIED
   with what would settle it.
6. **Quote before you rule.** Never write a verdict about code or a document you
   have not opened. Before judging an item, pull the specific lines it turns on
   and put them in the Evidence column. This is the reading counterpart of rule
   1: the same failure that produces a wrong command result produces a wrong
   recollection of what a file says, and the whole document is worthless if its
   rows rest on memory. If you cannot find the line, the row is UNVERIFIED, not
   FAILS.
</verification_discipline>

<the_document>
Write `docs/prelaunch-verification.md`. That is the only file you create, and
you build it up part by part as you go rather than holding the whole thing in
your head and writing it at the end. Do not modify code. Do not create planning
notes, scratch files or a summary document alongside it.

Every item in every section takes the same shape, and the shape is the point:

| # | What must be true | How it is verified | Status today | Evidence |

Status is one of: **VERIFIED** (checked, with evidence), **FAILS** (checked, it
is wrong), **UNVERIFIED** (needs a device, an account, or a human), or
**NOT APPLICABLE** (with the reason).

Evidence is a `file:line`, a command and its output, or a link. "Looks fine" is
not evidence.

**Rows are dense, not discursive.** One sentence per cell. The Evidence column
is a reference, not a paragraph: the anchor plus the few words that make it
legible. Where an item needs argument rather than a verdict, the argument goes
in prose under the table, once, not spread across three cells. A row that runs
to five lines is two rows or a paragraph.

Three worked rows, so the bar is unambiguous:

<examples>
<example status="VERIFIED">
| 1.2.1 | The session token is in the Keychain, not UserDefaults, under a device-only class | Read the Keychain wrapper and every call site that persists the token | VERIFIED | `ios/Coiny/Services/Keychain.swift:19` sets `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly`; `grep -rn "UserDefaults" ios/Coiny` returns no token write |

Note what makes this a VERIFIED rather than an assertion: a named attribute at a
named line, plus the negative check that would have falsified it.
</example>

<example status="FAILS">
| 1.3.4 | Ciphertext cannot silently degrade to plaintext | Read `decryptString` and ask what it does with a value that fails the envelope shape | FAILS | `backend/src/util/crypto.ts:46` returns any non-envelope value unchanged, so a row written during a key-unset window stays readable forever and is indistinguishable from an encrypted one. MAJOR |

Note the shape: what the code actually does, why that is the finding, and a
severity from the PRD's scale. Not "encryption could be stronger".
</example>

<example status="UNVERIFIED">
| 4.1.1 | Cold start to first frame is under budget on the oldest supported device | MetricKit `MXAppLaunchMetric` from a TestFlight build, or the Instruments App Launch template on device | UNVERIFIED | No device, no TestFlight build, and no MetricKit subscriber in the app today. Settles when R-15.7 unblocks TestFlight; `docs/engineering-budgets.md` §1 holds the target |

Note that UNVERIFIED still carries work: the exact instrument, the exact reason
it cannot run today, and the event that would change that.
</example>
</examples>

---

## Part 1: Security

This part carries more weight than the rest of the document combined. Coiny
holds real balances, real transaction histories, real credit scores and real
debt for real people, pulled through Plaid, and the stated goal is a product
that is as close to unhackable as a solo-run product can be. The output should
be able to sit in front of a security assessor without embarrassment.

The counterweight, stated here so it governs the whole part: **a control nobody
maintains is worse than no control**, because it creates the appearance of
protection. Every recommendation carries an ongoing attention cost for one
person. Where a control is not worth it at this size, say so and name the
trigger that changes the answer.

### 1.0 Threat model first, controls second

Do not start from a checklist. Start from what an attacker wants and what they
can reach, then map controls onto it. `docs/obligations.md` §5 is an existing
asset-by-asset table with file:line evidence. Restate it as a STRIDE pass over
the real trust boundaries: device to backend, backend to Plaid, backend to the
other twenty integrations, Plaid and Apple to webhook endpoint, founder laptop
to Fly and Neon, CI to production.

Name the attacker classes explicitly and rank them. At minimum: someone holding
a stolen unlocked phone, someone holding the IPA and nothing else, someone with
a read-only database dump, someone who compromises one npm dependency, someone
who phishes the founder's GitHub or Fly account, and a curious authenticated
user poking at object IDs. For each, say what they get today.

  https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html
  The short version of how to do this properly: scope, model, identify,
  mitigate, in that order. Read before writing any table.

  https://www.threatmodelingmanifesto.org/
  The four questions (what are we working on, what can go wrong, what are we
  going to do, did we do a good job) are the spine of Part 1. Two pages.

  https://shostack.org/resources/threat-modeling
  Shostack's own resource index, from the person who ran STRIDE at Microsoft.
  Use it to avoid inventing a methodology.

  https://learn.microsoft.com/en-us/azure/security/develop/threat-modeling-tool-threats
  STRIDE defined per element type (process, data store, data flow, external
  entity) with mitigation categories. The most usable reference table for
  actually filling in a STRIDE grid.

  https://owasp.org/www-project-threat-dragon/
  https://github.com/OWASP/pytm
  Two ways to produce a diagram that survives review. pytm is threat-model-as-
  code and fits a repository better than a drawing. Neither is required, but if
  you recommend keeping a threat model current, recommend one of these.

  https://github.com/OWASP/threat-model-cookbook
  Worked example threat models with real DFDs. ARCHIVED since 2021, so treat it
  as illustration of form, not current advice.

  https://openid.net/specs/fapi-security-profile-2_0-final.html
  The Financial-grade API security profile and, more usefully, its explicit
  attacker model. Coiny is not an OAuth authorization server and does not need
  to implement FAPI, but the attacker model is the right calibration for what
  "financial-grade" means and what Coiny is deliberately not doing.

  https://security.plaid.com/
  Plaid's own trust centre. Worth reading because it is what a partner-level
  security questionnaire looks like from the other side, and Plaid's production
  access review will ask Coiny a version of these questions.

### 1.1 Structure the audit against MASVS, and test rather than assert

Structure against **OWASP MASVS** control groups, because a standard beats an
invented list: MASVS-STORAGE, MASVS-CRYPTO, MASVS-AUTH, MASVS-NETWORK,
MASVS-PLATFORM, MASVS-CODE, MASVS-RESILIENCE, MASVS-PRIVACY. For each control
you claim to meet, cite the MASTG test that demonstrates it. A control asserted
without a test is exactly the failure mode this document exists to correct.

Cross-reference **OWASP Mobile Top 10 (2024)**, whose items are: M1 Improper
Credential Usage, M2 Inadequate Supply Chain Security, M3 Insecure
Authentication/Authorization, M4 Insufficient Input/Output Validation, M5
Insecure Communication, M6 Inadequate Privacy Controls, M7 Insufficient Binary
Protections, M8 Security Misconfiguration, M9 Insecure Data Storage, M10
Insufficient Cryptography.

  https://mas.owasp.org/MASVS/
  The control set itself. Start here; the eight group pages hang off it.

  https://mas.owasp.org/MASVS/05-MASVS-STORAGE/
  https://mas.owasp.org/MASVS/06-MASVS-CRYPTO/
  https://mas.owasp.org/MASVS/07-MASVS-AUTH/
  https://mas.owasp.org/MASVS/08-MASVS-NETWORK/
  https://mas.owasp.org/MASVS/09-MASVS-PLATFORM/
  https://mas.owasp.org/MASVS/10-MASVS-CODE/
  https://mas.owasp.org/MASVS/11-MASVS-RESILIENCE/
  https://mas.owasp.org/MASVS/12-MASVS-PRIVACY/
  One page per group, each listing its controls. These are the section headings
  of Part 1.

  https://mas.owasp.org/checklists/
  The per-control checklists, which are the bridge from control to test. Each
  control links to the MASTG tests that verify it. This is the page that turns
  "we do secure storage" into a list of things you can actually run.

  https://mas.owasp.org/MASTG/tests/
  The test index. Cite test IDs in the Evidence column.

  https://mas.owasp.org/MASTG/techniques/
  The techniques (how to dump the keychain, inspect the binary, intercept
  traffic). This is how an UNVERIFIED row becomes an executable instruction.

  https://mas.owasp.org/MASTG/best-practices/
  The remediation side. Cite these when writing what to do about a FAILS row.

  https://mas.owasp.org/MASWE/
  The weakness enumeration behind the tests, mapped to CWE. Useful when you
  need to name a finding in language an external assessor recognises.

  https://owasp.org/www-project-mobile-top-10/
  The 2024 list, for the cross-reference column.

  https://github.com/OWASP/mastg
  The source repository, actively maintained. Use it if a page you need is
  mid-refactor on the website.

### 1.2 Key and token storage on device

Reach a verdict on: what is in the Keychain and under which accessibility
class, what is in UserDefaults, what is in files and under which Data
Protection class, what Android stores and whether it matches iOS, and what
survives a device backup or a restore onto a different device.

iOS currently uses `kSecAttrAccessibleWhenPasscodeSetThisDeviceOnly`
(`ios/Coiny/Services/Keychain.swift`). Say what that buys, and say what it
costs: it is the strictest common class, it excludes backup and migration, and
it fails outright on a device with no passcode. Confirm the failure path is
handled rather than silently swallowed.

  https://developer.apple.com/documentation/security/ksecattraccessible
  The authoritative list of accessibility classes. The differences between them
  are the whole answer to "what does a thief get".

  https://developer.apple.com/documentation/security/restricting-keychain-item-accessibility
  Apple's guidance on choosing between them, including the ThisDeviceOnly
  variants and their interaction with backups.

  https://support.apple.com/guide/security/data-protection-classes-secb010e978a/web
  File-level Data Protection classes, which are a separate mechanism from
  Keychain accessibility and are frequently confused with it. If anything is
  cached to disk, this is the control that applies.

  https://support.apple.com/guide/security/the-secure-enclave-sec59b0b31ff/web
  What the Secure Enclave actually does and, importantly, does not do. It
  protects key material and biometrics; it does not make application data
  unreadable to the running app.

  https://help.apple.com/pdf/security/en_US/apple-platform-security-guide.pdf
  The full Apple Platform Security guide, August 2026 edition. Primary source
  for anything the two pages above leave ambiguous. Large; use the table of
  contents.

  https://developer.android.com/privacy-and-security/keystore
  The Android counterpart. Note that the Android client is behind and may have
  no equivalent protection at all; verify rather than assume parity.

  https://source.android.com/docs/security/features/keystore
  Hardware-backed Keystore and StrongBox from the platform side, including what
  hardware backing does and does not guarantee. Read before recommending
  StrongBox: it is slower, more constrained, and unnecessary for most apps.

  https://support.apple.com/en-us/120340
  Apple's Stolen Device Protection. Directly relevant to the "stolen unlocked
  phone" attacker class, and it is a user-side control Coiny can recommend but
  cannot enforce.

  https://mas.owasp.org/checklists/MASVS-STORAGE/
  The tests that verify all of the above.

### 1.3 Encryption at rest, key management, and the field-level question

Coiny encrypts Plaid access tokens, exchange API keys and merchant names with
AES-256-GCM under a single `DATA_ENCRYPTION_KEY`
(`backend/src/util/crypto.ts`), uses an HMAC-SHA256 blind index for merchant
equality lookups, and deliberately leaves transaction amounts queryable in
plaintext. Reach an actual verdict on whether that line is defensible, not a
survey of options.

Address, specifically:

- What an attacker with a database dump and no key learns. Amounts, dates,
  categories, account balances and the shape of a person's finances are all
  still there. Say whether encrypting merchant names while leaving that
  plaintext is a meaningful boundary or a comfortable one.
- The blind index. It is deterministic by construction, so it reveals which
  rows share a merchant. Say whether that leakage matters given the rest of the
  row is plaintext.
- The envelope. There is no key version byte, so rotation after a suspected
  exposure has no tooling and no path.
- The plaintext passthrough. `decryptString` returns any value that does not
  match the `iv:tag:ct` shape unchanged, which means a row written during a
  key-unset window stays readable forever and is indistinguishable from an
  encrypted one. Say whether that is a tolerable migration affordance or a
  downgrade primitive.

  https://scottarc.blog/2024/06/02/encryption-at-rest-whose-threat-model-is-it-anyway/
  The single most useful thing to read for this subsection. Argues precisely
  what disk-level and application-level encryption each defend against, and
  what neither defends against. Read it before deciding whether Coiny's line is
  defensible.

  https://learn.microsoft.com/en-us/azure/security/fundamentals/encryption-atrest
  The vendor-neutral statement of the same point in formal language: at-rest
  encryption addresses media theft, not authorised query paths. Useful for
  citing in a document an assessor reads.

  https://cs.brown.edu/people/seny/pubs/edb.pdf
  Naveed, Kamara and Wright, "Inference Attacks on Property-Preserving
  Encrypted Databases" (CCS 2015). The primary source on why deterministic and
  order-preserving encryption leak far more than intuition suggests. Directly
  applicable to the blind index decision.

  https://ciphersweet.paragonie.com/security
  The security model of a production searchable-encryption library, including
  the explicit leakage each index strategy accepts. The best available
  statement of how to reason about blind index leakage in a real application.

  https://paragonie.com/blog/2019/01/ciphersweet-searchable-encryption-doesn-t-have-be-bitter
  The design rationale in prose, including why per-index keys are separated
  from the encryption key. Coiny uses one key for both encryption and the blind
  index; this is the source that says whether that matters.

  https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html
  Algorithm choices, IV handling, key storage separation, and key rotation
  expectations. Use it to check the GCM implementation rather than eyeball it.

  https://csrc.nist.gov/pubs/sp/800/57/pt1/r5/final
  NIST SP 800-57 Part 1 Rev 5. The authority on crypto periods and on the
  originator versus recipient usage distinction that makes rotation tractable.
  Cite it for the "how long can one key live" question.

  https://cloud.google.com/kms/docs/envelope-encryption
  The clearest short explanation of envelope encryption, DEK versus KEK, and
  why a new DEK per write removes the need to rotate DEKs at all. This is the
  shape Coiny would move to if rotation ever becomes real; say whether it
  should now or what triggers it.

  https://www.latacora.com/blog/2018/04/03/cryptographic-right-answers/
  Practitioner defaults for primitive choice. Use it to confirm AES-256-GCM and
  HMAC-SHA256 are the right calls here, and to avoid recommending anything
  exotic.

  https://neon.com/docs/security/security-overview
  What the database vendor already encrypts, so the document does not credit
  application-level encryption with protection the platform provides anyway,
  or vice versa.

  https://mas.owasp.org/checklists/MASVS-CRYPTO/
  Client-side crypto tests, for anything the app encrypts locally.

### 1.4 Authentication, sessions, and what happens when a device is stolen

Verify: how sessions are issued, how they expire, whether they rotate, whether
they can be revoked, whether there is a revoke-all path, whether the identity
token from Apple is verified correctly (issuer, audience, `sub`, JWKS
freshness), and what a user can actually do at 2am when their phone is gone.

The known gap is that there is no revoke-all-sessions endpoint and sessions per
user are unbounded. Decide whether that is a Gate 1 blocker or a MINOR, and say
why.

Also decide, explicitly, whether device binding is worth it. App Attest would
let the backend verify that a request came from the genuine app on a genuine
device. It also adds a moving part that can break for real users and that one
person has to maintain. Take a position.

  https://www.rfc-editor.org/rfc/rfc9700.html
  RFC 9700, Best Current Practice for OAuth 2.0 Security (January 2025). The
  current authority on refresh token rotation, sender-constrained tokens, and
  what public clients must do. Coiny uses opaque bearer sessions rather than
  OAuth, so use this to argue what it is and is not obliged to copy.

  https://www.rfc-editor.org/rfc/rfc8252.html
  OAuth 2.0 for Native Apps. Relevant when Plaid OAuth lands, which the gap
  analysis flags as gating Chase, BofA, Wells Fargo and US Bank.

  https://www.rfc-editor.org/rfc/rfc9449.html
  DPoP, the mechanism behind "sender-constrained". Read to decide against it
  knowingly rather than by omission.

  https://www.rfc-editor.org/rfc/rfc7009.html
  Token revocation. The shape of a revoke endpoint, if one is recommended.

  https://www.rfc-editor.org/rfc/rfc8725.html
  JWT Best Current Practices. Applies to the Apple and Google identity tokens
  the backend verifies: algorithm confusion, `kid` handling, audience checks.

  https://pages.nist.gov/800-63-4/sp800-63b.html
  NIST SP 800-63B-4, Digital Identity Guidelines, authentication and lifecycle.
  Section on session management is the reference for reauthentication intervals
  and session binding. The HTML edition is easier to search than the PDF.

  https://csrc.nist.gov/pubs/sp/800/63/b/4/final
  The formal publication record for the same document, for citation.

  https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
  Generic error responses, consistent timing, and the enumeration failures that
  leak whether an account exists.

  https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple
  TN3194. The definitive statement of what Apple requires on account deletion,
  including what to do when you no longer hold a usable token. The gap analysis
  found this missing; this is the page that says what "done" looks like.

  https://developer.apple.com/documentation/signinwithapplerestapi/revoke_tokens
  The endpoint itself.

  https://developer.apple.com/documentation/devicecheck/establishing-your-app-s-integrity
  App Attest, from the client side.

  https://developer.apple.com/documentation/devicecheck/validating-apps-that-connect-to-your-server
  App Attest from the server side, including the server-issued challenge that
  makes it replay-resistant. Read both before taking a position on device
  binding; the cost is mostly in this second page.

  https://mas.owasp.org/checklists/MASVS-AUTH/
  The tests.

### 1.5 API authorisation, IDOR and BOLA, rate limiting, enumeration

Rule 6 of `.claude/rules/security.md` says every store function is scoped by
`userId`. Verify it rather than trusting it. The gap analysis reports a clean
sweep across 45 tables; confirm that sweep covers routes added since, and name
every exception including the deliberate ones (operator-scoped keys serving
per-user reads).

Also verify: per-route rate limits versus the single global limit, whether any
endpoint enumerates (sequential IDs, distinguishable error responses,
distinguishable timing), and whether a `GET` mutates state anywhere.

  https://owasp.org/API-Security/editions/2023/en/0x11-t10/
  The API Security Top 10 (2023) index. The backend risk list, as distinct from
  the mobile one.

  https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/
  API1:2023, BOLA. The number one API risk two editions running, and the exact
  failure mode rule 6 exists to prevent. Its test guidance is the method for
  verifying the sweep.

  https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html
  How to verify object-level authorisation systematically instead of
  route-by-route by hand.

  https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
  Deny by default, and enforcing authorisation at a single chokepoint rather
  than per handler. Relevant to the three-scope server design.

  https://github.com/OWASP/ASVS
  ASVS 5.0 (May 2025). The backend counterpart to MASVS. Use its Level 2
  requirements as the bar for the server; do not attempt Level 3.

  https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html
  Input validation, method handling, and why a state-changing GET is a defect
  and not a style preference.

  https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html
  Resource-exhaustion thinking. Directly applicable to the documented fan-out
  where one authenticated request triggers roughly 36 external calls.

  https://github.com/fastify/fastify-rate-limit
  The plugin in use, including per-route configuration and the in-memory versus
  shared-store distinction that matters the moment there is more than one
  instance.

### 1.6 Transport security

Verify TLS configuration, App Transport Security exceptions (there should be
none; confirm), and the Android network security config.

  https://cheatsheetseries.owasp.org/cheatsheets/Transport_Layer_Security_Cheat_Sheet.html
  Protocol versions, cipher suites, HSTS. The server-side bar.

  https://developer.apple.com/documentation/security/preventing-insecure-network-connections
  ATS: what it enforces by default and what each exception key gives away.
  Any exception in `Info.plist` is a finding until justified.

  https://developer.android.com/privacy-and-security/security-config
  The Android equivalent, including cleartext policy.

  https://mas.owasp.org/checklists/MASVS-NETWORK/
  The tests.

### 1.7 Webhook authenticity and replay resistance

Two parties call in: Plaid and Apple. Verify signature verification on both,
and verify replay resistance separately, because they are different properties.
The known gap is that a Plaid signature is accepted for a full five minutes with
no body-hash or `jti` replay cache, and Plaid legitimately redelivers, so a
replayed liabilities update re-applies a health penalty and re-sends a push.

  https://plaid.com/docs/api/webhooks/webhook-verification/
  The contract: ES256 only, `kid` lookup, JWK fetch, `request_body_sha256`
  against the raw body, and Plaid's own five-minute `iat` guidance. Check the
  implementation line by line against this page.

  https://developer.apple.com/documentation/appstoreservernotifications
  App Store Server Notifications V2 overview.

  https://developer.apple.com/documentation/appstoreserverapi/signedpayload
  The JWS payload and the `x5c` certificate chain that must be validated. Chain
  validation is the step implementations skip.

  https://github.com/apple/app-store-server-library-node
  Apple's own Node library, which does the chain verification correctly. If the
  code hand-rolls this, compare against the library and say whether the
  hand-rolled version is complete.

  https://www.standardwebhooks.com/
  A vendor-neutral specification of webhook signing, including timestamp
  tolerance and replay windows. Useful for arguing what an acceptable replay
  window is rather than accepting whichever number the vendor chose.

### 1.8 Secrets: logs, crash reports, analytics, repository, and the binary

Assume the attacker has the IPA. Anyone with a TestFlight build or App Store
download can extract every string in the binary with tools that ship with
macOS. Enumerate what is in there and reach a verdict on each.

Then follow the data outward: what reaches a log line, what reaches a crash
report, what reaches a first-party analytics property, what is in git history
(not just the working tree), and what is in the built artefact.

Rule 2 says never log merchant names, amounts, emails or Apple `sub` values.
Verify it by grepping the actual log call sites, not by trusting the rule.

  https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
  The lifecycle view: creation, storage, rotation, revocation, and detection of
  leakage. Use its rotation section against the `DATA_ENCRYPTION_KEY` gap.

  https://github.com/gitleaks/gitleaks
  Already in CI. Verify it scans full history and not just the diff, and record
  the command and its exit code.

  https://github.com/MobSF/Mobile-Security-Framework-MobSF
  The standard static analysis harness for an IPA or APK. This is the tool that
  makes "assume the attacker has the IPA" an executable verification step
  rather than a thought experiment.

  https://mas.owasp.org/MASTG/techniques/
  The manual equivalents: extracting strings, dumping the binary, inspecting
  the app bundle. Cite specific techniques as the "how it is verified" column.

  https://github.com/OWASP/wrongsecrets
  A deliberately vulnerable app whose whole subject is the places secrets hide.
  Useful as a checklist of hiding places you would not otherwise think to open.

  https://developer.apple.com/documentation/os/oslogprivacy
  iOS logging privacy levels. Interpolated values default to private, which is
  the safe default, but `.public` annotations and `print()` calls both defeat
  it. Verify which the code uses.

  https://getpino.io/#/docs/redaction
  The backend logger's redaction mechanism. If rule 2 is enforced only by
  convention rather than by a redact path, say so.

  https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
  What should be logged, which matters as much as what should not: an audit
  trail thin enough to be useless is its own finding.

  https://fly.io/docs/reference/secrets/
  How the deployed secrets actually behave, including what is visible in the
  machine environment and what is not.

### 1.9 Supply chain

Coiny is a pnpm workspace with a large dependency tree and a Swift package
graph, deployed from GitHub Actions. Verify: lockfile integrity and whether
installs are frozen in CI, whether any dependency is fetched from a git URL or
a non-registry source, whether GitHub Actions are pinned to full commit SHAs,
what workflow permissions are granted, and what a compromised transitive
dependency would actually reach at build time and at run time.

This is not theoretical. The npm ecosystem has now had self-replicating worms
that harvest tokens from the machine running `install` and republish themselves
using whatever credentials they find.

  https://www.cisa.gov/news-events/alerts/2025/09/23/widespread-supply-chain-compromise-impacting-npm-ecosystem
  The government advisory on the Shai-Hulud compromise. Primary, short, and the
  right thing to cite for "why this section exists".

  https://github.blog/security/supply-chain-security/our-plan-for-a-more-secure-npm-supply-chain/
  The registry operator's response: trusted publishing, short-lived tokens,
  granular token expiry. Says what the ecosystem now considers table stakes.

  https://docs.npmjs.com/generating-provenance-statements
  Provenance attestation, and how to check whether a dependency has one.

  https://slsa.dev/spec/v1.0/levels
  SLSA build levels. Use it to state which level Coiny's own build meets today
  and what the next level would cost. Do not recommend chasing a level; state
  the position honestly.

  https://github.com/ossf/scorecard
  Automated scoring of a repository's supply chain hygiene. The fastest way to
  turn this subsection into measured rows rather than prose.

  https://docs.github.com/en/actions/reference/security/secure-use
  GitHub's own hardening reference: SHA pinning, least-privilege `permissions`,
  the dangers of `pull_request_target`, and OIDC instead of long-lived cloud
  credentials. Check every workflow against this page.

  https://docs.npmjs.com/cli/v10/commands/npm-audit
  Including `npm audit signatures`, which verifies registry signatures rather
  than looking for known vulnerabilities. Different check, different value.

  https://github.com/aquasecurity/trivy
  Already in CI, and previously reported passing while silently skipping. Verify
  what paths it scans and record the evidence.

  https://github.com/anchore/syft
  SBOM generation. If an SBOM is produced, say what is done with it; an
  unread SBOM is a compliance artefact, not a control.

### 1.10 Backend and platform hardening

Verify security headers, input validation coverage at the Zod boundary,
database role privileges (does the application role need DDL?), whether row
level security is used or whether scoping is purely application-side, and what
the Fly and Neon account access model is.

  https://nodejs.org/en/learn/getting-started/security-best-practices
  The runtime's own list, including prototype pollution, path traversal and the
  denial-of-service patterns specific to Node.

  https://github.com/goldbergyoni/nodebestpractices
  The Node best practices repository, actively maintained. Its security section
  is the most complete community checklist for this stack. Skim the security
  section; do not adopt the whole repository.

  https://github.com/fastify/fastify-helmet
  Security headers for Fastify. Verify it is registered and at which scope.

  https://www.postgresql.org/docs/current/ddl-rowsecurity.html
  Row level security. Read it to make a real decision: RLS would make rule 6
  enforced by the database rather than by 45 careful call sites, at the cost of
  a connection-level user context that Neon's pooling makes non-trivial. Take a
  position and name the trigger.

  https://neon.com/docs/security/security-overview
  https://fly.io/docs/security/
  What the two platforms provide, so the document does not claim credit for
  vendor controls or assume protections that are not there.

### 1.11 Incident response, breach notification, and disclosure

Separate what is legally required at this size from what is merely wise. Coiny
is a non-banking financial institution under FTC jurisdiction, holds customer
information for fewer than 5,000 consumers today, and has zero users.

Get the following right, because they are commonly stated wrong:

- The Safeguards Rule exempts institutions holding information on fewer than
  5,000 consumers from *some* provisions, not from the Rule. Say which.
- The FTC notification requirement (in effect since 13 May 2024) triggers at
  500 consumers, within 30 days of discovery, for unauthorised acquisition of
  *unencrypted* customer information, and information counts as unencrypted if
  the key was also accessed.
- State breach notification laws apply to businesses of every size, with no
  small-business exemption, and California moved to a hard 30-day clock on
  1 January 2026.
- MFA on every account that can reach customer information is a Safeguards
  requirement, not a nice-to-have. Verify it on Fly, Neon, Plaid, Apple
  Developer and GitHub, and record the result.

  https://www.ecfr.gov/current/title-16/part-314/section-314.4
  The operative section: risk assessment, access controls, encryption, MFA,
  monitoring or annual penetration testing plus biannual vulnerability
  assessments, service provider oversight, incident response plan. Read the
  actual text; summaries drop the conditionals that matter.

  https://www.ecfr.gov/current/title-16/part-314/section-314.6
  The exemption section. This is the paragraph that decides which of 314.4
  applies to Coiny today, and what changes at 5,000 consumers.

  https://www.ecfr.gov/current/title-16/chapter-I/subchapter-C/part-314
  The full Part 314, including the notification provisions.

  https://www.ftc.gov/business-guidance/resources/ftc-safeguards-rule-what-your-business-needs-know
  The FTC's own plain-English guide. The right thing to hand a founder.

  https://www.ftc.gov/business-guidance/blog/2024/05/safeguards-rule-notification-requirement-now-effect
  The FTC's statement of the 500-consumer, 30-day notification trigger.

  https://www.ftc.gov/business-guidance/privacy-security/gramm-leach-bliley-act/safeguards-rule-form
  The actual reporting form. Knowing where it is beforehand is most of an
  incident response plan at this size.

  https://www.ftc.gov/business-guidance/resources/data-breach-response-guide-business
  The FTC's breach response guide, which is the realistic template for a
  one-person IRP.

  https://nvlpubs.nist.gov/nistpubs/specialpublications/nist.sp.800-61r3.pdf
  NIST SP 800-61r3 (April 2025), incident response reframed as a CSF 2.0
  profile. Do not import it wholesale; use it to name which functions a solo
  founder can genuinely perform and which are aspirational.

  https://privacyrights.org/resources-tools/reports/data-breach-notification-laws-50-state-survey-2026-edition
  The 50-state breach notification survey, 2026 edition. Secondary but
  well-maintained, and the practical way to answer "who else must be told".

  https://www.law.cornell.edu/uscode/text/15/6801
  GLBA section 501 itself, for the statutory basis rather than the rule.

  https://www.rfc-editor.org/rfc/rfc9116.html
  security.txt. A vulnerability disclosure contact is roughly an hour of work
  and is the difference between a researcher emailing you and a researcher
  tweeting.

  https://www.cisa.gov/news-events/news/securitytxt-simple-file-big-value
  CISA's argument for the same, useful when justifying the hour.

### 1.12 Where the honest limits are

This subsection is required, not optional. Name the controls that are commonly
recommended, commonly cargo-culted, and not worth it here, and for each name
the trigger that would change the answer. Candidates: certificate pinning,
jailbreak and root detection, anti-tampering and obfuscation, a bug bounty
programme, SOC 2, a formal IRP, RASP, and a WAF.

Argue both sides from sources, then decide. A document that recommends all of
them is not a security assessment, it is a wish list.

  https://developer.apple.com/news/?id=g9ejcf8y
  Apple's "Identity Pinning: How to configure server certificates for your
  app". The platform vendor states plainly that pinning is not required, should
  be deployed with caution, and in most cases should be avoided. This is the
  strongest single citation for not pinning.

  https://developer.android.com/privacy-and-security/security-config
  Android's guidance, which permits pinning but warns that without a backup pin
  a key change bricks connectivity, and that pin expiry is itself a bypass.

  https://cheatsheetseries.owasp.org/cheatsheets/Pinning_Cheat_Sheet.html
  The case for pinning, and how to do it if you do. Read it as the opposing
  brief so the conclusion is a judgment rather than an echo.

  https://mas.owasp.org/MASVS/11-MASVS-RESILIENCE/
  OWASP's own framing, and the sentence that settles most of this subsection:
  the absence of resilience measures is not in itself a vulnerability. They are
  threat-specific additions on top of the other controls, not a baseline.

  https://mas.owasp.org/MASTG/knowledge/ios/MASVS-RESILIENCE/MASTG-KNOW-0084/
  Jailbreak detection specifically, including how it is bypassed. Useful for
  costing the control honestly: it deters casual tampering and delays nobody
  determined.

  https://frida.re/
  The tool that defeats client-side integrity checks in practice. Linked so the
  document can state, with evidence, what a client-side check is worth against
  someone who wants past it.

---

## Part 2: Privacy and data protection

- What is collected, where it goes, how long it lives, and whether the privacy
  policy, the privacy manifest and the App Store nutrition labels all say the
  same thing. They were written together; verify they still agree with the code.
- Data minimisation: is anything collected that nothing uses?
- Deletion: what actually gets deleted, what survives, what upstream grants are
  revoked. The audit found Sign in with Apple token revocation missing and
  several provider grants surviving deletion; check for further siblings.
- Export and portability.
- Consent: when it is asked, what it covers, whether it is revocable.
- Third-party data flow: every processor, what each receives, and whether it is
  on the service-provider list in `docs/legal/service-providers.md`.
- Android's Data Safety form against the same facts.
- Backups: Neon's point-in-time history outlives a cascade delete. Verify the
  privacy policy says so.

  https://developer.apple.com/documentation/bundleresources/privacy-manifest-files
  What a privacy manifest must contain and how it is structured.

  https://developer.apple.com/documentation/bundleresources/describing-data-use-in-privacy-manifests
  The data-type taxonomy the manifest uses, which must line up with the
  nutrition labels. Mismatches here are a common rejection.

  https://developer.apple.com/documentation/technotes/tn3183-adding-required-reason-api-entries-to-your-privacy-manifest
  TN3183, required-reason APIs. Missing entries block upload, not just review.

  https://developer.apple.com/app-store/app-privacy-details/
  The nutrition label definitions, which is the third document that must agree
  with the other two.

  https://support.google.com/googleplay/android-developer/answer/10787469
  Google Play's Data Safety form, which asks different questions from Apple's
  labels about the same facts. Verify both against the code, not against each
  other.

  https://oag.ca.gov/privacy/ccpa
  The California Attorney General's CCPA resource.

  https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=3.&part=4.&lawCode=CIV&title=1.81.5
  The CCPA statutory text. Needed for one specific point most summaries get
  wrong: California's GLBA carve-out is a *data-level* exemption for
  information collected under GLBA, not an entity-level exemption for the
  company. Everything Coiny collects that is not GLBA nonpublic personal
  information is still in scope, and the breach private right of action applies
  regardless.

  https://cppa.ca.gov/regulations/
  The California Privacy Protection Agency's regulations, which are where the
  operational requirements (notices, opt-out mechanics) actually live.

  https://iapp.org/resources/article/us-state-privacy-legislation-tracker/
  The state-by-state tracker. Use it for thresholds and effective dates rather
  than trusting a remembered list; several states have narrowed or removed the
  entity-level GLBA exemption for non-depository institutions, which changes
  the answer for a fintech specifically.

---

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

  https://developer.apple.com/design/human-interface-guidelines/
  The platform's own standard. Cite specific HIG pages when a screen departs
  from a convention, so the finding is "this breaks the platform expectation
  here" rather than a matter of taste.

  https://m3.material.io/foundations
  The Android counterpart, needed because the Kotlin client is behind and the
  question of whether it should look like iOS or like Android is a real one.

  https://www.nngroup.com/articles/ten-usability-heuristics/
  Nielsen's ten heuristics. The standard rubric for a structured interface
  critique, and the one an outside reviewer will recognise. Use it to organise
  Part 3 so the audit is reproducible rather than impressionistic.

  https://practicaltypography.com/summary-of-key-rules.html
  Butterick's key rules, condensed. Type is where "assembled" shows first:
  measure, line spacing, weight contrast, and the straight-quote tell.

  https://every.to/p/invisible-details-of-interaction-design
  Rauno Freiberg's essay on the details that make an interface feel considered:
  spring curves, follow-through, staged reveals. The best available articulation
  of what §3 is reaching for.

  https://devouringdetails.com/
  A close reading of interaction details in shipped products. Use it as the
  standard of specificity to hold the audit to.

  https://rauno.me/craft
  Worked examples of the same, in interfaces you can look at.

  https://animations.dev/
  Emil Kowalski's course site on motion. Relevant to the motion-tell criteria:
  it is the clearest statement of when animation earns its place and when it is
  decoration.

  https://www.refactoringui.com/
  Practical hierarchy, spacing and colour decisions for people who are not
  designers. The most useful single reference for judging whether a layout has
  considered hierarchy or repeated a default gap.

  https://www.checklist.design/
  Per-component checklists (buttons, forms, empty states, modals). Use it for
  the empty, error and loading state pass, which is where this audit will find
  the most.

  https://www.ftc.gov/news-events/news/press-releases/2022/09/ftc-report-shows-rise-sophisticated-dark-patterns-designed-trick-trap-consumers
  "Bringing Dark Patterns to Light". Include a dark-patterns pass over the
  paywall and the consent flows as part of this section. Design tells and legal
  exposure overlap exactly here: a hard-to-find cancel path is both bad craft
  and an enforcement risk.

---

## Part 4: Performance, reliability and efficiency

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
- The fan-out: one `GET /api/net-worth` reportedly triggers around 36 external
  calls with no timeouts, and the client multiplies it. Measure it.

Then the reliability half, which the budgets document opens in §7 and nobody
has exercised: backup, restore, RPO, RTO, and whether a restore has ever been
rehearsed. An untested restore is not a backup.

Say plainly which budgets are unmeasurable today and what tooling would fix
that.

  https://developer.apple.com/documentation/metrickit
  MetricKit: daily launch time, hang rate, hitch ratio and memory from real
  devices, with no vendor SDK. Given the no-third-party-analytics decision,
  this is the only route to field performance data that does not contradict
  PRD §24. Say whether it should be adopted.

  https://developer.apple.com/documentation/xcode/improving-your-app-s-performance
  Apple's index of the performance disciplines and which instrument measures
  each. The right map before choosing what to measure.

  https://developer.apple.com/documentation/xcode/reducing-your-app-s-launch-time
  Launch specifically, including the definition Apple uses: first tap to first
  frame. Use their definition so the number means something to someone else.

  https://developer.apple.com/documentation/xcode/analyzing-responsiveness-issues-in-your-shipping-app
  Hangs and hitches in shipped builds, which is the metric users actually feel
  on the pet screen's continuous animation.

  https://developer.apple.com/videos/play/wwdc2021/10181/
  "Ultimate application performance survival guide". One session that connects
  launch, responsiveness, memory and the tools for each. Worth the 40 minutes
  before writing this part.

  https://developer.apple.com/documentation/xctest/performance-tests
  XCTest performance measurement, which is how any of this becomes a test that
  fails in CI rather than a number in a document.

  https://developer.android.com/topic/performance/vitals
  Android vitals, including Google Play's published bad-behaviour thresholds
  (crash and ANR rates above which distribution is affected). These are
  externally imposed numbers, which makes them better targets than invented
  ones.

  https://developer.android.com/topic/performance/vitals/launch-time
  Time to initial display, defined.

  https://developer.android.com/topic/performance/benchmarking/macrobenchmark-overview
  Macrobenchmark, the Android equivalent of an automated startup measurement.

  https://sre.google/workbook/implementing-slos/
  The SRE Workbook chapter on implementing SLOs. Read it for one specific
  purpose: `docs/engineering-budgets.md` is currently a list of targets with no
  measurement and no consequence. This chapter is the argument for picking a
  small number of user-centred indicators and ignoring the rest, which is the
  only version of this a solo founder will sustain.

  https://neon.com/docs/manage/backups
  What the database platform retains by default, what it does not, and what a
  restore actually involves. The input to a real RTO number.

---

## Part 5: Compliance, fintech-specific

Build on the audit's compliance sweep rather than repeating it. Go deeper on the
finance-specific obligations a general checklist misses:

- GLBA and the FTC Safeguards Rule: covered in Part 1.11. Cross-reference
  rather than restating.
- The GLBA Privacy Rule, which is a separate obligation from the Safeguards
  Rule and is easy to miss. A financial institution owes customers an initial
  privacy notice and, in most cases, an annual one. Verify whether Coiny's
  privacy policy discharges that or whether a distinct GLBA notice is needed.
- State privacy law: thresholds, effective dates, and the entity-level versus
  data-level GLBA exemption question from Part 2.
- Plaid's developer policy and production launch requirements, including the
  security questionnaire that gates OAuth institutions.
- Apple's finance-specific rules and Google Play's Financial Features
  Declaration.
- Subscription and auto-renewal law, which is now a live risk area and is not
  in the current docs at all. See below.
- Advertising and claims: what the app may say about savings or outcomes, and
  the accuracy disclaimer's dependency on staleness actually being surfaced.
- Record retention and disposal, and the difference between the ceiling and a
  policy.
- Open banking: the CFPB's Section 1033 rule is enjoined and under
  reconsideration as of August 2026. State the position accurately, note that
  it currently changes nothing for Coiny, and name what would.

  https://www.ftc.gov/business-guidance/resources/how-comply-privacy-consumer-financial-information-rule-gramm-leach-bliley-act
  The FTC's guide to the Privacy Rule, including who owes notices and when.

  https://www.consumerfinance.gov/rules-policy/regulations/1016/
  Regulation P, including the model privacy form that carries a safe harbour.
  If a notice is needed, using the model form is the cheapest way to be right.

  https://plaid.com/docs/launch-checklist/
  Plaid's own production launch checklist: OAuth support, the security
  questionnaire, environment and secret handling, token storage. Walk it item by
  item and record status for each.

  https://plaid.com/developer-policy/
  The contractual obligations, including encryption of account information in
  transit and at rest and the prohibition on exposing identifiers client-side.
  These are terms, not advice.

  https://plaid.com/legal/
  The index of the rest of Plaid's legal terms, including end-user privacy
  commitments that Coiny's own policy must not contradict.

  https://developer.apple.com/app-store/review/guidelines/
  The App Review Guidelines. The finance-relevant clauses and 5.1.1 on account
  deletion are the ones that bite here.

  https://developer.apple.com/support/offering-account-deletion-in-your-app/
  Apple's specific requirements for in-app account deletion, which are stricter
  than "we have a delete button".

  https://developer.apple.com/app-store/review/rejections/
  Apple's own list of the most common rejection reasons, with 2.1 App
  Completeness the largest category. Directly relevant given the app currently
  cannot be got past the sign-in screen without a demo account.

  https://developer.apple.com/distribute/app-review/
  The submission preparation guidance, including the demo account requirement
  that is currently the single hardest blocker in the repository.

  https://support.google.com/googleplay/android-developer/answer/13849271
  The Financial Features Declaration form and what must be declared.

  https://support.google.com/googleplay/android-developer/answer/9876821
  Play's Financial Services policy, including which features require licensing
  documentation. Confirm which declarations a net-worth tracker that does not
  move money actually triggers.

  https://developer.apple.com/app-store/subscriptions/
  Apple's subscription rules, including required disclosures at the point of
  purchase.

  https://www.ftc.gov/legal-library/browse/statutes/restore-online-shoppers-confidence-act
  ROSCA, which is the statute that still applies to negative-option billing.

  https://ecf.ca8.uscourts.gov/opndir/25/07/243137P.pdf
  Custom Communications, Inc. v. FTC, No. 24-3137 (8th Cir., 8 July 2025). The
  opinion vacating the FTC's "click to cancel" Negative Option Rule in its
  entirety on procedural grounds. Cite the opinion, not the commentary: the
  rule is gone, ROSCA and state law are not, and a document that says the
  click-to-cancel rule applies would be wrong.

  https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=BPC&sectionNum=17602
  California's automatic renewal law, which imposes disclosure and cancellation
  requirements that survive the federal vacatur and reach any California
  subscriber. This is the operative constraint on the paywall.

  https://www.ecfr.gov/current/title-12/chapter-X/part-1033
  The Section 1033 rule text as codified.

  https://www.consumerfinance.gov/personal-financial-data-rights/
  The CFPB's own status page for the rule, which is where its current
  procedural posture will be updated.

---

## Part 6: Accessibility

Not in the original outline, added because the research surfaced it as a real
and mispriced risk. Mobile apps are treated as covered by the ADA in practice,
suits against apps are routine, and there is no small-business exemption. It is
also the cheapest quality signal available: a fintech app that works with
VoiceOver and Dynamic Type reads as considered, and one that does not reads as
generated.

Verify at minimum: VoiceOver labels on every interactive element including the
creature, Dynamic Type support at the largest accessibility sizes without
clipping, contrast ratios against the design system's palette, touch target
sizes, motion sensitivity (Reduce Motion) given the continuous animation, and
whether any information is conveyed by colour alone. The money-colour rule in
the design system is a colour-alone risk by construction; check it.

  https://www.w3.org/TR/WCAG22/
  WCAG 2.2, the standard courts and regulators reference. AA is the practical
  bar.

  https://www.w3.org/WAI/WCAG22/quickref/
  The filterable "How to Meet" reference. More usable than the standard itself
  for turning criteria into checkable rows.

  https://www.w3.org/WAI/standards-guidelines/mobile/
  W3C's own explanation of how WCAG applies to native mobile, which is the gap
  most people trip over.

  https://developer.apple.com/design/human-interface-guidelines/accessibility
  Apple's requirements and APIs, including Dynamic Type and the 44pt touch
  target minimum.

  https://developer.android.com/guide/topics/ui/accessibility
  The Android equivalent, with a 48dp minimum.

  https://www.ada.gov/resources/web-guidance/
  The Department of Justice's guidance on web and app accessibility under the
  ADA. Primary source for the legal framing; keep the framing short and
  factual.

---

## Part 7: The ordered pre-launch runbook

Everything above, collapsed into one sequence a solo founder can actually walk.
Each item labelled **[Founder]** or **[Agent]**, grouped by gate:

  Gate 1: before the first external TestFlight tester
  Gate 2: before the first real bank connection
  Gate 3: before App Store submission
  Gate 4: before the first paying user

Ordered within each gate by lead time, so the long poles start first. If an item
blocks another, say so.

  https://mas.owasp.org/checklists/
  Reuse the MASVS checklists as the security portion of the runbook rather than
  inventing a parallel list, so a later reviewer can map runbook rows back to a
  standard.

  https://github.com/mercari/production-readiness-checklist
  A real company's production readiness checklist, split into a design phase and
  a pre-production phase. Last updated 2021, so treat the structure as the value
  and ignore anything Kubernetes-specific. The gate model above is the same
  idea; use this to check for gates that are missing.

  https://github.com/shieldfy/API-Security-Checklist
  A widely used API security checklist. Shallow by design and not a substitute
  for ASVS, but useful as a final ten-minute sweep for things a deep audit
  skipped.

  https://github.com/ashishb/android-security-awesome
  Actively maintained index of Android security tooling. Relevant only if the
  Android client ships; say plainly if it should not ship yet.

  https://github.com/Cy-clon3/awesome-ios-security
  Curated iOS application security resources and tooling. Last updated January
  2024, so verify any tool it names is still maintained before recommending it.

  https://github.com/vsouza/awesome-ios
  The general iOS ecosystem index. Use it only to check whether a problem
  already has a maintained solution before recommending building one.

---
</the_document>

<research_method>
The sources above are the reading list, and they were verified reachable on
2026-08-15. They are not a substitute for reading the repository: every VERIFIED
row must rest on evidence from this codebase, and a source is only ever the
standard the evidence is measured against.

If a link fails, do not guess a replacement URL and do not cite from memory.
Mark the row UNVERIFIED, say which source was unreachable, and move on.
WebSearch and WebFetch are both available; the context7 MCP (`resolve-library-id`
then `query-docs`) is the better route for library and framework documentation.
Other MCP servers are connected; find them with ToolSearch.

Where you use a source not on this list, verify it loads, and say in one line
why it was worth adding.
</research_method>

<constraints>
1. **Solo founder, no ops, no on-call.** Every recommendation carries an ongoing
   attention cost. Say it. An architecture nobody maintains is worse than a
   simpler one they will, and a security control nobody maintains is worse than
   none, because it produces the appearance of protection.
2. **First-party analytics is a deliberate decision.** PRD §24 chose no vendor
   SDK; the privacy manifest, the nutrition labels and the privacy policy all
   rest on it. Anything you propose that collects data must be reconciled with
   those three or explicitly rejected. MetricKit is the interesting edge case,
   because it is first-party and on-device; take a position.
3. **Pre-revenue.** Real monthly costs, or say it is free.
4. **Do not import enterprise practice wholesale.** Certificate pinning,
   anti-tampering, a SOC 2 programme, a bug bounty and a formal IRP may all be
   premature. Say so, name the trigger that changes it, and cite the source that
   supports the judgment. Part 1.12 exists for exactly this.
5. **Be willing to conclude that something is fine.** A verification document
   whose every row says FAILS is not credible and will not be used.
6. **Severity, consistently.** Use the PRD's scale (BLOCKER, MAJOR, MINOR,
   LATER) so this document sorts alongside the others.
</constraints>

<anti_patterns>
Do not duplicate `docs/launch-gap-analysis.md`. Cite it.
Do not restate `docs/obligations.md` §5. Extend and verify it.
Do not produce a survey where a verdict is possible.
Do not write an item that cannot be verified by a specific action.
Do not recommend a control without naming who maintains it and what it costs.
Do not pad. Length is not thoroughness.
No em dashes (U+2014). No emoji.
</anti_patterns>

<length>
This document is long because the surface is wide, not because rows are wordy.
Cover every part in full; that is not negotiable, and a short document that
skips Part 5 is a failure. But write to the density of the worked examples
above: one sentence per cell, prose only where an argument is genuinely needed,
and no restating in Part 7 what Part 1 already established. Judge a section by
whether a reader could act on every row, not by how much of the page it fills.
No filler sections, no redundant summaries, no preamble explaining what the
section is about to do before it does it.

This governs how you write a row, never whether a row exists. Never resolve a
length concern by dropping an item, only by tightening the sentence.
Completeness is counted in rows present; brevity is counted in words per row.
Before you finish, confirm every part has a table, every bullet listed under a
part has produced at least one row, and Part 7 references items by number
instead of restating them.
</length>

<delegation>
Delegate rarely. Each subagent re-establishes context, re-explores, reports
back, and you then re-read the report, and the thing that gets lost in that
round trip is exactly what this document is made of: the specific line, the
exact command output, the reason a verdict is what it is. A summary from a
subagent is not evidence, and a row built on one is an assertion wearing a
citation.

Use a subagent for genuinely independent, sizeable tracks: a wide sweep across
many files where the output is a list of locations you will then read yourself.
Do not use one for work you could finish in a handful of tool calls, and do not
use one to verify, review or double-check your own findings. Verification
belongs in your main loop, where you can see the file. Keep spawn counts low; if
one subagent would do, use one. Brief it precisely the first time rather than
launching, waiting, and re-briefing. If you do delegate, commit to it: do not
re-derive its findings afterwards.
</delegation>

<persistence>
Your context window is compacted automatically as it fills, so you can keep
working from where you left off. Do not stop early, trim scope, or wrap up
because of token or context concerns, and do not tell the reader you did. Work
through the parts in order and write each one into
`docs/prelaunch-verification.md` as you finish it, so a context refresh costs
you nothing and progress is always on disk rather than only in your head. When
you resume after a refresh, read what you have already written before
continuing, and pick up at the first part that is missing.

Before you end your turn, check your last paragraph. If it is a plan, a list of
next steps, or a promise about work you have not done, do that work now. End
only when every part is written or you are blocked on something only a human can
provide.
</persistence>

You are autonomous; nobody will answer questions mid-run. Where you must choose,
choose and say what you chose. For reversible things that follow from this
brief, proceed without asking.

Your final message is read by someone who saw none of your working: how many
items are VERIFIED against FAILS against UNVERIFIED, the three most serious
FAILS, the single worst interface tell you found, the one security control you
recommend adding and the one you recommend explicitly not adding, and what to do
first.
