# Integration Audit: Machine-Readable Docs and Unused API Surface

Written 2026-08-16. Covers every third-party API the backend calls.

Two questions, asked of all ~35 integrations:

1. Does the vendor publish `llms.txt` or another machine-readable contract we
   are not consuming?
2. Are we calling a fraction of what the API offers, and is the missing part
   worth having?

Everything below was checked against the running vendor, not from memory.

---

## 1. `llms.txt`: seventeen vendors publish one, now vendored

`llms.txt` is a vendor-curated, plain-text index of their documentation, meant
to be read by a model rather than crawled. Where it exists it is strictly better
than searching the docs site, because it is the vendor's own answer to "what
should a machine know about this API".

**All seventeen are now vendored into `docs/context/vendor-llms/`** (912 KB), so
integration work reads the vendor's own index instead of guessing at endpoint
shapes. Refresh them by re-running the URLs below.

| Vendor | URL | Size |
|---|---|---:|
| Plaid | `plaid.com/llms.txt` | 346 KB |
| Alpaca | `docs.alpaca.markets/llms.txt` | 249 KB |
| TrueLayer | `docs.truelayer.com/llms.txt` | 61 KB |
| Polymarket | `docs.polymarket.com/llms.txt` | 48 KB |
| **Kalshi** | `docs.kalshi.com/llms.txt` | 45 KB |
| Plaid (docs) | `docs.plaid.com/llms.txt` | 27 KB |
| **Alchemy** | `www.alchemy.com/llms.txt` | 24 KB |
| **Hyperliquid** | `hyperliquid.gitbook.io/llms.txt` | 21 KB |
| Spinwheel | `docs.spinwheel.io/llms.txt` | 19 KB |
| Zerion | `developers.zerion.io/llms.txt` | 19 KB |
| **PokemonPriceTracker** | `www.pokemonpricetracker.com/llms.txt` | 11 KB |
| YNAB | `ynab.com/llms.txt` | 10 KB |
| Coinbase CDP | `docs.cdp.coinbase.com/llms.txt` | 8 KB |
| Helius | `www.helius.dev/llms.txt` | 4 KB |
| **Kraken** | `docs.kraken.com/llms.txt` | 4 KB |
| **TCGapi** | `tcgapi.dev/llms.txt` | 4 KB |
| **GoldAPI** | `www.goldapi.io/llms.txt` | 3 KB |

The six in bold were missed on the first pass **because the hostname was
guessed rather than looked up.** `trading.kalshi.com` does not resolve at all,
and reporting "no llms.txt" from that is a failure of method, not a fact about
Kalshi. If a vendor appears to have none, try the docs subdomain, the apex, and
`www.` before concluding anything.

Checked and genuinely **not** usable, recorded so nobody re-checks:

| Vendor | Result |
|---|---|
| Alchemy (docs host) | `docs.alchemy.com/llms.txt` returns 200 at 472 bytes, a stub. `www.alchemy.com` is the real one |
| Frankfurter | 200 at 953 bytes, a stub |
| Blockfrost | 404 |
| Discogs | 403 |
| YNAB API host | `api.ynab.com/llms.txt` 401, the docs host is the one to use |

Note the trap: **size matters as much as status.** Alchemy's 472-byte 200 and
the OWASP MASVS checklists' 610-byte 200 both pass a status-code check and
contain nothing. Verify bytes.

Coinbase and Zerion additionally expose **MCP servers already connected to this
project**, which are a better interface still.

---

## 2. Data left on the table

Ranked by what it costs us. Each verified against the vendor's own reference.

### HIGH: Alpaca returns one number when it could return the portfolio

We call exactly one endpoint, `/v2/account`, and read exactly one field:

```ts
// src/alpaca/client.ts
const res = await fetch(`${baseUrl(env)}/v2/account` ...)
return parseFloat(account.equity);   // total account equity, and nothing else
```

`GET /v2/positions` returns per-symbol `symbol`, `qty`, `market_value`,
`unrealized_pl` and `asset_class`, and is a separate endpoint from
`/v2/account`.

So a user's brokerage shows up in Coiny as a single opaque figure while the API
is offering the individual holdings for one more call. Given that asset depth is
the stated differentiator against Kubera, this is the clearest gap in the whole
integration surface.

### HIGH: Kalshi drops the cash balance

An earlier draft of this file said Kalshi ignores positions and that a user
with $0 cash and $4,000 of positions would see $0. **That was wrong, and it was
wrong in the opposite direction.** Reading the endpoint contract rather than
guessing from the endpoint name gives the real defect.

`GET /portfolio/balance` returns both figures, and they are additive:

| Field | Meaning |
|---|---|
| `balance` | available cash, in cents |
| `portfolio_value` | current value of the positions held, in cents |

`src/kalshi/client.ts` reads them as alternatives:

```ts
const cents = body.portfolio_value ?? body.balance ?? 0;
```

`portfolio_value` is a required field, so it is effectively always present and
**`balance` is never counted**. A user with $1,000 cash and $500 of positions is
reported as $500. Their cash disappears from net worth entirely.

Separately, `GET /portfolio/positions` gives per-market detail (ticker, contract
position, market exposure, realized P&L, fees) and per-event detail, which the
Polymarket client already fetches for its side. Two prediction markets, two
different depths.

### MEDIUM: Plaid investment transactions are unused

Thirteen Plaid endpoints are wired, including `/investments/holdings/get`,
`/liabilities/get`, `/transactions/sync` and `/transactions/recurring/get`. That
is good coverage.

`/investments/transactions/get` is the notable absence: it is buys, sells and
contributions inside a brokerage. The goal system's pacing math (`actualRunRateUsd`,
`contributionHistoryDays`) currently has to infer contributions from cash leaving
a checking account, and cannot see money moved inside a brokerage at all.

### FIXED IN THIS PASS: Kraken silently dropped balances

Three real defects in `src/kraken/client.ts`, all of which under-reported net
worth without erroring:

1. **Tokenized assets vanished.** The suffix pattern was `/\.(S|M|B|F)$/`.
   Kraken also issues `.T` (tokenized), so an `ETH.T` balance normalized to
   `ETH.T`, failed the spot-price lookup, and was dropped with only a
   `console.warn`. The comment also mislabelled `.M` as margin and `.F` as
   futures; they are opt-in rewards and automatically earning.
2. **EUR was converted at a hardcoded `1.08`.** A constant in a net worth total
   is a wrong number presented as a real one, and it drifts every day. The repo
   already has an FX client (`src/fx/client.ts`, used by TrueLayer).
3. **Five fiats were dropped entirely.** `ZGBP`, `ZCAD`, `ZJPY`, `ZAUD` and
   `ZCHF` were in neither the asset map nor the EUR branch, so they fell through
   to the crypto spot-price lookup and were excluded.

All three are fixed, with `tests/kraken-balance.test.ts` covering each.

### FIXED: Hyperliquid counted perps and ignored spot entirely

`src/hyperliquid/client.ts` called only `clearinghouseState`, which is the
**perps** account. Hyperliquid's `spotClearinghouseState` returns the address's
token balances, and nothing read it. An address holding spot tokens had them
counted nowhere: no error, no warning, simply absent from net worth.

Spot balances are now fetched alongside and priced from `allMids`, with USDC
taken at $1 as the quote asset. A token with no mid is **excluded** rather than
valued at zero, because counting it as zero is the same silent understatement
the fix exists to remove. A spot failure leaves the perps figure intact rather
than zeroing the whole account.

One trap worth recording: the sum reached a `numeric` column via `.toString()`,
so a `NaN` did not throw, it stored **NULL**. That turns "we could not price one
token" into "this account is worth nothing". Both terms are now coerced.

### FIXED: Coinbase discarded funds on hold

`src/networth/refresh.ts` summed `available_balance` alone. Coinbase accounts
also carry `hold`, documented as "amount that is being held for pending
transfers against the available balance". It is still the user's money, and the
Zod schema did not even parse the field, so the refresh path could not have used
it. Any account with a transfer in flight was understated, and an account whose
entire balance was on hold contributed nothing at all.

### The pattern

Four integrations, four instances of the same defect: **Kraken, Kalshi,
Hyperliquid and Coinbase each read one part of a balance the vendor splits into
several**, and each understated net worth with no error to show for it. Kalshi
even had a test defending its version.

The shape is always the same. A vendor separates cash from positions, available
from held, spot from perps, or staked from liquid. The client reads the field
whose name sounds like the total. Nothing fails, so nothing is noticed.

**When adding or reviewing any balance integration, the question to ask is not
"does this endpoint return a total" but "what else does this vendor split the
balance into".** Reading the endpoint contract answers it; reading the endpoint
name does not.

### LOW: Coinbase account list

`/api/v3/brokerage/accounts` and `/portfolios` are called, which is the account
and portfolio list. Worth a look at whether per-portfolio breakdown adds
anything, but nothing is obviously missing.

---

## 3. robots.txt and terms compliance

**No violations found.**

`robots.txt` governs crawlers, not API clients, and every integration here talks
to an official, authenticated API rather than scraping HTML. The rule does not
attach.

Where a vendor's terms impose a client obligation, we meet it:

- **Discogs** requires a descriptive `User-Agent` on every request. `src/discogs/client.ts`
  sets one on all six call sites.
- **KicksDB** sets `User-Agent: Coiny/1.0`.

Coinbase, Kraken, Alpaca, Kalshi, Polymarket, PCGS, TCGapi and PokemonPriceTracker
send no `User-Agent`. None of them require one, so this is not a finding, but
setting a consistent identifying agent across all clients is cheap and makes us
a better citizen when a vendor is debugging traffic.

---

## 4. What to do

1. ~~Vendor every `llms.txt`~~ **done**, all seventeen are in
   `docs/context/vendor-llms/`.
2. **Fix the Kalshi cash drop and add `/portfolio/positions`.** The cash drop is
   a wrong number, not a shallow one.
3. **Add Alpaca `/v2/positions`.** Turns a single opaque figure into a real
   holdings list, on the axis the product competes on.
4. **Consider Plaid `/investments/transactions/get`** when goal pacing gets its
   next pass.
5. **A consistent `User-Agent`** across every outbound client.

Items 2 and 3 are the ones that change what a user sees.
