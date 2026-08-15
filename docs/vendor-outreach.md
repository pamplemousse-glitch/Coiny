# Vendor outreach drafts

Four emails. Send from an @athanorworks address, not gmail: for the Discogs one in
particular, the request is being judged on whether you look like a company.

All four say the same true thing in different words: Coiny displays a user's own
holdings back to them as one net worth number. It does not redistribute price data,
does not run a marketplace, and does not let anyone browse or export a catalogue.
That distinction is what every one of these terms actually cares about.

Attribution note: `docs/prd.md` R-17.3 requires that if Discogs ever says yes, three
things ship together, not one: the value, both attribution strings, and the six-hour
display-staleness rule. The staleness rule needs the scheduler, which is in flight
tonight. Do not re-enable vinyl on a "yes" alone.

---

## 1. Discogs, commercial permission for Restricted Data

To: the address on https://support.discogs.com (Developers / API support)
Subject: Written permission request: commercial use of marketplace price data

Hello,

I am writing to request written permission for commercial use of Discogs marketplace
price data, as required by the Restricted Data terms.

I am the founder of Athanor Works LLC, a Delaware company. We are building an iOS app
called Coiny that shows an individual their complete net worth in one number. A user
who owns records can connect their own Discogs collection, and we value it as part of
that total.

Specifically what we would do with the data:

- Apply price data only to releases already in the authenticated user's own collection.
- Display a single aggregate value to that one user. No per-release prices are shown.
- Never display any figure older than six hours, per the Restricted Data terms.
- Attribute Discogs on every screen where a Discogs-derived value appears.
- Never redistribute, resell, export, or expose price data through our own API.

What we would not do: no marketplace, no price lookup for records the user does not
own, no browsable catalogue, no bulk access, no advertising against the data.

The app is pre-launch. It will be a paid subscription, which is why I am asking rather
than assuming the non-commercial allowance covers us. Until permission is granted we
have disabled Discogs valuation entirely: vinyl is currently a manually entered figure
and no Discogs price data reaches a user.

Happy to provide a build, a technical description of the integration, or company
documentation.

Thank you,
Antoine Wiley
Founder, Athanor Works LLC

---

## 2. TCGapi, commercial licensing

To: their support or licensing address
Subject: Commercial use inquiry, single-user portfolio valuation

Hello,

I would like to confirm whether our use of your API falls within your commercial terms,
and what licence we need if it does not.

Athanor Works LLC is building Coiny, an iOS app that shows one person their total net
worth. Users who collect trading cards can list the cards they own, and we use market
price data to value that collection as one line in their total.

Our usage pattern:

- Requests are scoped to cards an individual user has told us they own.
- The output is an aggregate dollar figure shown to that one user.
- No price data is redistributed, cached for resale, or exposed through any API of ours.
- No marketplace, no price-checking tool, no public browsing.

We are pre-launch and currently on your free tier. The app will be a paid subscription,
so I would rather move to the correct licence now than discover later that we were on
the wrong one.

Could you tell me which tier or agreement fits, and the pricing?

Thank you,
Antoine Wiley
Founder, Athanor Works LLC

---

## 3. PokemonPriceTracker, commercial licensing

Same as email 2, with the product name swapped. Send both: the two vendors overlap in
coverage, and if only one comes back with workable terms you can drop the other rather
than paying twice for the same numbers.

---

## 4. YNAB, unrestricted review

To: api@ynab.com
Subject: Unrestricted access review request

Hello,

I would like to request a review for unrestricted API access.

Athanor Works LLC is building Coiny, an iOS app that shows an individual their complete
net worth. YNAB is one of the account sources a user can connect. We read budget and
account balances for the authenticated user and include them in that user's own total.
We do not write to YNAB, and we do not share YNAB data with anyone other than the user
it belongs to.

We are pre-launch, moving to a paid subscription at launch, which is what puts us over
the rate limits on the default tier.

What do you need from us for the review?

Thank you,
Antoine Wiley
Founder, Athanor Works LLC

---

## Send order

1. Discogs first. It is the only one currently suppressing a shipped feature, and
   written permission has the longest turnaround.
2. YNAB second. `docs/prd.md` §26 makes it a first-paying-user gate, so it has a real
   deadline.
3. The two card vendors last. Both are free-tier-now, and a paid launch is what makes
   them urgent, not TestFlight.
