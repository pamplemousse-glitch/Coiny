# App Store Connect Privacy Labels: Transcription Checklist

Field-by-field answers for App Store Connect > App Privacy (PRD R-22.2).
These answers, `ios/Coiny/PrivacyInfo.xcprivacy`, and
`docs/legal/privacy-policy.md` were written together on 2026-08-13 and name the
same data categories. If any one changes, change all three in the same PR.

Derivation: enumerated from `backend/src/db/schema.ts`, `backend/src/api/*`,
and the iOS views, not from memory. Plaid LinkKit ships its own privacy
manifest; Apple aggregates it at submission, but the label answers below
already cover what LinkKit collects on our behalf (financial info, identifiers).

## Step 0: the two gate questions

| App Store Connect question | Answer |
|---|---|
| Do you or your third-party partners collect data from this app? | **Yes** |
| Is data used to track users across apps/websites owned by other companies? | **No** (for every data type) |

## Step 1: data types to declare

Select exactly these. For every one of them, the follow-up answers are the
same and are given in Step 2.

| ASC category | ASC data type | What it actually is in Coiny |
|---|---|---|
| Contact Info | Phone Number | Entered for Spinwheel SMS identity verification; sent, not stored |
| Financial Info | Credit Info | Credit score from Spinwheel |
| Financial Info | Other Financial Info | Balances, transactions, liabilities, asset values and identifiers (wallet addresses, property addresses, VINs), goals, net worth history |
| Identifiers | User ID | Apple/Google subject identifier + Coiny account id |
| Identifiers | Device ID | APNs push token registered with the backend |
| Usage Data | Product Interaction | First-party telemetry events (PRD section 24); bucketed, no amounts, no merchant names |
| Diagnostics | Performance Data | MetricKit `MXMetricPayload` (G3.10), reduced on device to the `device_metrics` event: launch time, hang time, peak memory, CPU time, scroll hitch ratio, foreground exit counts, app build, OS major. Counts and durations only |
| Diagnostics | Crash Data | MetricKit `MXDiagnosticPayload` (G3.10): unsymbolicated call stacks (binary UUID + text-segment offset), exception type, code and signal, plus a hash grouping repeats of one crash. Covers crashes, hangs, disk-write and CPU exceptions, and launch diagnostics. `terminationReason`, `virtualMemoryRegionInfo` and `exceptionReason` are dropped on the device and rejected again at the route. Live since 2026-08-23 |
| Purchases | Purchase History | Subscription product id, expiry and original transaction id, stored server-side against the account |
| Other Data | Other Data Types | Date of birth, entered for Spinwheel identity verification; sent, not stored |

Do **not** declare: Location, Contacts, User Content, Browsing History, Search
History, Health & Fitness, Sensitive Info, Payment Info (Apple
is merchant of record; we never see payment details).

**Diagnostics moved off that list on 2026-08-23** (G3.10). It read "Diagnostics
(no crash SDK is integrated)", which was true and is now not: MetricKit is a
system framework rather than an SDK, and adopting it is still collection. Both
Diagnostics rows are declared above.

Also do **not** declare **Name** or **Email Address**. Both were listed here
until 2026-08-23 and were stale by four layers: `SignInView` requests no Apple
scopes (`request.requestedScopes = []`), `api/auth.ts` omits both from its
schemas and reads only `sub` from Google's id token, and drizzle migration
`0054_drop_user_identity_columns` dropped `users.email` and
`users.display_name` because nothing in `src/` ever read them (audit 2.2.1).
`privacy-policy.md` section 1 has said so correctly the whole time; this file
and the manifest were the two that drifted. Re-declare only alongside a named
reader.

## Step 2: per-type follow-up answers

For **every** type declared above:

| ASC question | Answer |
|---|---|
| How is this data used? | **App Functionality** (for Product Interaction and Performance Data: **Analytics** and App Functionality) |
| Is this data linked to the user's identity? | **Yes** |
| Is this data used for tracking? | **No** |

Nothing is collected "not linked to identity": every row in the backend is
keyed by user id.

## Step 3: consistency invariants (checked 2026-08-13)

- Every type above appears in `PrivacyInfo.xcprivacy` under
  `NSPrivacyCollectedDataTypes` with `Linked = true`, `Tracking = false`, and
  matching purposes. Verified by counting on 2026-08-23: the manifest has
  exactly **10** entries matching the **10** rows in Step 1. (It was 8 and 8
  earlier the same day, before G3.10 added the two Diagnostics rows.)

  This line previously read "exactly 9 entries matching the 9 rows" and that
  was wrong when it was written: there were 10 of each. So the invariant most
  likely to catch a drift was itself drifted, and stated a specific number
  confidently enough that nobody recounted. Recount both sides when either
  changes; do not carry this number forward on trust.
- Every type above is described in plain language in the privacy policy
  sections 1 and 3. Verified.
- `NSPrivacyTracking` is `false` and `NSPrivacyTrackingDomains` is empty:
  matches the "No tracking" answers.

## Caveats to re-check at submission time

1. **Product Interaction** presumes the section 24 telemetry pipeline is in the
   submitted binary (it is a BLOCKER before the first tester, so it should be).
   If a build ships without telemetry, an over-declared label is not a
   rejection risk, but keep the trio in sync when in doubt.
2. **Device ID** is declared conservatively for the APNs push token. Judgment
   call: some apps omit push tokens under Apple's optional-disclosure carve
   out; the token is stored server-side and linked to the account, which fails
   the carve out's conditions, so declare it.
3. **Purchases** is declared: StoreKit subscriptions landed on 2026-08-13.
   Apple remains merchant of record, so Payment Info stays undeclared; what
   we store is the entitlement, not the card. The matching entry is in
   `ios/Coiny/PrivacyInfo.xcprivacy` as `NSPrivacyCollectedDataTypePurchaseHistory`.
4. If a crash-reporting or analytics SDK is ever added (PRD says revisit at
   1,000 users), redo this whole file.
