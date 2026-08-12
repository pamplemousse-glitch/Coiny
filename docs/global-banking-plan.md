# Coiny — Global Banking Integration Plan

*Last updated: 2026-05-28 (session 9)*

---

## Goal

Cover as much of the globe as possible with bank account connectivity, so non-US users can link their bank to Coiny the same way US users link via Plaid.

---

## Current Status

| Provider | Regions | Status | Blocker |
|---|---|---|---|
| **Plaid** | US, Canada, UK (partial), EU (partial) | ✅ Live | — |
| **TrueLayer** | UK, IE, FR, DE, ES, IT, NL, AT, BE, FI, NO, PL, PT, AU | ✅ Live (PR #154 merged) | — |
| **GoCardless Bank Account Data** (formerly Nordigen) | 31 EU countries, 2500+ banks | ❌ Blocked | New signups disabled as of May 2026 |
| **Belvo** | MX, BR, CO, AR, PE, CL | ❌ Blocked | Requires company email (no Gmail) |
| **Mono** | NG, GH, KE, ZA, EG | ❌ Blocked | Likely requires business entity |
| **Finverse** | SG, HK, PH, ID, TH, VN | ❌ Blocked | App creation returns generic error; requires business entity (confirmed) |

---

## What Unblocks the Rest

**Form an LLC + get a company email (`@coiny.app` or similar).**

This is the single blocker for Belvo, Mono, Finverse, and Plaid production. It also unblocks:
- Apple Developer Organization account (required for App Store)
- Plaid production approval (GLBA compliance review)
- Enterprise API tiers generally

Until the LLC is formed, TrueLayer is the only global banking provider accessible.

---

## TrueLayer Coverage

TrueLayer sandbox covers:
- **UK**: 30+ banks (Barclays, HSBC, Lloyds, NatWest, Monzo, Revolut, etc.)
- **EU**: Major banks in IE, FR, DE, ES, IT, NL, AT, BE, FI, NO, PL, PT
- **Australia**: Major banks via CDR

This is ~700M people. It's a good first global expansion even without the others.

---

## Supplemental: FX / Multi-Currency

When TrueLayer lands, users will have balances in GBP, EUR, AUD, etc. We need FX conversion to display everything in USD.

- **Frankfurter** (frankfurter.app) — free ECB rates, no signup, no key needed
- Build: `backend/src/fx/client.ts` → `GET https://api.frankfurter.app/latest?from=GBP&to=USD`
- Wire into TrueLayer sync to convert balance before storing `lastBalanceUsd`

---

## Priority Order

1. ✅ TrueLayer — building now
2. ⏳ Frankfurter FX — can build immediately, no key needed
3. 🔒 LLC formation → unlocks everything else
4. 🔒 Belvo (LATAM) — after LLC
5. 🔒 Mono (Africa) — after LLC
6. 🔒 Finverse (SE Asia) — after LLC
7. 🔒 GoCardless — signups disabled, revisit later

---

## Crypto / Wealth (Global, No Gating)

These are already live and work globally regardless of LLC status:

| Integration | Status |
|---|---|
| Coinbase (crypto CEX) | ✅ Live |
| Zerion (DeFi / EVM wallets) | ✅ Live |
| 12 chain wallets (BTC, ETH, SOL, ADA, XRP, XLM, ATOM, OSMO, DOGE, LTC, BCH, NEAR, APT, SUI, HBAR, DOT, TON) | ✅ Live |
| Hyperliquid (perps) | ✅ Live |
| Kraken (CEX) | ✅ Live |
| GoldAPI (metals) | ✅ Live |
| Alchemy (NFTs) | ✅ Live |
| Kalshi (prediction markets, demo) | ✅ Live |
