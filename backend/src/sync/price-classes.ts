// Scheduled refresh for the asset classes whose value is a price recompute.
//
// ---------------------------------------------------------------------------
// The gap this closes
// ---------------------------------------------------------------------------
//
// The scheduler refreshed four classes: investments, crypto, defi and debts.
// Banks arrive by Plaid webhook. Everything else in the product refreshed ONLY
// when the user pulled to refresh that specific class.
//
// So a user who added gold, sneakers and farmland, then opened the app three
// weeks later, saw a headline net worth in which those components were three
// weeks old. The freshness plumbing is honest about it (every reading carries
// `asOf` and a status, and the total excludes what it must), so the number was
// never a lie. It was just old, and nothing was going to make it newer.
//
// For a product whose entire premise is one trustworthy number, a third of that
// number quietly ageing is the failure mode, not a nice-to-have.
//
// ---------------------------------------------------------------------------
// Why these seven and not all twenty
// ---------------------------------------------------------------------------
//
// These are the classes whose refresh is "read stored holdings, ask a price
// feed, write the new value". No per-user credential, no OAuth grant, no
// possibility of the refresh itself breaking a connection. That makes them safe
// to run unattended.
//
// The credential-based vendors (Kraken, Alpaca, Kalshi, Hyperliquid, chain
// wallets, NFTs, Polymarket, TrueLayer, Discogs, and YNAB, which this paragraph
// used to omit) are a different shape: a scheduled run can discover an expired
// grant, which has to feed connection health and the reconnect surface rather
// than just counting an error. They were a separate change, deliberately, and
// that change is now `sync/credential-vendors.ts`. Add a price feed here; add a
// per-user credential there.
//
// ---------------------------------------------------------------------------
// Due-ness comes from the holdings tables, not from a new cache
// ---------------------------------------------------------------------------
//
// `assetClassCache` only models the five classes in `CachedAssetClass`, and
// extending that union reaches into the read path, the goal snapshot and the
// status table. Every table here already carries `lastSyncedAt` per row, which
// is the same fact, so due-ness is computed from data that already exists and
// this needed no migration.
//
// A class is due when its OLDEST holding is older than the interval. Oldest
// rather than newest on purpose: one stale parcel in a portfolio of ten still
// makes the total stale, and taking the newest would let a recently-added
// holding hide nine old ones.

import { isNull, lt, min, or } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import { syncCoins } from '../api/coins.js';
import { syncEnergy } from '../api/energy.js';
import { syncFarmland } from '../api/farmland.js';
import { syncMetals } from '../api/metals.js';
import { syncPokemonCards } from '../api/pokemon-cards.js';
import { syncSneakers } from '../api/sneakers.js';
import { syncTradingCards } from '../api/trading-cards.js';
import { db } from '../db/client.js';
import {
  coinHoldings,
  energyPositions,
  farmlandParcels,
  metalHoldings,
  pokemonCardHoldings,
  sneakerHoldings,
  tradingCardHoldings,
} from '../db/schema.js';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export type PriceSyncClass =
  | 'metals'
  | 'energy'
  | 'farmland'
  | 'sneakers'
  | 'coins'
  | 'trading_cards'
  | 'pokemon_cards';

/** What one scheduled price class needs to declare.
 *
 *  Adding a class is one entry here and nothing in the scheduler, which is the
 *  point: the next nine are mechanical once their sync functions are extracted
 *  the same way these were. */
interface PriceSyncTask {
  key: PriceSyncClass;
  /** How stale a value may get before it is refetched.
   *
   *  Chosen from how fast the UNDERLYING price actually moves, and bounded by
   *  the vendor's free-tier quota, not from a default. A home value refreshed
   *  hourly is wasted quota; a gold price refreshed never is a wrong number. */
  intervalMs: number;
  /** The table whose `lastSyncedAt` decides due-ness. */
  table: PgTable;
  userId: PgColumn;
  lastSyncedAt: PgColumn;
  /** The extracted sync function.
   *
   *  Each class returns its own counts (`synced`/`errors`, `updated`/`errors`)
   *  because those shapes are the HTTP responses their routes already return
   *  and changing them would be an API break for no gain here. The scheduler
   *  reads exactly one field, `unconfigured`, so the contract says that and
   *  admits the rest via the index signature: without it TypeScript's weak-type
   *  check rejects a `{ updated, errors }` for sharing no properties with an
   *  all-optional target. */
  run(userId: string): Promise<{ unconfigured?: true } & Record<string, unknown>>;
}

export const PRICE_SYNC_TASKS: PriceSyncTask[] = [
  {
    // Spot metal moves continuously, but a daily mark is the right resolution
    // for a net worth figure, and GoldAPI's free tier is metered.
    key: 'metals',
    intervalMs: DAY,
    table: metalHoldings,
    userId: metalHoldings.userId,
    lastSyncedAt: metalHoldings.lastSyncedAt,
    run: syncMetals,
  },
  {
    // EIA publishes daily and weekly series; one call returns every commodity,
    // so this is cheap regardless of how many positions a user holds.
    key: 'energy',
    intervalMs: DAY,
    table: energyPositions,
    userId: energyPositions.userId,
    lastSyncedAt: energyPositions.lastSyncedAt,
    run: syncEnergy,
  },
  {
    // USDA NASS farmland value per acre is an ANNUAL series. Thirty days is
    // already far more often than the underlying number changes; it exists so a
    // newly added parcel gets priced without waiting a year, not to track
    // movement that is not there.
    key: 'farmland',
    intervalMs: 30 * DAY,
    table: farmlandParcels,
    userId: farmlandParcels.userId,
    lastSyncedAt: farmlandParcels.lastSyncedAt,
    run: syncFarmland,
  },
  {
    // One vendor call PER HOLDING, so the cost scales with collection size.
    // Weekly is the resolution resale prices actually move at.
    key: 'sneakers',
    intervalMs: 7 * DAY,
    table: sneakerHoldings,
    userId: sneakerHoldings.userId,
    lastSyncedAt: sneakerHoldings.lastSyncedAt,
    run: syncSneakers,
  },
  {
    // PCGS publishes a price GUIDE, which is revised periodically rather than
    // traded. Weekly is generous.
    key: 'coins',
    intervalMs: 7 * DAY,
    table: coinHoldings,
    userId: coinHoldings.userId,
    lastSyncedAt: coinHoldings.lastSyncedAt,
    run: syncCoins,
  },
  {
    // TCGapi's free tier is 100 requests a day and this spends one per card, so
    // the quota binds before the price movement does.
    key: 'trading_cards',
    intervalMs: 7 * DAY,
    table: tradingCardHoldings,
    userId: tradingCardHoldings.userId,
    lastSyncedAt: tradingCardHoldings.lastSyncedAt,
    run: syncTradingCards,
  },
  {
    key: 'pokemon_cards',
    intervalMs: 7 * DAY,
    table: pokemonCardHoldings,
    userId: pokemonCardHoldings.userId,
    lastSyncedAt: pokemonCardHoldings.lastSyncedAt,
    run: syncPokemonCards,
  },
];

/**
 * Users whose oldest holding in this class is older than the interval, or who
 * have a holding that has never been priced at all.
 *
 * `lastSyncedAt IS NULL` is included deliberately: a holding added and never
 * synced is the most stale a value can be, and excluding it would mean a new
 * parcel sat unpriced until the user happened to pull to refresh, which is the
 * behaviour this whole module exists to remove.
 */
export async function usersDueForPriceSync(task: PriceSyncTask, now: Date): Promise<string[]> {
  const cutoff = new Date(now.getTime() - task.intervalMs);

  const rows = await db()
    .select({ userId: task.userId, oldest: min(task.lastSyncedAt) })
    .from(task.table)
    .groupBy(task.userId)
    .having(or(isNull(min(task.lastSyncedAt)), lt(min(task.lastSyncedAt), cutoff)));

  const ids: string[] = [];
  for (const row of rows) {
    if (typeof row.userId === 'string') ids.push(row.userId);
  }
  return ids;
}

export interface PriceSyncSummary {
  attempted: number;
  refreshed: number;
  failed: number;
  /** Classes skipped wholesale because the vendor key is not configured. */
  unconfigured: PriceSyncClass[];
}

/**
 * Run every due price class for every due user.
 *
 * Isolation rules, both learned from the existing vendor sweep:
 *
 *   - One user's failure never stops the class. A thrown error is counted and
 *     the loop continues, because the alternative is that one bad row freezes
 *     everybody else's prices.
 *   - One class being unconfigured skips the REST of that class immediately.
 *     If the API key is missing, every remaining user fails identically, and
 *     burning a tick discovering that seven more times helps nobody.
 */
export async function runPriceSync(now: Date = new Date()): Promise<PriceSyncSummary> {
  const summary: PriceSyncSummary = { attempted: 0, refreshed: 0, failed: 0, unconfigured: [] };

  for (const task of PRICE_SYNC_TASKS) {
    const userIds = await usersDueForPriceSync(task, now);
    if (userIds.length === 0) continue;

    for (const userId of userIds) {
      summary.attempted++;
      try {
        const result = await task.run(userId);
        if (result.unconfigured) {
          summary.unconfigured.push(task.key);
          summary.attempted--;
          break;
        }
        summary.refreshed++;
      } catch {
        // Error class only, and not even that: the vendor message can quote
        // holding detail. The count is the signal; Sentry has the exception.
        summary.failed++;
      }
    }
  }

  return summary;
}

/** Exposed for the scheduler's log line and for tests that assert the shape of
 *  the registry rather than its behaviour. */
export const PRICE_SYNC_CLASS_KEYS = PRICE_SYNC_TASKS.map((t) => t.key);
