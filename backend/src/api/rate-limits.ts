// Per-route rate limits for the routes whose cost is not paid in CPU.
//
// The global limiter (server.ts) is 100 requests per second per session. That
// is the right shape for reads served out of Postgres and the wrong shape for
// anything that fans out to a vendor: at 100/s one client loop legally issues
// 6,000 refreshes a minute, each of which is 16 outbound vendor requests
// normally and up to 84 once retries and Zerion's poll loops multiply through,
// including a per-call-billed Plaid Balance request. Part 1 row 1.5.6 and Part
// 4 row 4.5.7 are the same finding counted two ways, once as abuse surface and
// once as money.
//
// The numbers below are derived from Plaid's published per-endpoint ceilings
// rather than chosen as round figures, because Plaid is the only vendor in the
// fan-out that publishes them machine-readably:
//
//   https://plaid.com/data/rate-limits.json
//
// The production per-Item, per-minute ceilings that bound our routes:
//
//   /accounts/balance/get       5 / minute   <- tightest anywhere in the fan-out
//   /investments/holdings/get  15 / minute
//   /liabilities/get           30 / minute
//
// The rule applied to both constants: our own limit must sit below what Plaid
// will accept, so that load is shed here, by us, with a 429 the client already
// understands, rather than collected from a vendor as a failed refresh the user
// sees. The retry ladder in util/fetch.ts can turn one logical call into three
// requests on a 5xx, so each derivation multiplies by three before comparing.

/** Route options for the whole-portfolio refresh, POST /api/net-worth/refresh.
 *
 *  Derivation. The tightest published ceiling the fan-out touches is
 *  `/accounts/balance/get` at 5 a minute per Item, but that call is not the
 *  binding one: it is already capped at four a DAY by MANUAL_BANK_REFRESH_PER_DAY
 *  (api/net-worth.ts), so a per-minute limit cannot make it worse.
 *
 *  The binding one is the tightest UNCAPPED call: `/investments/holdings/get`,
 *  one per Item per refresh whether or not the bank pull is capped
 *  (networth/refresh.ts refreshes holdings on both branches), at 15 a minute
 *  per Item. The retry ladder in util/fetch.ts can turn one logical call into
 *  three requests on a 5xx, so the ceiling on refreshes is 15 / 3 = 5 a minute.
 *
 *  5 a minute is one refresh every twelve seconds, faster than a person can
 *  usefully pull-to-refresh and 1,200x below what the global bucket allowed. It
 *  is also exactly the number of refreshes it takes to observe the daily bank
 *  cap (four refreshed, one capped), so the limit does not hide the cap.
 *
 *  Part 4 row 4.5.7 suggested 6, which was a round figure rather than a derived
 *  one: 6 puts the holdings call at 18 a minute against a ceiling of 15. */
export const REFRESH_LIMIT = { config: { rateLimit: { max: 5, timeWindow: '1 minute' } } };

/** Route options for a single vendor's sync, the 22 `POST /api/<vendor>/sync`
 *  routes.
 *
 *  Derivation. One of these routes reaches Plaid: `/api/debts/sync` calls
 *  `/liabilities/get` once per Item (api/debts.ts). That ceiling is 30 a
 *  minute per Item, and 8 times the three-attempt ladder is 24, which stays
 *  under it. The other twenty-one routes hit vendors that publish no
 *  machine-readable limits, so they inherit the same number rather than get a
 *  guess each: each is a slice of the same fan-out, and a ceiling per vendor
 *  lets a user retry one failing integration without giving them a way to
 *  drive all twenty-two at wire speed. */
export const SYNC_LIMIT = { config: { rateLimit: { max: 8, timeWindow: '1 minute' } } };

// EVERY NUMBER ABOVE ASSUMES ONE PROCESS, AND THAT ASSUMPTION IS CURRENTLY FALSE.
//
// @fastify/rate-limit is registered in server.ts with no `redis` and no custom
// store, so each counter lives in one machine's memory. Part 1 row 1.5.7 read
// that from the config and rated it "MINOR now, MAJOR at the second machine".
// Part 4 row 4.1.6 then counted the running fleet: `fly machine list` returns
// TWO machines, created 2026-05-20 and 2026-07-16. The second machine has been
// there since May. So every limit here is already doubled in practice (4
// refreshes a minute is 8, 8 syncs is 16) and no bucket is shared, which also
// means a client that reconnects to the other machine gets a fresh budget.
//
// Two ways to make the numbers true again:
//
//   1. A shared store (Redis or Postgres). Correct at any machine count, and
//      the only option that survives autoscaling. It costs a new dependency, a
//      new managed service, and a new failure mode: when the store is
//      unreachable the limiter either fails open (no limits) or fails closed
//      (no service), and someone has to pick. At one paying user, that is a
//      lot of machinery to make a limit that is already 2x tighter than Plaid's
//      into one that is exactly as tight.
//
//   2. Run one machine. `fly scale count 1`. Restores the assumption every
//      budget in engineering-budgets.md was written against, halves the $4/mo
//      Fly bill, and also fixes the two other things 4.1.7 found riding on the
//      same assumption (10 database connections against a documented 5, and
//      the scheduler ticking twice per interval, which 4.9.7 costs as duplicate
//      billed vendor calls).
//
// The recommendation is (2), and it is a Fly configuration change, deliberately
// not made here. Trigger to revisit (1): the first machine added back for
// availability rather than by accident, or any autoscaling policy.
