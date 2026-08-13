# Coiny Terms of Service

> **DRAFT: REQUIRES ATTORNEY REVIEW BEFORE PUBLICATION.**
> PRD section 26 requires a lawyer-reviewed ToS with an accuracy disclaimer at
> first paying user; this draft exists so the attorney edits instead of starting
> from nothing, and so the accuracy disclaimer is written against the behavior
> the product actually specifies. Clauses that are legal judgment calls rather
> than factual statements are flagged inline with "Attorney note". Lawyer
> question Q5 (docs/obligations.md section 8) asks specifically whether the
> accuracy disclaimer holds up; its premise, that the app surfaces staleness, is
> requirement R-8.1/R-8.2 and is being built by a separate workstream. **Do not
> publish these terms before staleness display ships**; section 3 below is
> written to describe that behavior.

**Effective date:** not yet published
**Provider:** Athanor Works LLC, a Delaware limited liability company ("Coiny", "we").
**Contact:** coiny@athanorworks.com (Unverified: alias not yet confirmed live.)

## 1. Agreement and eligibility

By creating an account or using Coiny you agree to these terms and to the
Privacy Policy. If you do not agree, do not use Coiny.

You must be at least 18 years old and reside in the United States. You may use
Coiny only for your own personal finances (accounts you own or are authorized
to access), not for anyone else's.

## 2. What Coiny is, and is not

Coiny displays the financial information you connect or enter, computes a net
worth estimate from it, detects recurring charges, tracks goals you set, and
represents your progress through a virtual creature.

Coiny is **not**:

- **a financial adviser.** Nothing in Coiny is investment, legal, tax, credit,
  or financial advice. The app observes your own data and your own goals; it
  never recommends buying or selling any financial product or security.
- **a bank or money transmitter.** Coiny cannot move, hold, send, or receive
  money. It has read-only visibility into accounts you connect.
- **a credit reporting service.** Any credit score shown is provided by a
  third-party source for your information only.

## 3. Accuracy: the number is an estimate

This is the clause to read.

Your displayed net worth is assembled from third-party data sources, prices
that move, values you estimated yourself, and connections that can silently
break. It is an estimate, and at any given moment parts of it can be stale,
incomplete, or wrong.

Coiny's job is to be honest about that: values are labeled with when they were
last updated, self-reported values are labeled as self-reported, broken
connections are flagged for repair, and anything that cannot be fetched is
shown as excluded from the total rather than counted as zero.

You agree that:

- you will not rely on Coiny as the sole basis for any financial decision;
- balances shown in Coiny are informational, and the balance your financial
  institution reports is the authoritative one;
- market-priced values (securities, cryptocurrency, collectibles, commodities,
  property estimates, vehicle estimates) are estimates from third-party pricing
  sources and can differ from what you would actually get;
- we are not liable for decisions you make based on displayed values, or for
  errors originating in third-party data sources.

Attorney note: obligations.md section 8 Q5 asks whether this disclaimer is
effective given known failure modes. The product requirements that surface
staleness (R-8.1, R-8.2, S-16 to S-19) are the factual predicate for this
section; verify they are shipped before these terms go live.

## 4. Your account and your credentials

You sign in with Apple (or Google on Android). You are responsible for the
security of that identity and of your device.

Where you supply your own API keys (Kraken, Kalshi, Alpaca), create keys with
**read-only** permissions, as the app instructs. Do not give Coiny a key that
can trade or withdraw. We store what you give us encrypted, but you accept the
risk of supplying a key more powerful than the app needs, and you can revoke
any key at the issuing service at any time.

You agree not to: use Coiny for anyone else's accounts without authorization,
probe or disrupt the service, attempt to access another user's data, reverse
engineer the service except where law permits, or resell or scrape it.

## 5. Third-party services

Coiny depends on third-party data services (Plaid, Spinwheel, and the others
listed in the Privacy Policy). Your use of accounts connected through them may
also be governed by their terms, including Plaid's End User Privacy Policy. We
are not responsible for third-party services, and a third party withdrawing or
changing its service may reduce what Coiny can show.

Coiny is not affiliated with, sponsored by, or endorsed by any of the
third-party services it connects to, including YNAB. (Engineering note: YNAB's
API terms require this non-affiliation statement to also appear in the app near
the YNAB feature, requirement R-17.4; it is not there yet.)

## 6. Price and subscriptions

Coiny is currently free while in testing. When paid tiers launch, subscriptions
will be purchased exclusively through Apple's in-app purchase system, priced as
shown at the point of purchase, auto-renewing until cancelled in your Apple
account settings, with the full disclosure shown before you buy. Refunds are
handled by Apple. Free-tier functionality, connection repair, data accuracy,
notifications, account deletion, and the creature itself are never paywalled.

Attorney note: pricing ($99/yr Individual, $169/yr Household per PRD section
25) is deliberately not hardcoded here so the terms do not need re-review on a
price change; confirm that is acceptable or add the figures.

## 7. Intellectual property

Coiny, including the creature, its artwork, and all software, is owned by
Athanor Works LLC. You get a personal, non-transferable, revocable license to
use the app. Your financial data is yours; you grant us only the license needed
to operate the service for you, which ends when the data is deleted.

## 8. Termination

You can stop using Coiny any time and delete your account in the app, which
deletes your data as the Privacy Policy describes. We may suspend or terminate
accounts that violate these terms, abuse the service, or create risk for other
users, and we may discontinue the service with reasonable notice, in which case
these terms end and your data is deleted.

## 9. Disclaimers and limitation of liability

THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTIES OF ANY
KIND, EXPRESS OR IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR
PURPOSE, ACCURACY, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE SERVICE
WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT DISPLAYED VALUES ARE ACCURATE,
COMPLETE, OR CURRENT.

TO THE MAXIMUM EXTENT PERMITTED BY LAW, ATHANOR WORKS LLC'S TOTAL LIABILITY
ARISING OUT OF THESE TERMS OR THE SERVICE IS LIMITED TO THE GREATER OF ONE
HUNDRED DOLLARS ($100) OR THE AMOUNT YOU PAID US IN THE TWELVE MONTHS BEFORE
THE CLAIM. WE ARE NOT LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
OR PUNITIVE DAMAGES, OR FOR LOSS OF PROFITS, DATA, OR GOODWILL.

Some jurisdictions do not allow certain limitations; where they apply, the
limitation applies to the fullest extent permitted.

Attorney note: cap figure and carve-outs (gross negligence, willful misconduct,
statutory rights that cannot be waived) are judgment calls left to review.

## 10. Dispute resolution

Attorney note: obligations.md section 2 calls for arbitration and a class
waiver. The clause below is a placeholder shape, not settled language;
enforceability, the arbitration provider, fee allocation, the opt-out window,
and mass-arbitration protections all need attorney judgment.

Any dispute arising out of these terms or the service will be resolved by
binding individual arbitration rather than in court, except that either party
may bring an individual claim in small claims court. YOU AND COINY EACH WAIVE
THE RIGHT TO A JURY TRIAL AND TO PARTICIPATE IN A CLASS ACTION. You may opt out
of arbitration within 30 days of first accepting these terms by emailing us.

## 11. Governing law

These terms are governed by the laws of the State of Delaware, without regard
to conflict of law rules. (Attorney note: confirm Delaware versus the founder's
state of operations.)

## 12. Changes

We may update these terms; material changes will be presented in the app before
they take effect, and continuing to use Coiny after that is acceptance. The
current version always lives at the published terms URL.

## 13. Contact

Athanor Works LLC
coiny@athanorworks.com
