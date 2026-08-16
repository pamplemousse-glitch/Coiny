# Coiny Privacy Policy

> **DRAFT: REQUIRES ATTORNEY REVIEW BEFORE PUBLICATION.**
> This draft was assembled from the actual codebase (schema and API surface at the
> current worktree, 2026-08-13) so the factual claims about what is collected are
> verifiable against code. The legal judgment calls are flagged inline with
> "Attorney note". It satisfies the content requirements of Apple App Review
> guideline 5.1.1(i) and (v), Plaid's Developer Policy disclosure requirement,
> and is drafted to double as the GLBA Reg P initial privacy notice (12 CFR
> 1016.4); whether it can serve as the Reg P notice in this form is lawyer
> question Q3 in docs/obligations.md section 8.

**Effective date:** not yet published
**Who we are:** Athanor Works LLC, a Delaware limited liability company ("Coiny", "we").
**Contact:** coiny@athanorworks.com
(Unverified: this alias is not yet confirmed live; see docs/prd.md section 29. Do not publish until it receives mail.)

Coiny is an app that shows you your net worth in one number, with a creature that
reacts to your financial behavior. To do that it needs to see financial data you
choose to connect. This policy says exactly what we collect, where it goes, how
long we keep it, and how you get rid of it.

The short version:

- We collect your sign-in identity, the financial data you connect or enter, a
  push notification token, and basic usage events.
- We never sell your data, never rent it, never show ads, and never share it
  with anyone except the service providers that make the app work.
- We keep financial data while your connection is active, and we delete your
  account and its data entirely, in the app, whenever you ask.

## 1. What we collect

**Account identity.** When you sign in with Apple (or Google on Android), we
receive a stable account identifier, your email address, and, on first sign-in
only, your name. Your email is stored encrypted. We never see your Apple ID or
Google password.

**Financial account data you connect.** When you link a bank, card, loan, or
brokerage through Plaid, we receive and store: account balances, transactions
(merchant name, amount, date, category), recurring payment streams (for the
subscription-detection feature), and liability details (statement balances,
minimum payments, due dates, interest rates, overdue status). Plaid holds your
bank credentials; we never see or store them. We store an access token that lets
us read this data, encrypted with AES-256-GCM.

**Credit and debt data.** If you connect through Spinwheel, we receive your
credit score and store it, plus an identifier linking your Coiny account to
Spinwheel. To verify your identity, Spinwheel requires your phone number and
date of birth; the app sends these to Spinwheel and we do not store either one.

**Other accounts you connect.** Depending on what you link, we store encrypted
access tokens or API keys for: Coinbase, YNAB, TrueLayer (UK banks), Discogs,
Kraken, Kalshi, and Alpaca, and the balance or portfolio values we read through
them. For Kraken, Kalshi, and Alpaca you supply your own API keys; we instruct
you to create read-only keys and store what you give us encrypted.

**Assets you point us at or tell us about.** Cryptocurrency and NFT wallet
addresses (public addresses, no keys), Hyperliquid and Polymarket account
addresses, real estate street addresses, vehicle VINs, precious metal holdings,
trading cards, graded coins, sneakers, energy commodity positions, farmland
parcels, and self-reported values and notes for anything else you add manually.

**Derived financial data.** From the above we compute and store: daily net worth
snapshots, income and spending estimates, savings rate, cash runway, goal and
ladder progress, and your creature's state. Reaction history is stored encrypted
because its text can mention merchants and amounts.

**Device data.** A push notification token for your device, its platform, and
its time zone, so we can deliver notifications and avoid sending them overnight
where you are. Notifications respect a strict budget (at most
a few per week) and a log of notification event types (never their content) is
kept to enforce it.

**Subscription data.** If you subscribe, Apple tells us which plan you bought,
when it expires, and an identifier for the purchase. We store that against your
account because our server, not your phone, decides what you have access to,
which is also what lets your subscription work on every device you sign in on.
Apple is the merchant of record: we never see your card number, billing address,
or any payment detail.

**Usage data.** With your consent, we record product events like "app opened",
"account connected", or "goal completed", so we can tell whether the product
works. These events never contain dollar amounts or merchant names; monetary
values are recorded only as broad buckets. We do all of this ourselves; there is
no third-party analytics company involved.

We do not collect your location, contacts, photos, browsing history, or health
data, and the app does not track you across other companies' apps or websites.

## 2. What we use it for

One purpose: showing you your own financial picture and reacting to your own
financial behavior. Specifically: computing your net worth, detecting recurring
subscriptions, evaluating your goals and guardrails, driving the creature's
state, and sending the notifications you opted into. Usage events are used to
fix and improve the product.

We do not use your data for advertising, we do not build marketing profiles,
and we do not sell or rent it to anyone. The creature reacts to what you do,
never to market movements, and your data is never used to recommend, buy, or
sell any financial product.

## 3. Who your data goes to

We share data only with the service providers needed to run Coiny, only what
each one needs. They are contractually limited to providing their service.

**Infrastructure (they hold data so the app can run):**

| Provider | What they do | What they hold |
|---|---|---|
| Neon | Database hosting (United States) | All stored data described above, with tokens, keys, email, and reaction history encrypted at the field level before they are written |
| Fly.io | Application hosting (Ashburn, Virginia, United States) | Data in transit through our servers; configuration secrets |
| Apple | Sign in with Apple, push notification delivery, and payment processing if you subscribe | Your Apple identity; push tokens; purchase records (we never see payment card details) |
| Google | Sign-in verification on Android | Your Google identity |

**Financial data sources (they process data for accounts you choose to connect):**

| Provider | Sent to them | Received from them |
|---|---|---|
| Plaid | Your bank login happens on Plaid's own screens; we send only our access token | Balances, transactions, liabilities, recurring streams |
| Spinwheel | Phone number and date of birth (identity verification, not stored by us) | Credit score, debt details |
| Coinbase, YNAB, TrueLayer, Discogs | OAuth authorization you grant on their screens | Balances and holdings |
| Kraken, Kalshi, Alpaca | The API keys you supply | Balances and holdings |
| Zerion | Wallet addresses you add | Wallet balances |

**Pricing and valuation services (they receive an identifier for an asset, not
your identity):** blockchain data providers (Alchemy, Helius, Subscan,
Blockfrost, TonCenter, Blockstream, BlockCypher, and public network nodes)
receive wallet addresses; Polymarket and Hyperliquid receive account addresses;
RentCast receives property addresses you add; MarketCheck receives vehicle VINs
you add; KicksDB, PCGS, TCGapi, PokemonPriceTracker, GoldAPI, EIA, and USDA
receive product identifiers (a shoe SKU, a coin number, a card name) that are
not tied to you; Frankfurter provides currency rates and receives nothing about
you.

Attorney note: wallet addresses, property addresses, and VINs are pseudonymous
but potentially re-identifiable; we have treated them as personal data
throughout. Confirm this framing is sufficient for the pricing-vendor section.

We may also disclose data if the law requires it (for example a valid subpoena),
or as part of a merger or acquisition, in which case this policy would continue
to apply to data collected under it.

That is the complete list. There are no data brokers, ad networks, or analytics
vendors.

## 4. How long we keep it

Full schedule with per-category periods: see our data disposal schedule
(docs/legal/data-disposal-schedule.md; summarize in the published version).
The rules that matter:

- Financial data for a connected account is kept while the connection is active,
  plus 90 days after you disconnect it, then deleted.
  (Attorney note and open decision B7: the 90-day figure is a proposal, chosen
  well under the two-year regulatory ceiling; confirm before publication.)
- Usage events are kept for 12 months.
- If your account goes completely unused, we delete customer information no
  later than two years after your last activity, as federal safeguards rules
  require, and in practice sooner per the disposal schedule.
- When you delete your account, everything is deleted immediately (see below).

## 5. Deleting your account, and your choices

**Delete everything.** Settings > Delete account. This deletes your account and
all data described above from our systems immediately, and revokes our access
upstream everywhere a provider offers a way to do it: Plaid, TrueLayer, and
Spinwheel, where deletion also removes the identity record behind your credit
data. It cannot be undone.

**Backups.** Deleted data can persist in our encrypted backups for up to 30
days after deletion, after which it is gone from those too. Backups are never
used to restore a deleted account.

**Disconnect one account.** Every connected account can be disconnected
individually in the app, which deletes its stored credentials on our side.

**Revoke access at the source.** Some providers give us no way to end your
authorization on your behalf. For those, revoke it yourself in the provider's
own security settings, and do it after deleting your account:

- **Kraken, Kalshi, Alpaca.** You created an API key and gave it to us. Delete
  that key in the provider's dashboard. These are the connections where a key
  can carry trading permissions, so they matter most.
- **YNAB, Discogs.** Neither offers an endpoint that lets an app revoke its own
  grant; revoke Coiny from your account settings there.

(Engineering note R-15.6: TrueLayer and Spinwheel revocation are built and run
automatically on deletion, so neither appears in this list. Coinbase is not
listed either: today the connection uses a developer key of ours rather than an
authorization of yours, so there is nothing at Coinbase for you to revoke. If a
Coinbase OAuth flow ships, it belongs in one of these two groups.)

**Push notifications.** Turn them off in iOS Settings at any time; the app works
without them.

**Usage data.** You can turn off usage event collection in Settings at any time.

**Correct or view your data.** Everything we hold about you is visible in the
app itself; that is the product. For anything else, email us.

## 6. How we protect it

Access tokens, API keys, your email, and reaction history are encrypted with
AES-256-GCM before they touch the database, and the encryption key is stored
separately from the data, with a different vendor. All traffic uses TLS. Your
session token is stored only as a hash on our side and in the iOS Keychain on
your device. We log event types and pseudonymous identifiers, never merchant
names, amounts, or email addresses. Coiny is operated under a written
information security program as required by the FTC Safeguards Rule.

No system is perfectly secure, and we cannot guarantee absolute security. If a
breach affects your data, we will notify you and regulators as the law requires.

## 7. Your privacy rights

Coiny is currently offered in the United States only.

We do not sell or share personal information as those terms are defined in the
California Consumer Privacy Act, and we do not use it for cross-context
behavioral advertising. Depending on your state, you may have rights to access,
correct, or delete your personal information; the in-app deletion and the
visibility of your own data in the app are how we honor them, and you can email
us for anything the app does not cover.

Attorney note: Coiny is currently below every state privacy law's applicability
threshold (see docs/obligations.md section 7). This section is deliberately
minimal; expand it when a threshold approaches or if the attorney prefers to
state rights affirmatively now.

As a financial data aggregator, we are subject to the Gramm-Leach-Bliley Act.
This notice describes our information practices as required by Regulation P. We
share nonpublic personal information only as permitted by law, with the service
providers described above; we do not share it with nonaffiliated third parties
for their own use, so there is nothing for you to opt out of.

## 8. Children

Coiny is not directed at children and is not for anyone under 18. We do not
knowingly collect data from anyone under 18; if we learn we have, we will delete
it. (Attorney note: 18 chosen because financial account aggregation is an adult
activity; confirm versus a 13+ COPPA-only line.)

## 9. Changes

If we change this policy, we will update it here and, for material changes,
tell you in the app before they take effect. We will never retroactively expand
what we do with data you already gave us without asking.

## 10. Contact

Athanor Works LLC
coiny@athanorworks.com

---

*Draft notes, remove before publication:*
*1. The provider lists above were enumerated from `backend/src/api/`,*
*`backend/src/db/schema.ts`, and `backend/src/config.ts`, not from memory.*
*Steam and SnapTrade were removed from the codebase 2026-08-12 and are*
*deliberately absent. RentCast and MarketCheck have code paths but no API keys*
*configured today; they are included because the code will send data the moment*
*a key is set.*
*2. Discogs collection values are currently never displayed (PRD R-17.3); the*
*Discogs row is kept because the OAuth connection and collection sync exist.*
*3. The usage-data section presumes the PRD section 24 telemetry pipeline and*
*its consent line ship in the same build as this policy. If telemetry does not*
*ship, keep the section; it will simply be dormant.*
