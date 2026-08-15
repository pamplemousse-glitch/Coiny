# Incident response: the one page

For Athanor Works LLC (Coiny). **This is not a formal IRP and is not trying to
be.** 16 CFR 314.6 waives the written plan of 314.4(h) below 5,000 consumers, so
the formal document is genuinely premature. What the waiver does not waive is
the 30-day clocks below. This page exists so a founder reading it at 3am does
not have to look any of that up. Build the formal plan at 4,000 consumers.

Owner: Antoine Wiley, Qualified Individual (`legal/safeguards-qualified-individual.md`).
Last reviewed: 2026-08-15.

---

## The first five things, in order

Do these in order. Do not start writing anything up until step 4.

1. **Write down the time you found out, in UTC, and what tipped you off.**
   One line in a file. Every clock below runs from "discovery", so if you cannot
   say when discovery was, you cannot show you met a deadline. Keep appending to
   this file as you go; it is the incident log and it takes ten seconds a line.

2. **Contain, do not investigate.** Rotate the credential you suspect, or pull
   the app if you cannot tell which. `fly secrets set` forces a restart;
   `fly scale count 0` stops the service outright and is the right call if the
   alternative is guessing. A stopped service leaks nothing. Read
   "Rotating things" below **before** touching `DATA_ENCRYPTION_KEY`, which is
   the one credential that is not safe to rotate reflexively.

3. **Preserve evidence before it ages out.** Fly log retention is short. Pull
   what you have now (`fly logs`, redirected to a file) and take a Neon branch
   from the current state, which is instant and cheap and freezes the database
   as it stands. You cannot re-collect this later, and you will want it for both
   the investigation and the notification.

4. **Decide the one question that sets every deadline: was unencrypted customer
   information acquired, and for how many people?** See the decision box below.

5. **Notify, on the clocks below.** Then fix the root cause. In that order,
   because the clocks do not pause while you are fixing things.

---

## The decision that sets the clocks

16 CFR 314.2 defines a **notification event** as acquisition of *unencrypted*
customer information without the individual's authorisation, and information
counts as unencrypted **if the encryption key was also accessed**.

This is why the architecture matters at 3am:

- Tokens, keys, email and reaction history are field-encrypted AES-256-GCM
  before they are written. A stolen Neon dump alone is ciphertext.
- **The transactions table is plaintext.** A database dump is a notification
  event on its own merits because of this table. Do not talk yourself out of it.
- `DATA_ENCRYPTION_KEY` lives in Fly secrets. **If the Fly account or the key
  fell, every encrypted field counts as unencrypted** and the whole store is in
  scope.

Count **consumers**, not rows and not sessions.

---

## The clocks

| Who | Trigger | Deadline | Where |
|---|---|---|---|
| **FTC** | 500 or more consumers, unencrypted customer information acquired | Electronic notice as soon as possible, **no later than 30 days after discovery** (16 CFR 314.4(j)) | [Safeguards Rule notification form](https://www.ftc.gov/business-guidance/privacy-security/gramm-leach-bliley-act/safeguards-rule-form) |
| **California** | **One** affected California resident. No small-business exemption exists, in any state | **30 calendar days** from discovery (Civ. Code 1798.82, as amended by SB 446, effective 2026-01-01). Also notify the AG at 500+ CA residents | [Civ. Code 1798.82](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.82) |
| **Every other state** | One affected resident of that state | Varies, commonly 30 to 60 days; several are "without unreasonable delay" | [50-state survey](https://privacyrights.org/resources-tools/reports/data-breach-notification-laws-50-state-survey-2026-edition) |
| **Plaid** | Any incident touching Plaid-derived data | Per the Developer Policy, promptly. Call them, do not wait for a form | Dashboard, plus your account contact |
| **Affected users** | Any state trigger firing | Same clock as the state | Email, in-app |

**The practical rule: California's 30 days is the binding clock, and it fires at
one affected resident.** The FTC's 500-consumer threshold is *higher*, so in
almost every scenario Coiny can realistically have, the state duty bites first
and the federal one may never bite at all. Do not use "under 500" as a reason to
relax; it only answers the FTC question.

Under 500 consumers you do not file with the FTC. You still notify the states,
still notify users, and still write it down.

---

## Who to call

| Vendor | What they hold | Where to go |
|---|---|---|
| **Fly.io** | All data in transit; **`DATA_ENCRYPTION_KEY`** and every other secret | `security@fly.io`; support via the dashboard. Rotate the deploy token first |
| **Neon** | The database. Ciphertext for encrypted fields, **plaintext transactions** | Support via the console; branch the DB before anything else |
| **Plaid** | Bank data end to end; holds bank credentials so we never do | Dashboard support and your account contact. Their Developer Policy binds both directions |
| **Apple** | Sign in with Apple, APNs, IAP | Developer support; revoke keys in the developer portal |
| **GitHub** | Source, Actions secrets, deploy path to production | `security@github.com`; audit log is under org settings |
| **Spinwheel, Coinbase, YNAB, Discogs, Kraken, Kalshi, Alpaca, TrueLayer, Zerion** | Per-user tokens or user-supplied API keys | Full list with what each one touches: `legal/service-providers.md` |

Also: the **FTC's [Data Breach Response Guide](https://www.ftc.gov/business-guidance/resources/data-breach-response-guide-business)**
has model notification letter text. Do not draft one from scratch at 3am.

---

## Rotating things

Order matters, most privileged first: **Fly deploy token and account password →
GitHub (Actions secrets, personal tokens) → Neon → Plaid → Apple → the rest.**
Turn on MFA everywhere while you are in there if it is not already on; that is
314.4(c)(5) and it is the open item that would most likely have prevented this.

**`DATA_ENCRYPTION_KEY` is the exception. Do not rotate it reflexively.** There
is no key version in the envelope and no re-encryption tooling (audit §1.3.6,
§1.11.7, register R-20.3). Rotating it **destroys every encrypted field**: every
stored token becomes unreadable and every user must re-link every account. It is
sometimes still the right call, but it is a deliberate decision with a migration
attached, not a reflex. Write down that you made it.

**There is no revoke-all-sessions endpoint** (audit §1.4.5, R-15.3). If session
tokens are in scope, the only blunt instrument available today is truncating
`sessions` in the database, which signs everybody out. Know that before you need
it.

---

## What this page deliberately does not do

Detection. Nothing alerts. Request logs carry no user or session id
(audit §1.0.3), so "which account did this" is not answerable from logs today.
Discovery will realistically come from a user, a vendor, or a researcher via
`SECURITY.md` and `/.well-known/security.txt`. That is a known gap, written down
rather than papered over.

## Sources

[16 CFR 314.4](https://www.ecfr.gov/current/title-16/part-314/section-314.4) ·
[16 CFR 314.6](https://www.law.cornell.edu/cfr/text/16/314.6) ·
[FTC Safeguards Rule guide](https://www.ftc.gov/business-guidance/resources/ftc-safeguards-rule-what-your-business-needs-know) ·
[FTC notification form](https://www.ftc.gov/business-guidance/privacy-security/gramm-leach-bliley-act/safeguards-rule-form) ·
[FTC breach response guide](https://www.ftc.gov/business-guidance/resources/data-breach-response-guide-business) ·
[Cal. Civ. Code 1798.82](https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?lawCode=CIV&sectionNum=1798.82) ·
[NIST SP 800-61r3](https://nvlpubs.nist.gov/nistpubs/specialpublications/nist.sp.800-61r3.pdf) ·
`docs/obligations.md` §1 · `docs/legal/service-providers.md`

Of NIST SP 800-61r3's CSF profile, one person can genuinely perform Respond and
Recover. Detect is aspirational, per above. Govern is this page.
