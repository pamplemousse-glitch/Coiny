# Crypto Pricing Atlas

*Researched 2026-08-19. Section 6 of the sweep in `asset-api-atlas-2026-08.md`,
which deliberately skipped crypto because `global-integration-map.md` §0 rates
that layer "Best. Chains are borderless, no permission needed" and calls it
"genuinely complete".*

**That claim does not hold, and this file exists because it was accepted rather
than tested.** The gap is not chain coverage, which is genuinely good. It is
what happens to a token once we have its balance.

---

## 1. The finding that produced a bug fix

Token prices resolve through **one** source: `coinbase/client.ts getSpotPrices`.
There is no CoinGecko, DexScreener, Birdeye, Moralis or DefiLlama integration.
Coinbase prices what Coinbase lists, and a meme coin is not on Coinbase.

Two call sites turned "no price" into **zero**:

- `api/chain-wallets.ts` persisted that zero over the last known balance. And
  `getSpotPrices` never throws (its contract is "symbols that fail are
  omitted"), so a Coinbase outage returns an empty map and **all sixteen chains
  would have been written to zero at once**, with no error anywhere.
- `networth/refresh.ts` showed the position at $0, which reads as "this is
  worthless" rather than "we could not price this".

Both fixed in the same PR as this research. The rule now matches what the
Hyperliquid client already did: an asset with no price is excluded or left
stale, never valued at zero.

**This remains the shape of the risk.** Any new pricing path must answer "what
happens when the price is missing" before it is wired.

---

## 2. The three gaps, in order of how much they distort a number

### 2.1 No liquidity signal anywhere. This is the big one.

Zerion, Alchemy and Helius return a USD value per position. None exposes pool
depth or price impact. So a meme coin sitting in a $500 liquidity pool with a
$2M nominal market cap contributes its full nominal value to the user's net
worth, and nothing flags that the holder could never realise it.

This matters more than coverage: a missing token is a visible absence, a
fantasy valuation is an invisible lie. It is also the exact shape of lawyer
question Q5 in `obligations.md` §8, which asks whether an accuracy disclaimer
holds when we already know specific failure modes make the number wrong.

**No vendor solves this for us.** Moralis ships a toggle to exclude spam,
low-liquidity and inactive tokens from a wallet total, which is the closest
thing to an industry practice and is itself an admission that raw
price x quantity is unreliable. How Coiny *displays* a discounted or flagged
holding is a product decision, not a vendor default.

### 2.2 Spam filtering covers only the Zerion leg

Zerion has `is_trash` / `filter[trash]=only_non_trash` for EVM and Solana, and
we already pass it. The ~15 direct chain reads (Cosmos, Cardano, XRPL, TON,
Bitcoin, Polkadot and the rest) have **no spam filter at all**. Every wallet
accumulates airdropped junk, and on those chains it is unfiltered.

### 2.3 Chain gaps

Confirmed **already covered** by Zerion, so no work needed: Base, Arbitrum,
Optimism, Blast, Avalanche, Polygon, BSC, Berachain, Monad, plus Solana.

Genuinely missing: **Litecoin, Dogecoin, Tron, Tezos, Algorand, Filecoin, Sei,
Injective, Celestia**.

- **Tron is contradictory across the vendor's own sources.** Zerion's blog says
  Tron went live 2026-01-08; a docs fetch characterised Zerion as EVM + Solana
  only. **Call `GET /chains` before building either way.** If not covered,
  TronGrid is self-serve (free tier ~100,000 req/day at 15 QPS). Material:
  roughly $80B of circulating stablecoins.
- **Monero is impossible, not missing.** Ring signatures and stealth addresses
  mean no third party can read a balance from a public address. The only paths
  are the user's own view key or manual entry. No provider changes this; record
  it as permanent.
- Injective, Celestia and Sei are Cosmos-SDK chains and should follow the LCD
  pattern already used for Cosmos and Osmosis, so they are cheap extensions
  rather than new subsystems. Tezos has a free open indexer (TzKT).

---

## 3. Pricing providers, ranked for a bootstrapper

| Provider | Prices DEX-only tokens? | Free tier | Commercial use on free tier |
|---|---|---|---|
| **DexScreener** | Yes, within minutes of pool creation | Free, **no key**, 60 req/min | **Permitted**, except building a competing product |
| **GeckoTerminal** | Yes, 200+ networks | Free, 10 calls/min | Unverified |
| **DefiLlama** | Yes, CEX+DEX aggregated | Free, no auth | Redistribution terms unverified |
| **Jupiter** | Yes, Solana only | Free, public | Not formally verified |
| **Moralis** | Yes, plus spam/low-liquidity exclusion | 40,000 CU/day | Unverified for production |
| **Birdeye** | Yes, Solana-native | Exists, caps unconfirmed | Unverified |
| CoinGecko | Curated listings, not long tail | Demo 10k/mo | **Not licensed for commercial use** |
| CoinMarketCap | Curated listings | Basic 15k credits/mo | **Personal use only** |
| Pyth | ~2,853 curated feeds, not long tail | — | **Mandatory paid key from 2026-08-26** |

**Recommendation: DexScreener.** It is free, needs no key, permits commercial
use, and returns `liquidity.usd`, `fdv`, `marketCap` and `pairCreatedAt` in the
same call, which means it answers §2.1 and §1 together. Nothing else on the
list does both.

Pair it with **GoPlus Security** (free) for honeypot and contract-risk flags,
which fills §2.2 without depending on Zerion.

---

## 4. Holdings we may not reach

- **CEX beyond Coinbase and Kraken:** Binance, Bybit, OKX, KuCoin, Gemini and
  Crypto.com all support self-serve read-only API keys with no entity gate.
  This is connector work, not an access problem.
- **Bitcoin by xpub:** BlockCypher supports xpub natively, so a whole wallet
  can be read rather than address by address. Whether the Blockstream Esplora
  client we already use supports xpub is unverified.
- **EigenLayer native restaking** is a known blind spot for every wallet
  scanner: some protocols track deposits in internal accounting rather than
  minting a visible token, so no balance scan can see them. Do not assume
  coverage; test the specific protocol.
- **Concentrated-liquidity LPs** (Uniswap V3 style) are NFTs, not fungible
  balances, and need position-aware logic rather than a token scan.
- **Aave/Compound debt:** aTokens and cTokens scan as ordinary ERC-20s, but
  whether Zerion nets borrowing as a liability rather than double-counting it
  as an asset is **unverified**. This compounds the open `borrowed` question
  already recorded in `zerion/client.ts`.

---

## 5. NFT valuation

Floor price is the wrong number for an illiquid collection, and it is what we
use. **Reservoir shut down 2025-10-15**, so that route is closed. NFTGo has an
appraisal-style estimate (`GoPricing`) with a free tier, which is the direct
answer. OpenSea has no clear self-serve tier. Alchemy, which we already use,
gives floor price plus spam classification but not an appraisal.

---

## 6. Dead ends and prohibitions

| Thing | Status |
|---|---|
| **Zapper** | Shut down entirely, API included, 2026-08-03 |
| **Reservoir** | Shut down 2025-10-15 |
| **CoinMarketCap Basic** | Personal use only; commercial needs a paid tier |
| **CoinGecko Demo** | Not licensed for commercial or production use |
| **Pyth** | Mandatory paid key from 2026-08-26, and curated rather than long tail |
| **Monero** | Protocol-level privacy. No API can ever solve it |
| **DexScreener** | Free and commercial-friendly, but bars building a directly competing product. Coiny is not one; read the terms once anyway |

---

## 7. What is unverified

Recorded so the next reader does not mistake research for observation.

- Whether Zerion covers Tron. The vendor's blog and docs disagree.
- Whether Zerion nets Aave/Compound borrowing as a liability.
- Free-tier caps for Birdeye, and commercial terms for GeckoTerminal, DefiLlama
  and Moralis.
- Whether Blockstream's Esplora supports xpub.
- Codex/Defined.fi's coverage claims are the vendor's own, untested.
- Nothing here has been checked against a live wallet holding an actual meme
  coin. That single test would settle more than any further reading.
