# Coiny: everything only Antoine can do

Complete founder task list to reach MVP launch. Nothing here is code; all of it
is blocked on a human with an account login, a credit card, or a signature.

Ordered by **lead time**, not by importance. The first four start clocks that
run for days or weeks, so they go first even though later items feel more
urgent. Everything below section 1 can be done in any order once unblocked.

---

## 1. Start these today, they have external lead time

### 1.1 Get a D-U-N-S number for Athanor Works LLC
- Free, from Dun & Bradstreet. Up to about 5 business days.
- **Blocks:** Apple Organization enrollment, which is required for App Store
  *submission* under guideline 5.1.1(ix).
- **Does NOT block TestFlight, archiving, device installs, or StoreKit.** This
  document previously said it did, and that was wrong. Apple's TestFlight page
  states its limits with no membership-type condition, and 5.1.1(ix) says apps
  in banking and financial services "should be **submitted** by a legal entity",
  using "should", about submission, and never mentioning beta distribution:
  https://developer.apple.com/testflight/
  https://developer.apple.com/app-store/review/guidelines/
  Verified against both pages on 2026-08-16. Start D-U-N-S because submission
  genuinely needs it and it has weeks of lead time, not because it gates
  getting the app in front of testers.

### 1.2 Convert the Apple Developer account to an Organization
- developer.apple.com > Account > Membership details. Team ID `UKL98DS9D3`.
- It must read **Organization: Athanor Works LLC**, not Individual.
- Apple guideline 5.1.1(ix) bars financial-services apps from individual
  enrollments. A finance app submitted from a personal account is rejected.
- Needs the D-U-N-S number from 1.1. Migration takes weeks, so start the moment
  D-U-N-S lands.
- **Blocks:** TestFlight external testing, all subscription products, submission.

### 1.3 Commission the character, Phase 1
- Budget roughly $400 to $900 for the exploration phase.
- Brief is in `docs/design-direction.md` section 7.2.
- **This is now the critical path.** Every screen in the app currently renders a
  placeholder creature. Swapping in real art is a one-file change on our side,
  so the only thing standing between placeholder and finished is the artist's
  turnaround.

### 1.4 Send the two legal documents to an attorney
- `docs/legal/privacy-policy.md` and `docs/legal/terms-of-service.md`.
- Both carry inline "Attorney note" flags marking every judgment call.
- Also send lawyer questions Q3, Q5 and Q7 from `docs/obligations.md` section 8.
- Review them as a pair; it is cheaper and they cross-reference.
- **Blocks:** the privacy policy blocks TestFlight. The ToS blocks the first
  paying user.

---

## 2. Quick wins, about 30 minutes total, do them while waiting

### 2.1 Turn on MFA everywhere and record the date - DONE 2026-08-17
- Fly.io, Neon, Plaid dashboard, Apple Developer, GitHub: **all confirmed on
  by Antoine, 2026-08-17.**
- Required by FTC Safeguards 314.4(c)(5) before a real bank connects, and
  attested to directly in Plaid's trial-access form.

### 2.2 Confirm the support email works
- `coiny@athanorworks.com` must receive mail.
- Used by both legal documents and the App Store listing.

### 2.3 Send the Discogs email
- Draft is ready in `scratchpad/vendor-outreach.md`.
- Discogs marketplace prices are Restricted Data and need **written**
  permission for commercial use. Vinyl valuation is currently switched off in
  the product because of this, so this email is the only thing that turns a
  built feature back on. Longest turnaround of the four vendor emails.

### 2.4 Send the YNAB email
- Same file. Requests unrestricted API access.
- Gates the first paying user, so it has a real deadline.

### 2.5 Sign the Qualified Individual designation
- `docs/legal/safeguards-qualified-individual.md`. Confirm your legal name is
  right, then print-sign or PDF-sign and store with the LLC records.
- FTC Safeguards requires a **named** individual. Unsigned means undesignated.

### 2.6 Pick the product name
- Still a placeholder. Needed before the App Store listing and before any
  domain or trademark work.

---

## 3. Once the Organization account exists

### 3.1 Create the four subscription products in App Store Connect
One subscription group named "Coiny", containing exactly these product IDs.
They are hardcoded in three places, so the IDs must match character for
character:

| Product ID | Price |
|---|---|
| `app.coiny.individual.annual` | $99 |
| `app.coiny.individual.monthly` | $9.99 |
| `app.coiny.household.annual` | $169 |
| `app.coiny.household.monthly` | $16.99 |

Set Household to a higher service level than Individual within the group.

### 3.2 Enable Billing Grace Period for the subscription group
- Without it, a user whose card fails loses access instantly instead of keeping
  it through the retry window. The code already handles grace correctly; this
  switch is what makes it reachable.

### 3.3 Set the App Store Server Notifications V2 URL
- `https://coiny-backend.fly.dev/webhooks/appstore`
- Set it for both production and sandbox; the handler records which is which.
- Without it, entitlements silently drift from reality the moment a card fails
  or someone refunds.

### 3.4 Host the reviewed privacy policy at a public URL
- Suggested: `https://athanorworks.com/coiny/privacy`, or a one-page GitHub
  Pages site if the domain has no hosting yet.
- Then paste the URL into App Store Connect > App Privacy, and tell me so I can
  wire the in-app Settings link. Apple 5.1.1 requires **both** locations.
- Do the same for the ToS URL.

### 3.5 Transcribe the privacy nutrition labels
- App Store Connect > App Privacy, answered field by field from
  `docs/legal/app-store-privacy-labels.md`.
- Do not improvise the answers. They must match the shipped
  `PrivacyInfo.xcprivacy` exactly or the build is rejected.

---

## 4. Before the first real bank connection

### 4.1 Request Plaid production access
- Plaid dashboard > Launch Center. Needs the hosted privacy policy URL from 3.4.
- The connection-repair and lifecycle work Plaid reviews for is now built.

### 4.2 Adopt the data disposal schedule
- `docs/legal/data-disposal-schedule.md` proposes 90 days after a user
  disconnects. Accept it or change the number, then date the adoption line.
- If you change 90, section 4 of the privacy policy has to change to match.

### 4.3 Read three legal pages that blocked automated fetching
- Spinwheel developer policy (before any production credit data), Kalshi
  developer agreement, Coinbase CDP terms.
- One sitting in a browser. Listed as Unverified in `docs/obligations.md` §4.

---

## 5. Two decisions I need from you

### 5.1 The App Review demo account
- Apple guideline 2.1 requires a reviewer to see the product without a real
  bank. The proposed approach is in `docs/legal/app-review-demo-account.md`.
- Accept or amend it. Once accepted it becomes two build tasks for me and two
  small setup tasks for you.

### 5.2 The Bluetooth removal
- Overnight I removed the Bluetooth purpose string and background mode from the
  app: no Bluetooth code exists, hardware is gated post-launch, and an unused
  background mode is an App Store 2.5.4 rejection risk.
- Confirm you are happy with that, or say so and I will revert it. One line
  either way.

---

## 6. Standing, not now

- **At 4,000 consumers:** start building the four FTC Safeguards elements
  currently waived under 16 CFR 314.6 (written risk assessment, penetration
  testing program, incident response plan, annual report). They are
  deliberately not written today.
- **Annually:** review the service-provider list in
  `docs/legal/service-providers.md`.

---

## What is NOT on this list

Everything else. The backend, the iOS app, the tests, the migrations, the
compliance documents themselves, and the remaining UI are mine and in progress.
If an item is not written above, you are not blocking it.
