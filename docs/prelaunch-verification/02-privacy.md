# Coiny pre-launch verification: Part 2, Privacy and data protection

**Part 2 of seven.** Part 1 (Security) is at `01-security.md`. Parts 3 to 7 are
not written. Where a privacy question is really a security control, this part
cites the Part 1 row rather than re-deriving it: encryption at rest is 1.3, key
storage on device is 1.2, transport is 1.6, logging is 1.8, breach notification
is 1.11.

**Written 2026-08-15** against the working tree on branch
`docs/prelaunch-verification`. Every VERIFIED and FAILS row rests on a line read
on that date, a command run on that date, or a live console query recorded
inline. UNVERIFIED rows name the instrument and the event that settles them.

Severity uses the PRD scale: **BLOCKER**, **MAJOR**, **MINOR**, **LATER**.

The subject of this part is agreement. Four artefacts were written together on
2026-08-13 and each claims the others as its consistency check: the privacy
policy (`docs/legal/privacy-policy.md`), the iOS privacy manifest
(`ios/Coiny/PrivacyInfo.xcprivacy`), the App Store nutrition labels
(`docs/legal/app-store-privacy-labels.md`), and, by implication, Google Play's
Data Safety form, which has no transcription document at all. Two days of code
have run past them. The disagreements are the findings.

This document does not repeat `docs/launch-gap-analysis.md`. Where it found
something first, the row cites it and adds what changed.

---

## 2.1 What is collected, and whether the four artefacts still agree

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 2.1.1 | Every data type in the nutrition labels appears in the privacy manifest with matching linked/tracking/purpose answers | Compare the label checklist's Step 1 list against the manifest entry by entry | VERIFIED | All ten label rows (`app-store-privacy-labels.md:27-36`) have a manifest entry with `Linked=true`, `Tracking=false` and App Functionality; Product Interaction alone adds Analytics (`PrivacyInfo.xcprivacy:126-138`), matching Step 2 |
| 2.1.2 | The labels document's own consistency check is accurate | Read its Step 3 assertion and count both sides | FAILS | `app-store-privacy-labels.md:58-60` states "the manifest has exactly 9 entries matching the 9 rows in Step 1"; both are in fact ten (Purchase History was added when StoreKit landed the same day, per its own caveat 3 at `:76-79`). The sets agree, the self-check does not, and a stale self-check is how the next drift goes unnoticed. MINOR |
| 2.1.3 | No data type the code collects is missing from the labels and the manifest | Enumerate the user-supplied identifiers in the schema and map each to an Apple data type | FAILS | `schema.ts:273` stores `real_estate_assets.address`, a user-entered street address, which Apple defines as Contact Info > Physical Address ("Such as home address, physical address, or mailing address", [App privacy details](https://developer.apple.com/app-store/app-privacy-details/), fetched 2026-08-15). The labels fold it into Other Financial Info (`app-store-privacy-labels.md:31`) and the manifest has no `NSPrivacyCollectedDataTypePhysicalAddress` entry. **MAJOR at Gate 3**: a missing type is the label mismatch Apple actually rejects for |
| 2.1.4 | Payment Info is correctly undeclared | Check whether any account number, card number or payment credential is stored | VERIFIED, with a better reason than the one written | `grep -rn "mask\|accountNumber\|account_number\|iban\|routing" backend/src/db/schema.ts` returns nothing; `plaid_account_balances` (`schema.ts:664-679`) holds name, type, subtype and balance only. The labels' stated reason (`:39-40`, Apple is merchant of record) covers subscriptions but not bank data; the bank-data half is what this row checks and it holds |
| 2.1.5 | The bureau data Coiny stores is disclosed in the policy | Read the debt tables against the policy's credit paragraph | FAILS | `schema.ts:1006-1029` stores per-tradeline `issuer`, `last4`, `apr`, `credit_limit`, `open_date`, `due_date` and `account_status` including `delinquent`, sourced from an Equifax full-bureau pull (`spinwheel/client.ts:139-142`). `privacy-policy.md:47-50` discloses only "your credit score and store it, plus an identifier". A partial account number and a delinquency flag per creditor is the most sensitive thing in the database and the policy does not mention it. **MAJOR** |
| 2.1.6 | The policy's list of field-encrypted data matches what the code encrypts | Compare the policy sentence against every `encryptString` call site | FAILS | `privacy-policy.md:196-197` names "Access tokens, API keys, your email, and reaction history"; the code additionally encrypts `transactions.merchant_name` (`store/transactions.ts:22,38`), `plaid_recurring_streams.description` (`store/plaid-recurring.ts:28,42`) and `category_overrides.merchant_name_enc` (`store/overrides.ts:52`). The policy understates its own protection, and the same omission is repeated at `:113` and in `service-providers.md:21`. MINOR, and it is three words in three files |
| 2.1.7 | The service-provider record describes Neon's contents correctly | Read its Neon row against the schema | FAILS | `service-providers.md:21` says Neon holds "ciphertext for the sensitive fields, plaintext for transactions"; merchant names in `transactions` are ciphertext as of migration 0048 (`schema.ts:123-141`). The row is the written 314.4(f) oversight record, so being wrong about what the processor holds is the one thing it cannot be. MINOR |
| 2.1.8 | The plaintext that remains is the plaintext the documents admit to | Compare the schema's own residual-risk note against the policy | VERIFIED, and the risk is stated where it belongs | `schema.ts:136-141` records amounts, dates and coarse categories as accepted residual risk, and Part 1 row 1.3.1 rates the line MAJOR and argues it. Part 2 adds only that the policy makes no claim the code contradicts here |
| 2.1.9 | The required-reason API declarations are complete | Grep for every TN3183 API category in the app target | VERIFIED | Of the required-reason categories only `UserDefaults` is used (3 `@AppStorage` properties plus 6 direct `UserDefaults` references across `CoinyApp.swift`, `OnboardingViewModel.swift`, `DeclaredAssets.swift` and `ConnectAccountFlow.swift`); no `systemUptime`, `mach_absolute_time`, file-timestamp, disk-space or `activeInputModes` call exists. Declared as CA92.1 at `PrivacyInfo.xcprivacy:153-163`, which is the correct reason for same-app access |
| 2.1.10 | The manifest actually ships in the bundle | Check the generated project's Resources phase, not the comment claiming it | VERIFIED | `ios/project.yml:36-39` asserts it; `Coiny.xcodeproj/project.pbxproj:11,764` shows `PrivacyInfo.xcprivacy in Resources` in the app target's resources build phase, so the assertion is true rather than merely intended |
| 2.1.11 | The third-party SDK's own manifest does not contradict the app's | Read LinkKit's manifest | VERIFIED | `ios/.spm-cache/checkouts/plaid-ios/LinkKit.xcframework/ios-arm64/LinkKit.framework/PrivacyInfo.xcprivacy` declares only `NSPrivacyCollectedDataTypeUserID` (linked, not tracking) and UserDefaults/CA92.1; nothing in it conflicts with the app target, and the labels' claim to already cover it (`app-store-privacy-labels.md:9-11`) is broader than the SDK declares, which is the safe direction |
| 2.1.12 | The policy's device-data claim matches the device table | Read `device_tokens` and the notification log | VERIFIED | `schema.ts:153-164` stores token, platform and IANA timezone and nothing else; `notification_log` (`schema.ts:647-658`) stores `event_type` and `sent_at` only, exactly as `privacy-policy.md:69-73` describes |
| 2.1.13 | Nothing sensitive rides in a push payload to Apple | Read the payload construction and its callers | VERIFIED | `reactions/dispatch.ts:84-86` selects title and body from the constant `PUSH_TITLES`/`PUSH_BODIES` maps; `push/apns.ts:30-32` sends only those two strings, so APNs receives no amount, merchant or balance |
| 2.1.14 | The policy is reachable by a user | Look for a link in the app and a hosted URL | FAILS | `grep -rni "privacy policy\|terms of service\|athanorworks.com" ios/Coiny` returns nothing, and the policy itself has "Effective date: not yet published" (`privacy-policy.md:13`). Apple 5.1.1(i) wants the link in metadata **and** in the app. Already the first half of `docs/launch-gap-analysis.md` §1 item 2; recorded here because it is also what makes 2.6.1's consent line unbuildable today. **BLOCKER at Gate 3**, blocked on the domain decision |

**Where the drift came from, once.** All four documents were written on
2026-08-13 from the schema and the API surface, and all four are still broadly
right. Every disagreement above is one of two shapes: a self-check written
before the last commit of that day (2.1.2), or a data type that entered the
schema through a feature rather than through a privacy review (2.1.3, 2.1.5).
The second shape is the one that will recur, and the cheap defence is the rule
the labels file already states at `:5-6`: the manifest, the labels and the
policy change in the same PR. Nothing enforces it. A CI check that fails when
`schema.ts` changes without one of the three being touched would be a false
positive most of the time and is not worth it; a line in the PR template is.

Sources: [privacy manifest files](https://developer.apple.com/documentation/bundleresources/privacy-manifest-files),
[describing data use in privacy manifests](https://developer.apple.com/documentation/bundleresources/describing-data-use-in-privacy-manifests),
[TN3183 required-reason APIs](https://developer.apple.com/documentation/technotes/tn3183-adding-required-reason-api-entries-to-your-privacy-manifest),
[App Store privacy details](https://developer.apple.com/app-store/app-privacy-details/).

---

## 2.2 Data minimisation: what is collected that nothing uses

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 2.2.1 | Every field the app asks Apple for is used by something | Trace `users.email` and `users.display_name` from write to read | FAILS | `SignInView.swift:47` requests `[.fullName, .email]`, `store/users.ts:23,29` writes both, and the only reader is `getUserById`, whose call sites are four test files and nothing in `src/` (`grep -rn "getUserById" backend --include="*.ts"`). Coiny stores an email address and a legal name it has never once read. **MAJOR**, and the fix is deletion, not a control |
| 2.2.2 | The name and email are not silently load-bearing somewhere else | Check every other path that could consume them | VERIFIED, they are not | There is no mail sender anywhere (`service-providers.md` lists no email vendor and no SMTP client exists), no `GET /api/account`, and `API.updateDisplayName` (`ios/Coiny/Services/API.swift:136`) has no call site in any view. Dropping the `.email` and `.fullName` scopes and the two columns costs nothing today |
| 2.2.3 | Collecting an identity field with no purpose is stated as the risk it is | Say what it costs | VERIFIED as a judgment | An unused email is a breach-notification liability with no product benefit: it is exactly the "customer information" whose unauthorised acquisition triggers the FTC clock (Part 1 row 1.11.3) and California's (1.11.4), and it is encrypted, which mitigates but does not remove the exposure. Two columns and one scope. MINOR to fix, MAJOR to keep |
| 2.2.4 | Collection of asset identifiers is proportionate to what is displayed | Find any integration whose data is stored but never rendered | FAILS, one case, already known | Discogs collection values are synced and stored but never displayed (PRD R-17.3, restated in the policy's own draft note `privacy-policy.md:256-257`). The honest options are to render it or to stop syncing it; keeping a store-and-never-show path is the definition of collecting what nothing uses. MINOR |
| 2.2.5 | The analytics catalog does not define more collection than the client performs | Compare defined client events against emitted ones | FAILS, harmlessly, in the safe direction | `CLIENT_EVENT_SCHEMAS` defines 14 client events (`analytics/events.ts:46-126`); `grep -rn "telemetry.emit" ios/Coiny` shows 11 distinct names actually emitted, leaving `app_open`, `rung_progress` and `reaction_shown` defined but never sent. Over-definition collects nothing, but `app_open` is the W4 signal the PRD calls a BLOCKER, so its absence is a Part 4 measurement gap rather than a privacy one. MINOR here |
| 2.2.6 | The passthrough fields really are passthrough | Check that phone number and date of birth are never persisted | VERIFIED | `api/spinwheel.ts:22-23,45-48` parses both, hands them to `sendSmsOtp`, and stores neither; `spinwheel_connections` (`schema.ts:218-226`) and `spinwheel_pending` (`schema.ts:420-426`) hold `spinwheelUserId` and `lastCreditScore` only. This is the claim in `privacy-policy.md:49-50` and it is true |
| 2.2.7 | Provider payloads are not stored wholesale beyond what is rendered | Read what lands in the untyped cache blob | FAILS, MINOR | `asset_class_cache.payload` (`schema.ts:689-700`) is an unconstrained `jsonb`; `networth/refresh.ts:194` writes `{ items: snapshot.debtItems, debts: snapshot.debts }`, so full `SpinwheelDebt` records including `creditorName`, `last4` and `paymentHistoryCodes` (`spinwheel/client.ts:115-134`) sit in plaintext JSON. Part 1 row 1.3.1 drew the encryption line over named columns; this blob is the half of the line nobody drew. MINOR, and the proportionate fix is to project the fields the read path actually uses |

**The verdict on minimisation.** Coiny collects close to the product minimum
and the two exceptions are unusually clean to fix: an identity pair nothing
reads (2.2.1) and a vendor payload stored whole rather than projected (2.2.7).
Neither is a design problem. Both are what happens when a field arrives with a
feature and nobody asks what reads it. The GLBA framing is worth stating
plainly: every field kept is a field that must be encrypted, disposed of,
disclosed in three documents and notified about after a breach, so an unused
field is not neutral, it is a standing cost with no offsetting benefit.

---

## 2.3 Deletion: what goes, what survives, what upstream grants are revoked

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 2.3.1 | "Cascade delete across all FK constraints" is true of all of them | Script every `pgTable` in the schema for a `userId` reference and an `onDelete: 'cascade'` | FAILS, two exceptions | A Python pass over `backend/src/db/schema.ts` finds 56 tables; 52 carry a cascading user reference, `household_members` cascades on both owner and member, `users` is the root, and **`processed_events` and `app_store_notifications` have no user reference at all**. `data-disposal-schedule.md:19` and `store/users.ts:53-55` both assert a total cascade. MINOR by volume, MAJOR as a claim, because two of the three documents that describe deletion say "everything" |
| 2.3.2 | Nothing that survives the cascade identifies a person's activity | Read the two survivors | FAILS for one of them | `processed_events` (`schema.ts:81-84`) holds Plaid transaction ids, FIFO-capped at 10,000 rows (`store/events.ts:5,20-25`), so a deleted user's transaction identifiers persist until 10,000 newer events push them out; the ids are Plaid's own pseudonyms and carry no amount or merchant. MINOR, and the cap makes it self-limiting |
| 2.3.3 | The subscription ledger does not outlive the account | Read `app_store_notifications` | FAILS | `schema.ts:916-922` keeps `original_transaction_id`, notification type, subtype and timestamp with no user reference, no cap and no retention rule, so after deletion Coiny still holds Apple's stable per-subscriber identifier and that person's full subscription-event history. It is the idempotency ledger, so it cannot simply be cascaded; the fix is to null `original_transaction_id` on user deletion, or to age the table out. **MAJOR**, and it is the clearest counter-example to `privacy-policy.md:167-169`'s "all data described above ... immediately" |
| 2.3.4 | Deletion revokes the identity provider's grant | Grep for Apple's revoke endpoint | FAILS | Nothing calls `https://appleid.apple.com/auth/revoke`. Found by `docs/launch-gap-analysis.md` §1 item 3 and verified again in Part 1 row 1.4.13; not re-derived. **BLOCKER at Gate 3** under Apple's account-deletion requirement |
| 2.3.5 | Deleting the account does at least as much upstream as disconnecting one connection | Compare `DELETE /api/account` against every per-connection disconnect | FAILS, and this is the finding of this section | `DELETE /api/spinwheel/connect` calls Spinwheel's own user-delete API (`api/spinwheel.ts:168` into `spinwheel/client.ts:237-239`, `DELETE /v1/users/{id}`), but `revokeUpstreamGrants` (`revoke/upstream.ts:52-61`) covers only TrueLayer, YNAB and Discogs, so `DELETE /api/account` never calls it. Deleting your Coiny account therefore leaves your record standing at a credit-bureau aggregator, complete with the phone number, date of birth and Equifax pull, while disconnecting the single connection would have removed it. **BLOCKER at Gate 2**, one line in `revoke/upstream.ts` |
| 2.3.6 | The revocation outcome list names every provider whose credential we hold | Read `UNSUPPORTED` against the connection tables | FAILS | `revoke/upstream.ts:41-44` enumerates YNAB and Discogs only, so the `revocations` array logged at `api/account.ts:49` silently omits Kraken, Kalshi, Alpaca, Coinbase and Spinwheel. Coinbase's absence is reasoned in the file (`:34-40`, no OAuth flow exists, `mode` is only ever `dev_key`) and is correct; the other four are simply not represented, so the audit record of a deletion is incomplete by construction. MINOR, one line each |
| 2.3.7 | The policy tells the user to revoke exactly what Coiny cannot revoke for them | Compare the policy's "revoke at the source" list against the credentials actually held | FAILS | `privacy-policy.md:178-180` names Coinbase, YNAB, Discogs and TrueLayer. It omits Kraken, Kalshi and Alpaca, which are the only three where the user supplied a key that can carry trade rights, and it names Coinbase, where there is nothing user-authorized to revoke (2.3.6). The paragraph advises revocation for the lowest-blast-radius grants and stays silent on the highest. **MAJOR** |
| 2.3.8 | The policy's honesty note about upstream revocation is still accurate | Read the attorney note against the code | FAILS, in the safe direction | `privacy-policy.md:181-184` says "automatic upstream revocation for non-Plaid providers is planned but not yet built"; TrueLayer revocation shipped (`revoke/upstream.ts:63-83`, refreshing the token first so a dead token cannot report false success) and PRD Appendix C records R-15.6 Built. The policy understates what happens. MINOR |
| 2.3.9 | Disconnecting one connection deletes its stored credential | Read every per-connection `DELETE` route | FAILS for the most important one | Kraken, Alpaca, YNAB, Discogs, TrueLayer, Coinbase and Spinwheel all delete their row. `DELETE /api/plaid/item` (`api/plaid-link.ts:239-257`) calls `itemRemove`, sets status `revoked` and `disableItem`, and **never deletes the row**: `grep -rn "delete(plaidItems)" backend/src` returns nothing, so the encrypted access token, cursor and institution survive indefinitely. This contradicts `privacy-policy.md:175-176` and `data-disposal-schedule.md:21`'s "Nothing retains a revoked credential". **MAJOR** |
| 2.3.10 | The right to delete cannot be blocked by a third party | Trace the failure path through every upstream call | VERIFIED, and the design is right | `api/account.ts:33-41` catches per item and continues; `revoke/upstream.ts:46-51,79-82` never throws and returns an outcome per provider; the user row is deleted regardless. This is the correct reading of a deletion right that does not depend on Plaid being reachable, and it is written down at the call site |
| 2.3.11 | The client cannot tell the user their data is gone when it is not | Read the iOS delete path | VERIFIED | `SettingsView.swift:79-85` signs out only after `deleteAccount()` returns, and surfaces "Your account was not deleted and you are still signed in" on failure (`:92-96`); the comment at `:75-78` records that swallowing the error was previously a 5.1.1(v) defect |
| 2.3.12 | Every shipped client offers in-app deletion | Grep the Android client | FAILS | `grep -rni "delete\|privacy\|terms" android/app/src/main/kotlin` returns nothing: the Android client has no deletion affordance, no policy link and no terms link. Google Play requires in-app deletion for any app that supports account creation. MINOR today because Android does not ship, **BLOCKER at Android submission**, and it is the row that says Android is not four screens behind on privacy, it is at zero |
| 2.3.13 | A user can delete without reinstalling the app | Look for the web deletion URL Play requires | FAILS, blocked on the domain | No web endpoint exists and no domain does either; `docs/launch-gap-analysis.md` §3 already flags this as the most-missed solo-developer item. Recorded, not re-derived. **BLOCKER at Android submission** |
| 2.3.14 | The deletion audit line carries no PII | Read what is logged | VERIFIED | `api/account.ts:49` logs `userId`, an item count and the revocation outcomes, all pseudonymous, consistent with `.claude/rules/security.md` #2 and Part 1 row 1.8.3 |
| 2.3.15 | Termination by Coiny deletes data as the Terms promise | Look for an operator-initiated deletion path | FAILS, MINOR | `terms-of-service.md:124-128` says that on termination "these terms end and your data is deleted", but the only deletion path is the authenticated `DELETE /api/account`, so an operator terminating an account has no mechanism and would be left running SQL by hand. Either build a one-line admin script or soften the sentence |

**The 3am deletion story.** A user taps Delete account. Plaid items are removed
upstream, TrueLayer's credential is deleted, 52 tables cascade, and the app
signs out only once the server confirms. What is left behind, verified above:
a live Spinwheel user record holding their phone number, date of birth and an
Equifax pull (2.3.5); a standing Sign in with Apple grant (2.3.4); a standing
Kraken, Kalshi or Alpaca API key the policy never told them to revoke (2.3.7);
their Apple subscription identifier and its event history (2.3.3); and a copy
of everything in a Neon branch (2.9.3). The policy says "everything is deleted
immediately". Four of those five are one function call each.

Sources: [TN3194](https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple),
[Apple: offering account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/),
[Play account deletion requirements](https://support.google.com/googleplay/android-developer/answer/13327111).

---

## 2.4 Retention and disposal

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 2.4.1 | Every table has a disposal rule | Map all 56 tables onto the schedule's rows | FAILS | A script over `schema.ts` against `data-disposal-schedule.md:17-30` leaves **30 of 56 tables with no named rule**: the entire asset layer (`manual_assets`, `declared_assets`, `real_estate_assets`, `vehicle_assets`, `chain_wallets`, `nft_wallets`, `zerion_wallets`, `hyperliquid_accounts`, `polymarket_accounts`, the six collectible tables, `energy_positions`, `farmland_parcels`, `metal_holdings`), the whole debt layer, `asset_class_cache`, `plaid_account_balances`, `device_tokens`, `category_overrides`, `entitlements`, `household_members`, `spinwheel_connections`, plus the two deletion survivors from 2.3.1. Most are defensibly "life of the account", but the schedule is the written 314.4(c)(6) artefact and it does not say so. MINOR to fix, MAJOR as a compliance document |
| 2.4.2 | The purge job that executes the schedule exists | Grep the scheduler | FAILS | `grep -rni "purge\|cleanup\|retention" backend/src/scheduler backend/src/store` returns one unrelated comment. The schedule's own status note (`data-disposal-schedule.md:8-13`) blames the missing scheduler; the scheduler now exists (`scheduler/index.ts:89-176`, PRD R-16.2 Built), so the stated dependency has cleared and the job is simply unbuilt. **MAJOR before sustained real-user operation**, and the schedule's excuse should be updated to say so |
| 2.4.3 | Every retention period the policy states is enforceable today | Check each period against a mechanism | FAILS | `privacy-policy.md:155-162` promises 90 days post-disconnect for transaction data, 12 months for usage events, and two years maximum for inactive accounts. None has an executor: 2.4.2. Today the true retention for every category is "forever, or until the account is deleted". The policy is a statement of intent published as a statement of fact. **MAJOR at Gate 2** |
| 2.4.4 | The two-year Safeguards ceiling cannot be breached before the job ships | Check when the clock could first expire | VERIFIED, with the date | 314.4(c)(6) runs from last use; the oldest row in the primary Neon branch is a test user created 2026-05-23 (`select max(created_at) from users`, run 2026-08-15), so the earliest possible breach is 2028-05. There is time, and that is the only reason 2.4.2 is MAJOR rather than BLOCKER |
| 2.4.5 | The schedule's 90-day rule can actually be expressed as a query | Check whether the schema carries the clock and the join the rule needs | FAILS on the join, not the clock | The clock exists: `setItemStatus` stamps `plaid_items.status_changed_at` on the transition to `revoked` that disconnect performs (`store/items.ts:115-121`, `api/plaid-link.ts:250`). The join does not: `transactions` (`schema.ts:142-151`) has `account_id` but no `item_id`, so "transactions belonging to a removed item" is reachable only through `plaid_account_balances.item_id`, itself a cache with its own eviction. Add `item_id` to `transactions` before writing 2.4.2's job, not after. MINOR |
| 2.4.6 | The reaction history cap matches the stated 12-month rule | Read the enforcement | VERIFIED with a different mechanism | `store/pet.ts:35,138-145` caps reaction history at 50 rows per user inside the same transaction as every write, which is a size bound rather than the schedule's 12-month time bound. The two do not conflict for an active user and the size cap is self-executing, which is better than an unbuilt job; say so in the schedule rather than leaving a promise the code already half keeps |
| 2.4.7 | Analytics retention is bounded | Read the table and the schedule | FAILS | `analytics_events` (`schema.ts:941-959`) is append-only with no cap and no purge; the schedule promises 12 months (`data-disposal-schedule.md:26`) and the policy repeats it (`privacy-policy.md:159`). Same missing job as 2.4.2, recorded separately because it is the one category a user is told they can control |
| 2.4.8 | The retention decision the schedule flags as open has been made | Check open item B7 | UNVERIFIED, founder decision | `data-disposal-schedule.md:44-46` leaves the 90-day post-disconnect figure open, and the policy already publishes 90 (`:157`). Settles when the founder confirms or changes N; it must not settle by the policy being published first |
| 2.4.9 | The schedule has been adopted by the person accountable for it | Read the adoption line | FAILS | `data-disposal-schedule.md:48` reads "Adopted: ______________ (date) by the Qualified Individual" and is blank, while `safeguards-qualified-individual.md:10-11,68-69` names one. 314.4(a) makes that person accountable and an unadopted schedule is a draft. MINOR, and it is a signature |

---

## 2.5 Export and portability

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 2.5.1 | The absence of an export endpoint is a decision, not an oversight | Enumerate the route table and read the requirement | VERIFIED as a deliberate deferral | No export route exists among the 150 registered handlers in `backend/src/api/*.ts` (`grep -rhoE "app\.(get\|post\|put\|patch\|delete)\('" \| wc -l` returns 150; no path contains `export`, `download` or `portab`); PRD R-22.5 marks export LATER with the trigger "UK launch", where it becomes a UK GDPR right on a one-month clock. That is the right call for a US-only launch and `docs/obligations.md` §6 reaches the same conclusion |
| 2.5.2 | The policy's stated access mechanism actually shows the user everything | Test the claim against what the app can render | FAILS | `privacy-policy.md:191-192` says "Everything we hold about you is visible in the app itself; that is the product". Not visible anywhere in the app: `analytics_events`, `reaction_history`, `notification_log`, `sessions`, `processed_events`, and the encrypted email. The policy names in-app visibility as how Coiny honours access rights, so the sentence is doing legal work it cannot support. **MAJOR**, and the honest fix is one sentence ("everything that drives your net worth is visible in the app; email us for anything else") rather than an endpoint |
| 2.5.3 | No part of a user's own data is visible only behind a paywall | Read the tier limits against what is stored | FAILS | `store/entitlements.ts:47-49` caps history display at 30 days on free, 730 on Individual, unlimited on Household, while `net_worth_daily` accumulates for the life of the account. A free user's own snapshots from four months ago are stored and not displayable, so under 2.5.2's mechanism their access right is gated by a subscription. Tier-gating a **feature** is fine; tier-gating the only route to your own stored data is not. **MAJOR**, and it is why 2.5.2's fix must be an email path rather than a UI claim |
| 2.5.4 | Machine-readable portability is refused knowingly | State the position and the trigger | NOT APPLICABLE, deliberate | No US state law reaching Coiny today confers portability (2.10.1, subject to 2.10.2), and a JSON dump of the user's own rows is roughly a day of work whenever one does. Trigger: UK launch, or the first state threshold crossed. Building it early would add an export surface to secure for no legal or product return |

---

## 2.6 Consent: when it is asked, what it covers, whether it is revocable

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 2.6.1 | The consent line specified for the sign-in screen is in the sign-in screen | Read `SignInView.swift` for the copy `consent-copy.md` mandates | FAILS | `docs/legal/consent-copy.md:11-23` places two lines of secondary text beneath the Sign in with Apple button ("By continuing you agree to the Terms of Service and Privacy Policy. Coiny records how you use the app..."). `grep -rn "By continuing\|Privacy Policy\|Terms of Service" ios/Coiny/Views/SignInView.swift` returns nothing. Apple 5.1.1(ii) wants consent before collection. **BLOCKER at Gate 1**, and it is blocked in turn on 2.1.14's hosted URLs |
| 2.6.2 | The Settings toggle that makes consent revocable exists | Read `SettingsView.swift` for the row `consent-copy.md` specifies | FAILS | `consent-copy.md:36-44` specifies a "Share usage data" toggle with footer copy; `SettingsView.swift` has Bank, Goals, Budgets, Subscription, About, Account and Debug sections and no such row (`grep -rn "Share usage data\|usageData" ios/Coiny` returns nothing). `privacy-policy.md:189` tells users they can turn it off. **BLOCKER at Gate 1** |
| 2.6.3 | The telemetry client enforces the consent rule it was given | Read `TelemetryClient.emit` and the wired transport | FAILS | `consent-copy.md:30-32` states "no event may be enqueued before the first successful sign-in completes, and none while the Settings toggle below is off". `Telemetry.swift:135-141` enqueues unconditionally and `:120` wires the live `APITelemetryTransport`, not the logging stub its own header comment still describes (`:6-10`). Collection is on, by default, with no disclosure and no off switch. **BLOCKER at Gate 1** |
| 2.6.4 | Server-emitted analytics respect the same consent | Look for a consent flag the backend reads | FAILS, and this is the half nobody planned for | `grep -rn "consent\|optOut\|analyticsEnabled" backend/src` returns no such column or check; `users` (`schema.ts:18-31`) has no consent field, and `trackServerEvent` (`store/analytics.ts:57-74`) writes unconditionally. Even a fully built toggle would stop only the client queue, while `signup_completed`, `account_connected`, `goal_created`, `item_state_changed`, `push_sent`, `sync_*` and the rest keep writing a behavioural trail. **MAJOR**, and the fix is a `users.analytics_opt_out` boolean checked in one function |
| 2.6.5 | Nothing is collected before the user could have consented | Trace every client emit call site and the endpoint's scope | VERIFIED | All 19 `telemetry.emit` call sites live in the onboarding, Wealth and connection-repair view models, all post-sign-in, and `POST /api/telemetry` is registered inside the protected scope (Part 1 row 1.5.10), so an unauthenticated batch would 401 and requeue rather than land. The ordering is right; the disclosure (2.6.1) is what is missing |
| 2.6.6 | Consent for a credit-bureau pull is asked for as such | Read every string in the Spinwheel connect flow | FAILS | `SpinwheelView.swift:63-65` says "Connect Spinwheel / We'll send a one-time code to verify your identity" and the OTP screen (`:98-100`) adds nothing; the backend then posts `creditReport: { type: '1_BUREAU.FULL', sourceBureau: 'Equifax' }` (`spinwheel/client.ts:139-142`). The user authorizes an identity check and receives a full bureau pull. Whether that is a permissible-purpose defect is lawyer question Q8 in `docs/obligations.md` §8; that the copy does not describe what happens is not a legal question. **BLOCKER at Gate 2** |
| 2.6.7 | The user is told to scope the keys they hand over, as the policy says | Read each key-entry screen | FAILS, one of three | `privacy-policy.md:55-56` says "For Kraken, Kalshi, and Alpaca ... we instruct you to create read-only keys". Kraken does (`NetWorthView+WealthInlines.swift:30,408-410`, with the reason written at the call site). Alpaca says only "Found in your Alpaca dashboard under API Keys" (`AlpacaView.swift:76-78`) and offers a Live environment; Kalshi walks the user through registering a generated public key with no scope guidance (`NetWorthView+WealthInlines.swift:157-175`). The two without the instruction are the two that can carry trade rights. **MAJOR** |
| 2.6.8 | Purpose strings cover exactly the capabilities used | Read the Info.plist and the generator against the capability list | VERIFIED | `grep -n "UsageDescription" ios/Coiny/Info.plist ios/project.yml` returns only the comment recording that `NSBluetoothAlwaysUsageDescription` and `bluetooth-central` were removed (`project.yml:62-66`); no camera, location, contacts, Face ID or tracking string is present and none is needed, exactly as `consent-copy.md:46-57` concluded |
| 2.6.9 | App Tracking Transparency is correctly absent | Check the manifest against the prompt | VERIFIED | `NSPrivacyTracking` is `false` and `NSPrivacyTrackingDomains` is empty (`PrivacyInfo.xcprivacy:12-15`), no `NSUserTrackingUsageDescription` exists, and nothing in the app contacts an ad or attribution network (2.7.6). Adding ATT would be a prompt with no purpose |
| 2.6.10 | Push permission is pre-framed rather than sprung | Read the onboarding screen before the system prompt | VERIFIED | `Onboarding/OnboardingConnectScreens.swift:271-292` shows "I will message you at most twice a week. Never at night. Never about the market." with an explicit Not now path before `requestAuthorization` is called at `:298-300`. This is what the rest of the consent surface should look like |
| 2.6.11 | Bank credential consent happens on the provider's surface, not Coiny's | Confirm no credential field exists in the app | VERIFIED | Plaid Link is presented via `PlaidLinkPresenter` (`SettingsView.swift:123-125`) and LinkKit renders Plaid's own screens carrying Plaid's end-user privacy policy; no institution username or password field exists anywhere in `ios/Coiny`, which is what makes `privacy-policy.md:122`'s "your bank login happens on Plaid's own screens" true |

**Why consent is the weakest area in this part.** Deletion has real bugs but a
real implementation. Consent has a specification (`consent-copy.md`, precise
down to the sentence and the file it lands in), a live collection pipeline, and
nothing in between: no line, no toggle, no flag, no server-side check. The
document says "the onboarding and settings views are owned by another
workstream" (`:5-7`), and that handoff never happened. Three of this part's ten
BLOCKERs are that one missing handoff, and all three are small: two
`Text` views, one `@AppStorage` boolean read by `TelemetryClient.emit`, and one
column read by `trackServerEvent`. A day, gated on the policy URLs.

---

## 2.7 Third-party data flow, and the service-provider list

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 2.7.1 | Every host the backend talks to is on the service-provider list | Extract every outbound host from the source and filter out the listed vendors | VERIFIED | `grep -rhoE "https://[a-zA-Z0-9._-]+" backend/src \| sort -u` yields 57 distinct hosts; filtering by the vendor names in `service-providers.md` leaves **zero** unmatched. The two APNs hosts are built at runtime (`push/apns.ts:28`) and are Apple's. The list was enumerated from code and it still matches the code |
| 2.7.2 | Nothing leaves over cleartext | Grep for an `http://` constant in the backend | VERIFIED | `grep -rhoE "http://[a-zA-Z0-9._-]+" backend/src` returns nothing; the client-side counterpart is Part 1 rows 1.6.4 and 1.6.5 |
| 2.7.3 | The Tier 2 "identifiers, not identity" framing is accurate | Compare the framing against what those vendors receive | FAILS, and the policy already knows | `service-providers.md:32-34` says Tier 2 vendors receive "a query ... with no name, email, or account linkage", but RentCast receives a street address and MarketCheck a VIN, both of which the policy's own attorney note treats as "pseudonymous but potentially re-identifiable ... personal data" (`privacy-policy.md:138-140`). Two documents written the same day take opposite positions on the same fact. MINOR, and the policy's position is the right one |
| 2.7.4 | Vendors with code but no key are handled honestly | Check the config defaults and the disclosure | VERIFIED | `config.ts:63,66` default `RENTCAST_API_KEY` and `MARKETCHECK_API_KEY` to empty, so neither is called today; both are nonetheless disclosed in the policy (`:132`) and listed as "key not yet configured" (`service-providers.md:41-42`), which is the correct treatment for a path that will send data the moment a key is set |
| 2.7.5 | The residency claims in the policy match the deployed systems | Query both consoles rather than reading the doc | VERIFIED | `fly.toml:14` and `fly.production.toml:15` set `primary_region = 'iad'` (Ashburn, Virginia); the Neon project `Coiny` reports `region_id: aws-us-east-1` (Neon API, queried 2026-08-15). `privacy-policy.md:113-114` says United States and Ashburn, Virginia |
| 2.7.6 | No analytics, advertising or crash vendor is present in either client | Read the dependency graphs | VERIFIED | `ios/project.yml:26-29` declares exactly one package, Plaid's LinkKit; `android/app/build.gradle.kts:97-121` lists AndroidX, Compose, Ktor and kotlinx only. PRD §24's no-vendor decision holds in the build files, which is what the labels and the manifest rest on |
| 2.7.7 | Providers removed from the code are removed from the code | Grep for the two the list says were dropped | VERIFIED | `grep -rni "snaptrade\|steam" backend/src ios/Coiny` returns one historical comment (`NetWorthView+WealthInlines.swift:404`) and no call path, matching `service-providers.md:49-53`. Recorded so nobody re-checks |
| 2.7.8 | Each Tier 1 provider's terms have been read | Check the oversight record's own status column | UNVERIFIED, two open | `service-providers.md:24` marks Spinwheel's Developer Policy and End User Agreement "text not yet read; blocked at spinwheel.io/legal, read in a browser before production use", and `:27` marks TrueLayer's client-side terms unverified. Both are 314.4(f) obligations and neither is a code check; settles in a browser, and Spinwheel's is the one that gates 2.6.6's answer |
| 2.7.9 | The processor set the policy publishes matches the oversight record | Diff the two lists | VERIFIED | Every vendor in `privacy-policy.md:111-136` appears in `service-providers.md` and vice versa, including the pricing vendors and Frankfurter. This is the one place where all the privacy documents agree with each other and with the code |

---

## 2.8 Android: Google Play's Data Safety form against the same facts

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 2.8.1 | A Data Safety transcription exists to be verified | Look for one | FAILS | No such document exists; `docs/launch-gap-analysis.md` §3 already records it and that the Apple label checklist is the right source material but not a 1:1 mapping. Not re-derived. The rows below are what a transcription must answer differently from Apple's |
| 2.8.2 | The Android client's collection is described from the Android client, not from iOS | Enumerate what the Kotlin app actually sends and stores | VERIFIED, and it is much narrower | `data/Api.kt:56-76` calls `/api/pets`, `/api/spending/summary`, `/api/spending/overrides`, `/api/net-worth`, `/api/auth/google` and `/api/auth/logout` and nothing else; there is no push registration, no telemetry, no Spinwheel screen and no asset entry. A Play form transcribed from Apple's labels would over-declare Device ID, Product Interaction, Phone Number, Purchase History and Other Data Types (date of birth) |
| 2.8.3 | Play's "collect" versus "share" question has an answer on record | Read Google's definitions against the processor list | FAILS | Google defines collection as transmitting data off-device and sharing as transfer to a third party "including server-to-server transfers" ([Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469), fetched 2026-08-15). Every Coiny vendor is a processor acting on Coiny's instructions, so the defensible answer is "collected, not shared" for all of them, but no document states it and the form is the first place anyone will have to. MINOR, and writing the sentence is the whole fix |
| 2.8.4 | Play's encryption-in-transit answer is true | Check the transport | VERIFIED | Yes for both clients: Part 1 rows 1.6.1, 1.6.4 and 1.6.7. Note that Play asks only about transit, so Part 1 row 1.2.8's unencrypted Android session token is invisible to this form and must not be treated as answered by it |
| 2.8.5 | Play's data-deletion answer is true | Check both halves of Play's requirement | FAILS | Play requires an in-app deletion path and a web URL; Android has neither (2.3.12, 2.3.13). The form's deletion answer cannot be completed truthfully today. **BLOCKER at Android submission** |
| 2.8.6 | The permission set the form is read against is the one the app needs | Read the manifest | FAILS | `android/app/src/main/AndroidManifest.xml:6-10` still declares `BLUETOOTH_SCAN` and `BLUETOOTH_CONNECT` for parked hardware, and `:12-13` declares `POST_NOTIFICATIONS` for push that is "wired in a later PR", both with comments admitting it. Found in `docs/launch-gap-analysis.md` §2.11; recorded here because unused permissions are assessed alongside the Data Safety declaration. MINOR, and deleting the lines is more honest than declaring them |
| 2.8.7 | The Android client does not log data the form would have to declare | Read the HTTP client's log level | VERIFIED | `data/Api.kt:44` installs Ktor `Logging` at `LogLevel.INFO`, which emits the request and response line only, not headers or bodies, so neither the bearer token nor a net-worth payload reaches logcat |

---

## 2.9 Backups, branches, and what outlives a cascade delete

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 2.9.1 | The policy tells users that deleted data persists in backups | Read the paragraph | VERIFIED as a disclosure | `privacy-policy.md:171-173`: "Deleted data can persist in our encrypted backups for up to 30 days after deletion, after which it is gone from those too. Backups are never used to restore a deleted account." This is what PRD R-22.4 asks for and it is present |
| 2.9.2 | The backup the policy describes exists | Query the platform and the CI configuration | FAILS | The Neon project `Coiny` (`noisy-bonus-65551609`) reports `history_retention_seconds: 21600`, six hours, not thirty days (Neon API, queried 2026-08-15), and `grep -rn "backup\|pg_dump" .github/workflows` returns nothing, so R-20.1's nightly encrypted dump does not exist. The user-facing statement describes a mechanism that has never run. It errs toward over-disclosure, which is the harmless direction, but it is still a published claim about a system that is not there. **MAJOR**, and it resolves either by building R-20.1 or by changing the sentence to six hours |
| 2.9.3 | Deleting a user's rows reaches every copy of them | Enumerate the database branches and compare their contents | FAILS | The Neon project holds two branches: `production` (primary) and `staging`, created 2026-08-14 from `production` with `init_source: parent-data` at a parent timestamp of 2026-08-13 (Neon API, 2026-08-15). Both return `users = 1` with the identical `max(created_at) = 2026-05-23T05:20:01.099Z`, so the same person exists twice and `DELETE /api/account` reaches only one of them. No privacy document mentions database branches, and a branch taken for a debugging session is a full copy of production data with an indefinite life. **MAJOR the day production holds a real user**, and the rule is one line: branches from a branch holding real data are named, dated and deleted |
| 2.9.4 | "Backups are never used to restore a deleted account" is operationally supportable | Ask what re-applies a deletion after a restore | FAILS | Nothing records that a user was deleted: the cascade removes the row and leaves no tombstone, so a restore from any copy resurrects every account deleted since that copy was taken, and no list exists to re-delete them from. Today the exposure is bounded by 2.9.2's six-hour window; it becomes real the day R-20.1 ships. MINOR now, **MAJOR the day a 30-day dump exists**, and the fix is a `deleted_user_ids` append-only table or a documented post-restore step |
| 2.9.5 | Branch creation from a data-bearing branch is constrained | Read the branch protection state | FAILS, cheaply | Both branches report `protected: false` (Neon API, 2026-08-15). Neon's protected-branch setting is the platform control that makes 2.9.3 hard to repeat by accident; it costs one toggle and no ongoing attention. MINOR, and it is the only new control this part recommends adding |

**One thing this section found that belongs to Part 4.** The `production` branch
carries 43 tables while the schema defines 56 (`select count(*) from
information_schema.tables where table_schema='public'`, both branches, 2026-08-15),
so the primary branch has not had migrations run against it in some time. That
is a restore-target and RPO question, not a privacy one, and Part 4 owns it.

---

## 2.10 The state-privacy claims the policy makes

| # | What must be true | How it is verified | Status today | Evidence |
|---|---|---|---|---|
| 2.10.1 | "Below every state privacy law's applicability threshold" is true for California | Read the statutory definition rather than a summary | VERIFIED for California | Civ. Code 1798.140's "business" definition requires one of: gross revenues over $25,000,000; buying, selling or sharing the personal information of 100,000 or more consumers or households; or deriving 50 percent or more of annual revenue from selling or sharing personal information ([leginfo](https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?division=3.&part=4.&lawCode=CIV&title=1.81.5), fetched 2026-08-15). Coiny meets none with zero users. `privacy-policy.md:218-221` is correct as to California |
| 2.10.2 | The same claim is true of the other state regimes | Check the thresholds and effective dates state by state | UNVERIFIED | The [IAPP state tracker](https://iapp.org/resources/article/us-state-privacy-legislation-tracker/) serves its content through an interactive chart that the fetch returns as boilerplate, so the multi-state answer could not be established from the source the brief names. The claim is almost certainly right at zero users, since every comprehensive state law carries a consumer-count or revenue threshold; it is recorded UNVERIFIED because "almost certainly" is not evidence. Settles by reading the tracker's chart in a browser, once, before launch |
| 2.10.3 | The GLBA carve-out is described as what it is | Quote the exemption | VERIFIED, and the policy does not lean on it | 1798.145(e): "This title shall not apply to personal information collected, processed, sold, or disclosed subject to the federal Gramm-Leach-Bliley Act ... This subdivision shall not apply to Section 1798.150." (fetched 2026-08-15). It attaches to the **information**, not the company, so anything Coiny holds that is not GLBA nonpublic personal information stays in scope. The policy rests on the thresholds instead, which is the safer footing and needs no change |
| 2.10.4 | The breach private right of action is placed correctly | Read 1798.150 against the definition it uses | VERIFIED, does not reach Coiny today | 1798.150(a)(1) runs against "the business's" failure to maintain reasonable security, so it inherits 1798.140's thresholds; a company below all three is not a "business" and the $100 to $750 per-consumer statutory damages do not attach, notwithstanding the 1798.145(e) carve-out. **Trigger: any one threshold crossed**, at which point the exposure is per consumer per incident and the encryption carve-out in the same subdivision becomes load-bearing (Part 1 rows 1.3.1 and 1.11.3) |
| 2.10.5 | Breach notification is not confused with the privacy statutes | Separate the two | VERIFIED, already settled | California's notification duty under Civ. Code 1798.82 has no size threshold and a 30-day clock; that is Part 1 row 1.11.4 and is not restated here. The distinction matters because it is the one state obligation that binds Coiny today |

**The one sentence to change.** Nothing in 2.10 requires a policy edit. The
attorney note at `privacy-policy.md:218-221` is accurate, appropriately hedged,
and names the right trigger. That is worth saying plainly, because most of this
part is findings and a reader could otherwise assume the whole document drifted.
Whether the policy also discharges the GLBA Regulation P notice obligation is a
different question and Part 5 owns it.

---

## Coverage ledger

Every bullet in Part 2's brief, and the rows it produced. Written as a ledger
rather than from memory, because that is what catches the bullet nobody covered.

| Brief bullet | Rows | Covered |
|---|---|---|
| What is collected, where it goes, how long it lives, and whether the policy, the manifest and the nutrition labels all say the same thing | 2.1.1 to 2.1.14, 2.4.1 to 2.4.9 | Yes, 23 rows |
| Data minimisation: is anything collected that nothing uses | 2.2.1 to 2.2.7 | Yes, 7 rows |
| Deletion: what gets deleted, what survives, what upstream grants are revoked, and further siblings of the two the audit found | 2.3.1 to 2.3.15 | Yes, 15 rows; the new siblings are 2.3.3, 2.3.5, 2.3.7 and 2.3.9 |
| Export and portability | 2.5.1 to 2.5.4 | Yes, 4 rows |
| Consent: when it is asked, what it covers, whether it is revocable | 2.6.1 to 2.6.11 | Yes, 11 rows |
| Third-party data flow: every processor, what each receives, and whether it is on the service-provider list | 2.7.1 to 2.7.9 | Yes, 9 rows |
| Android's Data Safety form against the same facts | 2.8.1 to 2.8.7 | Yes, 7 rows |
| Backups: Neon's point-in-time history outlives a cascade delete; verify the privacy policy says so | 2.9.1 to 2.9.5 | Yes, 5 rows; the policy does say so and the backup it describes does not exist (2.9.2), and the copy that does exist is a branch, not a backup (2.9.3) |
| The CCPA source note in the brief (GLBA carve-out is data-level, breach right of action) | 2.10.1 to 2.10.5 | Yes, 5 rows |

Each of the ten subsections carries a table. Sections 2.1, 2.2, 2.3, 2.6, 2.9
and 2.10 carry prose beneath the table where an argument was needed rather than
a verdict; 2.4, 2.5, 2.7 and 2.8 did not need one and do not have one. Part 7's
runbook should reference the rows above by number and not restate them; the
closing section here does the same.

**Row counts: 86 rows, 37 VERIFIED, 45 FAILS, 3 UNVERIFIED, 1 NOT APPLICABLE.**
Ten rows carry a BLOCKER: 2.1.14, 2.3.4, 2.3.5, 2.3.12, 2.3.13, 2.6.1, 2.6.2,
2.6.3, 2.6.6 and 2.8.5, of which three (2.3.12, 2.3.13, 2.8.5) bite only at
Android submission. Every other severity is on its own row.
Counted rather than asserted: of the 45 FAILS, 17 are a document
saying something the code or another document contradicts and are fixed by
editing the document (2.1.2, 2.1.3, 2.1.5, 2.1.6, 2.1.7, 2.3.7, 2.3.8, 2.3.15,
2.4.1, 2.4.3, 2.4.9, 2.5.2, 2.7.3, 2.8.1, 2.8.3, 2.9.1's 30-day claim via 2.9.2,
and 2.2.5), and 28 are fixed by changing the system. Consent (2.6) and deletion
(2.3) hold 15 of those 28 between them, which is where the work is. The
proportion is high because this surface was written once, on one day, from a
codebase that has moved since, and nobody has checked it against the code until
now.

## What Part 7 should order first, by row

2.6.6 and 2.3.5 before any real Spinwheel connection; 2.6.1, 2.6.2 and 2.6.3
before the first external tester; 2.3.4 and 2.1.3 before submission; 2.9.5 today
because it is a toggle; 2.2.1 today because deleting two columns is faster than
protecting them. Everything else sorts behind those.
