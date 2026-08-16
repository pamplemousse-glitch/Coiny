# Integration Audit: Machine-Readable Docs and Unused API Surface

Written 2026-08-16. Covers every third-party API the backend calls.

Two questions, asked of all ~35 integrations:

1. Does the vendor publish `llms.txt` or another machine-readable contract we
   are not consuming?
2. Are we calling a fraction of what the API offers, and is the missing part
   worth having?

Everything below was checked against the running vendor, not from memory.

---

## 1. `llms.txt`: ten vendors publish one, we use zero

`llms.txt` is a vendor-curated, plain-text index of their documentation, meant
to be read by a model rather than crawled. Where it exists it is strictly better
than searching the docs site, because it is the vendor's own answer to "what
should a machine know about this API".

| Vendor | URL | Size | Status |
|---|---|---:|---|
| Plaid | `plaid.com/llms.txt` | 346 KB | **live** |
| Plaid (docs) | `docs.plaid.com/llms.txt` | 27 KB | **live** |
| Alpaca | `docs.alpaca.markets/llms.txt` | 249 KB | **live** |
| TrueLayer | `docs.truelayer.com/llms.txt` | 61 KB | **live** |
| Polymarket | `docs.polymarket.com/llms.txt` | 48 KB | **live** |
| Spinwheel | `docs.spinwheel.io/llms.txt` | 19 KB | **live** |
| Zerion | `developers.zerion.io/llms.txt` | 19 KB | **live** |
| YNAB | `ynab.com/llms.txt` | 10 KB | **live** |
| Coinbase CDP | `docs.cdp.coinbase.com/llms.txt` | 8 KB | **live** |
| Helius | `www.helius.dev/llms.txt` | 4 KB | **live** |

Checked and **not** usable, recorded so nobody re-checks:

| Vendor | Result |
|---|---|
| Alchemy | `docs.alchemy.com/llms.txt` returns 200 at 472 bytes, a stub, not an index |
| Blockfrost | 404 |
| Discogs | 403 |
| Kalshi | no response |
| YNAB API host | `api.ynab.com/llms.txt` 401, the docs host is the one to use |

Note the trap: **size matters as much as status.** Alchemy's 472-byte 200 and
the OWASP MASVS checklists' 610-byte 200 both pass a status-code check and
contain nothing. Verify bytes.

Coinbase and Zerion additionally expose **MCP servers already connected to this
project**, which are a better interface than their `llms.txt` and are currently
unused for anything.

**Recommendation.** Pull the four that matter for asset depth (Alpaca, Plaid,
TrueLayer, Zerion) into `docs/context/` the way `kicksdb-openapi.json` already
is, so integration work stops guessing at endpoint shapes. Alpaca's is the
highest value because our Alpaca integration is the thinnest (section 2).

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

### HIGH: Kalshi fetches cash and ignores the positions

We call `/trade-api/v2/portfolio/balance`, which is the cash balance.
`GET /portfolio/positions` returns market positions (ticker, contract position,
market exposure, realized P&L, fees) and event positions.

For a prediction-market account the open contracts **are** the holdings. Today a
user with $0 cash and $4,000 of open Kalshi positions sees $0.

It is also internally inconsistent: the Polymarket client already calls
`/positions`. Two prediction markets, two different depths.

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

### LOW: Coinbase

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

1. **Add Alpaca `/v2/positions`.** Highest value per hour. Turns a single number
   into a real holdings list, on the axis the product competes on.
2. **Add Kalshi `/portfolio/positions`.** Fixes a case where the reported total
   can be flatly wrong, not merely shallow.
3. **Vendor `llms.txt` into `docs/context/`** for Alpaca, Plaid, TrueLayer and
   Zerion.
4. **Consider Plaid `/investments/transactions/get`** when goal pacing gets its
   next pass.
5. **A consistent `User-Agent`** across every outbound client.

Items 1 and 2 are the ones that change what a user sees.
