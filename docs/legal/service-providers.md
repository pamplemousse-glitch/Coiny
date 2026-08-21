# FTC Safeguards Rule: Service Provider Oversight List

Written service-provider oversight record required by 16 CFR 314.4(f).
Maintained by the Qualified Individual (`safeguards-qualified-individual.md`).
Enumerated from the codebase (`backend/src/config.ts`, `backend/src/api/*`,
`backend/src/db/schema.ts`) on 2026-08-13, so this list matches what the code
actually calls, not what anyone remembers integrating.

314.4(f) requires: selecting providers capable of maintaining appropriate
safeguards, requiring those safeguards by contract, and periodically assessing
them. For a solo operator, "contract" means the provider's standard terms/DPA
(none of these vendors negotiates), and "periodic assessment" means the annual
review documented in the last column. Review cadence: annually, and at every
provider added or removed. Next review due: before the first real bank
connection, then 12 months after.

## Tier 1: hold or transmit customer information (real oversight matters)

| Provider | Service | Customer information they touch | Safeguard basis | Annual check |
|---|---|---|---|---|
| Neon | Postgres hosting (US) | All stored data; tokens/keys/email/reactions are field-encrypted before write, so Neon holds ciphertext for the sensitive fields, plaintext for transactions | SOC 2 report; standard DPA | MFA on account; DPA still current; region still US |
| Fly.io | App hosting (iad, US) | All data in transit; env secrets including the data encryption key | SOC 2; standard terms | MFA on account; secrets inventory review |
| Plaid | Bank data aggregation | Bank account data end to end; holds bank credentials so we never see them | Plaid Developer Policy (binds both directions); production review | MFA on dashboard; webhook signature verification still enforced in code |
| Spinwheel | Credit/debt data | Phone number + date of birth (passthrough), credit score, debt details | Developer Policy + End User Agreement (Unverified: text not yet read; blocked at spinwheel.io/legal, read in a browser before production use) | Read the policy; confirm FCRA posture (lawyer Q8) |
| Apple | Sign in with Apple, APNs, TestFlight, IAP later | Apple identity, push tokens, later purchase records | Apple Developer Program License Agreement | MFA on developer account; org enrollment status |
| Google | Sign-in verification (Android) | Google identity token | Google API Terms | MFA on account |
| TrueLayer | UK bank data (sandbox only today) | OAuth tokens, UK balances; end user contracts with TrueLayer directly | TrueLayer terms (client-side terms Unverified, in console) | Do not enable live before obligations Q2 answered |
| Coinbase, YNAB, Discogs | OAuth-connected balances | Per-user OAuth tokens (stored encrypted our side), balances | Each provider's developer terms | Scopes still minimal read-only; YNAB non-affiliation footer; YNAB unrestricted review before 26th user |
| Kraken, Kalshi, Alpaca | User-supplied API keys | Balances via user's own keys (stored encrypted our side) | User's own account terms; our read-only-key instruction | Key-permission rejection (R-17.1) status; developer-agreement reads still owed (obligations section 4) |
| Zerion | Wallet balances | Wallet addresses (user-supplied, public data) | Zerion API terms | Rate/plan review |

## Tier 2: receive asset identifiers, not identity (oversight is light by design)

These vendors receive a query (a wallet address, a street address, a VIN, a
product identifier) with no name, email, or account linkage beyond our server
being the caller.

| Provider(s) | What they receive |
|---|---|
| Alchemy, Helius, Subscan, Blockfrost, TonCenter, Blockstream, BlockCypher, public chain nodes (Cosmos, Osmosis, Aptos, Sui, Stellar, Hedera, NEAR, XRPL), Hyperliquid, Polymarket | Wallet/account addresses |
| RentCast (key not yet configured) | Property street addresses |
| MarketCheck (key not yet configured) | Vehicle VINs |
| KicksDB, PCGS, TCGapi, PokemonPriceTracker, GoldAPI, EIA, USDA NASS | Product identifiers only |
| Frankfurter | Nothing user-related (FX rates) |

Annual check for Tier 2: the one-hour ToS pass owed before paid launch
(PRD section 17), prioritizing vendors whose data renders as a dollar value.

## Tier 3: receive no customer information at all

One entry, and the tier exists because it genuinely fits neither of the two
above: Sentry receives nothing about a customer, not even the pseudonymous
identifiers Tier 2 vendors get.

| Provider | Service | Customer information they touch | Safeguard basis | Annual check |
|---|---|---|---|---|
| Sentry | Backend error monitoring (US) | **None by design.** Error type, programmatic error code, stack frame filenames and line numbers within our own code, and the route path. No user id, no item id, no request, no headers, no query string, no body, no breadcrumbs, no vendor response text, no local variables, no source lines, no dependency inventory | Standard DPA; SOC 2. Enforced in code by `backend/src/observability/sentry.ts` `beforeSend`, not by configuration | Re-read `tests/sentry.test.ts` still passes; confirm no new SDK integration re-attached request data; confirm DPA current |

**Why the claim is auditable rather than asserted.** The scrubber is a hard
gate every event passes through before transmission, chosen over Sentry's
server-side scrubbing because server-side scrubbing runs after the data has
arrived. It imports the same `FORBIDDEN_KEYS` list pino redacts on, so the two
controls cannot diverge, and it adds user and item identifiers on top, which
pino is permitted to write and Sentry is not. `tests/sentry.test.ts` asserts
that an institution name, an OAuth authorization code, a wallet address and an
access token each fail to appear anywhere in a serialised event.

**Known limit, stated rather than glossed.** A stack trace is generated code we
do not fully control, and a future frame could in principle carry a value its
author did not anticipate. Local variables, source lines and the message are
each dropped or rebuilt, which closes the known routes. This is a residual
risk, not a closed one.

**Correction, 2026-08-21, same day.** The first version of this row overstated
the controls. Sentry integrations are disabled by matching their NAME, and two
of the five names were wrong (`LocalVariables` is really `LocalVariablesAsync`;
`Fastify` is not a default integration), so those filters did nothing. It also
disabled `Http` while every vendor client here calls out through `fetch`, which
is a different integration (`NodeFetch`), and it left `ContextLines` enabled,
which reads the source file around each frame, and `Modules`, which sends the
dependency inventory.

No customer data was exposed: the second control caught all of it, since
breadcrumbs were dropped wholesale, spans were never sent, and local variables
were deleted in `beforeSend`. Source lines and the module list were reaching
the event and are now dropped by both controls.

The durable fix is not the corrected names. It is that `tests/sentry.test.ts`
now asserts every name in the disable list exists among the SDK's own
defaults, so a rename in a future SDK version fails a test instead of silently
re-enabling collection. A control that is present in source and absent in
effect is the exact failure shape `docs/connection-resilience-survey.md`
exists to describe, and it was reproduced here while writing the thing that
describes it.

**Scope.** Backend only. The iOS app sends nothing to Sentry. Crash reporting
on device is runbook G3.10 (MetricKit), which is an Apple system framework and
adds no vendor. The Apple privacy nutrition labels are therefore unaffected by
this entry; confirm that reading before the first submission.

## Removed providers (do not re-add without re-reading their terms)

Steam, SnapTrade: removed from the codebase 2026-08-12 (register DR-8). Any
historical SnapTrade end-user data obligations died with the integration; no
production users ever existed.

## Change log

- 2026-08-13: initial list, enumerated from code.
- 2026-08-21: added Sentry under a new Tier 3. Resolves the unreconciled
  decision recorded in `launch-gap-analysis.md` section 9, which required that
  Sentry be either declined or adopted completely, with the DPA, this row, a
  privacy-policy sentence and the scrubbing config in one change.
