// The per-class status vocabulary and freshness policy for the net-worth
// response (prd.md section 8.1 R-8.4; intervals owned by
// docs/engineering-budgets.md section 2). Pure functions only: everything here
// is unit-testable without a database.
//
// Statuses beyond the PRD set: `pending` covers "connected, first fetch has not
// completed and has not failed", which the R-8.4 table has no word for. It is
// excluded from the total (an unknown value must not read as zero) and is
// additive for clients. `reauth_required` and `expiring` are driven by the
// Plaid item lifecycle status column (R-8.5).

export const CLASS_STATUSES = [
  'ok',
  'stale',
  'stale_excluded',
  'error',
  'disconnected',
  'not_connected',
  'pending',
  'reauth_required',
  'expiring',
] as const;

export type ClassStatus = (typeof CLASS_STATUSES)[number];

export type ClassReading = {
  value: number | null;
  /** ISO timestamp of the last successful fetch, null when unknown. */
  asOf: string | null;
  status: ClassStatus;
};

export type FreshnessPolicy = {
  /** Age at or under which the value reads `ok`. */
  freshMs: number;
  /** Never-show age: past this the class is `stale_excluded` and leaves the
   *  total. Null means the class is never excluded for age (collectible and
   *  estimate classes, where an old price beats a hole in net worth). */
  excludeMs: number | null;
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const SIX_HOURS_7D: FreshnessPolicy = { freshMs: 6 * HOUR, excludeMs: 7 * DAY };
const DAILY_7D: FreshnessPolicy = { freshMs: DAY, excludeMs: 7 * DAY };
const WEEKLY_KEEP: FreshnessPolicy = { freshMs: 7 * DAY, excludeMs: null };
const MONTHLY_KEEP: FreshnessPolicy = { freshMs: 30 * DAY, excludeMs: null };

/** Interval and never-show age per class, mirroring engineering-budgets.md
 *  section 2. Where that table is silent (energy, farmland, nft) the class is
 *  mapped to the nearest cadence family: nft to the daily-priced family,
 *  energy and farmland to the weekly vendor family. Manual assets are always
 *  labelled and never excluded; policy is not consulted for them. */
export const FRESHNESS: Record<NetWorthClassName, FreshnessPolicy> = {
  bank: DAILY_7D,
  investments: DAILY_7D,
  crypto: SIX_HOURS_7D,
  defi: SIX_HOURS_7D,
  chainWallets: SIX_HOURS_7D,
  hyperliquid: SIX_HOURS_7D,
  polymarket: SIX_HOURS_7D,
  kraken: SIX_HOURS_7D,
  kalshi: SIX_HOURS_7D,
  alpaca: SIX_HOURS_7D,
  ynab: DAILY_7D,
  truelayer: DAILY_7D,
  nft: DAILY_7D,
  // Bureau data changes at most monthly; past 45 days the read path falls back
  // to Plaid-visible liabilities (engineering-budgets.md section 2).
  debts: { freshMs: 7 * DAY, excludeMs: 45 * DAY },
  sneakers: WEEKLY_KEEP,
  pokemonCards: WEEKLY_KEEP,
  tradingCards: WEEKLY_KEEP,
  coins: WEEKLY_KEEP,
  vinyl: WEEKLY_KEEP,
  metals: WEEKLY_KEEP,
  energy: WEEKLY_KEEP,
  farmland: WEEKLY_KEEP,
  realEstate: MONTHLY_KEEP,
  vehicles: MONTHLY_KEEP,
  manual: { freshMs: Number.POSITIVE_INFINITY, excludeMs: null },
};

export const NET_WORTH_CLASS_NAMES = [
  'bank',
  'investments',
  'crypto',
  'defi',
  'chainWallets',
  'hyperliquid',
  'polymarket',
  'kraken',
  'kalshi',
  'alpaca',
  'ynab',
  'truelayer',
  'nft',
  'debts',
  'sneakers',
  'pokemonCards',
  'tradingCards',
  'coins',
  'vinyl',
  'metals',
  'energy',
  'farmland',
  'realEstate',
  'vehicles',
  'manual',
] as const;

export type NetWorthClassName = (typeof NET_WORTH_CLASS_NAMES)[number];

export type StatusInput = {
  /** A provider row / holding rows exist for this user. */
  connected: boolean;
  /** The user revoked or the provider disabled the connection. */
  disconnected?: boolean;
  /** Provider lifecycle state, when the class is backed by one (R-8.5).
   *  `reauth_required`: credentials lapsed, the last value is still real.
   *  `expiring`: the provider pre-warned; data still flows. */
  health?: 'reauth_required' | 'expiring' | null;
  value: number | null;
  asOf: Date | null;
  /** A refresh attempt has failed and no usable value exists. */
  failed: boolean;
  policy: FreshnessPolicy;
  now: Date;
};

/** Derives the per-class status. Rules, in order:
 *  - not connected: `not_connected`
 *  - connected but revoked/disabled: `disconnected`
 *  - no value, a recorded failure: `error` (a failure is a failure, never zero)
 *  - no value, no failure yet: `pending` (first fetch not completed)
 *  - value with unknown age: `stale` (shown and included, honestly unlabelled
 *    age is still better than hiding the value; it can never read `ok`)
 *  - value within freshMs: `ok`
 *  - value past excludeMs: `stale_excluded`
 *  - otherwise: `stale`
 *
 *  Provider lifecycle overrides the freshness answer only while the value is
 *  still usable. A broken login does not make the last known balance wrong, it
 *  makes it un-refreshable, so `reauth_required` keeps the value in the total
 *  until it passes the never-show age and then drops out like any stale value.
 *  `expiring` is a warning about the future, so data flows normally (section
 *  8.1). Neither can mask a revocation: showing revoked data is wrong, not
 *  stale. */
export function deriveStatus(input: StatusInput): ClassStatus {
  if (!input.connected) return 'not_connected';
  if (input.disconnected) return 'disconnected';
  if (input.value === null) return input.failed ? 'error' : 'pending';
  if (input.asOf === null) return input.health ?? 'stale';
  const age = input.now.getTime() - input.asOf.getTime();
  if (input.policy.excludeMs !== null && age > input.policy.excludeMs) return 'stale_excluded';
  if (input.health) return input.health;
  if (age <= input.policy.freshMs) return 'ok';
  return 'stale';
}

/** The total sums only values the user can trust: fresh ones and labelled-stale
 *  ones. Everything else (failures, never-fetched, revoked, past never-show
 *  age) is excluded and surfaced in the response's `excluded` counter, so a
 *  vendor outage is visible instead of reading as a smaller number. */
export function includedInTotal(status: ClassStatus): boolean {
  return status === 'ok' || status === 'stale' || status === 'expiring' || status === 'reauth_required';
}

export function reading(value: number | null, asOf: Date | null, status: ClassStatus): ClassReading {
  return { value, asOf: asOf ? asOf.toISOString() : null, status };
}

/** Rolls up per-row synced values (the many `last*Usd` + `lastSyncedAt` tables)
 *  into one class reading. Row rules:
 *  - rows with null values contribute nothing (unpriced holdings);
 *  - when the policy has a never-show age, rows past it are dropped from the
 *    sum individually (one dead sync must not poison the class);
 *  - the class asOf is the OLDEST timestamp among contributing rows, so
 *    staleness is never understated; a contributing row with no timestamp
 *    makes the class age unknown (asOf null, status `stale`).
 *  When every valued row is past the never-show age the class reports the full
 *  (muted) sum with `stale_excluded` so the UI can show the last value while
 *  the total excludes it. */
export function rollupRows(
  rows: Array<{ valueUsd: number | null; syncedAt: Date | null }>,
  policy: FreshnessPolicy,
  now: Date,
): ClassReading {
  if (rows.length === 0) return reading(null, null, 'not_connected');

  const valued = rows.filter((r) => r.valueUsd !== null);
  if (valued.length === 0) {
    // Holdings exist but nothing has ever been priced: first sync pending.
    return reading(null, null, 'pending');
  }

  const isExpired = (r: { syncedAt: Date | null }): boolean =>
    policy.excludeMs !== null && r.syncedAt !== null && now.getTime() - r.syncedAt.getTime() > policy.excludeMs;

  const included = valued.filter((r) => !isExpired(r));

  if (included.length === 0) {
    const mutedSum = valued.reduce((sum, r) => sum + (r.valueUsd ?? 0), 0);
    const oldest = oldestOf(valued);
    return reading(mutedSum, oldest, 'stale_excluded');
  }

  const sum = included.reduce((s, r) => s + (r.valueUsd ?? 0), 0);
  const oldest = oldestOf(included);
  const status = deriveStatus({ connected: true, value: sum, asOf: oldest, failed: false, policy, now });
  return reading(sum, oldest, status);
}

function oldestOf(rows: Array<{ syncedAt: Date | null }>): Date | null {
  let oldest: Date | null = null;
  for (const r of rows) {
    if (r.syncedAt === null) return null;
    if (oldest === null || r.syncedAt.getTime() < oldest.getTime()) oldest = r.syncedAt;
  }
  return oldest;
}
