// Scheduled refresh for the vendors that need a per-user credential.
//
// ---------------------------------------------------------------------------
// The gap this closes
// ---------------------------------------------------------------------------
//
// `sync/price-classes.ts` closed the price half of this: metals, energy,
// farmland, sneakers, coins and both card vendors now refresh on the tick. It
// deliberately left these ten alone and said why, which is the paragraph this
// file is the answer to:
//
//   "The credential-based vendors are a different shape: a scheduled run can
//    discover an expired grant, which has to feed connection health and the
//    reconnect surface rather than just counting an error."
//
// Until now they refreshed ONLY when the user pulled to refresh that specific
// screen. `networth/refresh.ts` schedules four classes (investments, crypto,
// defi, debts), which covers Plaid, Coinbase, Zerion and Spinwheel and nobody
// else. So a user with a Kraken balance, an Alpaca account and three chain
// wallets saw a headline net worth built partly from numbers that were as old
// as the last time they happened to open that vendor's screen.
//
// YNAB is here too, making ten rather than the nine the handoff listed. Nothing
// in `networth/refresh.ts` mentions `ynab_connections`; it was left out of the
// list, not out of the gap.
//
// ---------------------------------------------------------------------------
// An expired grant is not an error
// ---------------------------------------------------------------------------
//
// This is the difference from the price classes, and the reason this is a
// separate file rather than seven more rows in that registry.
//
// A price class fails because a vendor is down or a key is missing. Neither is
// the user's problem and neither is durable. A credential vendor fails, often,
// because the user revoked the grant, rotated the key, or let a refresh token
// lapse: nothing this process does will ever fix it, and the only useful
// outcome is that the app asks the person to reconnect.
//
// The per-connection health columns already model that (`store/
// connection-health.ts`), and each extracted sync writes them through
// `recordSyncFailure`. What this file adds is that the SWEEP does not treat
// such a discovery as a failure to be alarmed about. `auth` failures are
// counted separately, are not sent to Sentry, and are exactly the ones that
// surface to the user as `reauth_required` with a Reconnect button.
//
// ---------------------------------------------------------------------------
// Due-ness comes from the last ATTEMPT, not the last success
// ---------------------------------------------------------------------------
//
// The price classes measure staleness from `lastSyncedAt`, which is right for
// them: a holding that never priced is the most stale thing there is and should
// be retried.
//
// Here that rule builds a hot loop. A connection with a revoked grant never
// succeeds again, so its `lastSyncedAt` never moves, so it would be due on
// every tick forever, hammering a vendor with a credential it has already
// rejected. `lastAttemptAt` advances on failure too (`failurePatch`), so it is
// the column that makes a broken connection back off instead of spin.

import { and, eq, gte, isNull, lt, or } from 'drizzle-orm';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import { syncAlpaca } from '../api/alpaca.js';
import { syncChainWallets } from '../api/chain-wallets.js';
import { syncDiscogs } from '../api/discogs.js';
import { syncHyperliquid } from '../api/hyperliquid.js';
import { syncKalshi } from '../api/kalshi-connect.js';
import { syncKraken } from '../api/kraken.js';
import { syncNftWallets } from '../api/nft.js';
import { syncPolymarket } from '../api/polymarket.js';
import { syncTruelayer } from '../api/truelayer.js';
import { syncYnab } from '../api/ynab.js';
import { db } from '../db/client.js';
import {
  alpacaConnections,
  chainWallets,
  discogsConnections,
  hyperliquidAccounts,
  kalshiConnections,
  krakenConnections,
  nftWallets,
  polymarketAccounts,
  truelayerConnections,
  ynabConnections,
} from '../db/schema.js';
import { classifyError } from '../networth/refresh.js';
import { CONNECTION_ERROR_THRESHOLD, type VendorSyncResult } from '../store/connection-health.js';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export type CredentialSyncVendor =
  | 'kraken'
  | 'alpaca'
  | 'kalshi'
  | 'hyperliquid'
  | 'chain_wallets'
  | 'nft'
  | 'polymarket'
  | 'truelayer'
  | 'discogs'
  | 'ynab';

/**
 * How long a connection that has already failed `CONNECTION_ERROR_THRESHOLD`
 * times waits before the sweep tries it again.
 *
 * A day, not the vendor's own interval. Past the threshold the connection is
 * showing `reauth_required` or `error` in the app, so the user has been asked
 * and the machine retrying every six hours changes nothing except the rate at
 * which a vendor sees a credential it has already rejected. It stays non-zero
 * because the other half of these failures is a vendor outage that fixes
 * itself, and that case must heal without the user doing anything.
 */
export const BROKEN_RETRY_INTERVAL_MS = DAY;

/**
 * Consecutive users a vendor may fail for within one tick before the rest of
 * that vendor is skipped until the next one.
 *
 * The same judgement `runPriceSync` makes about an unconfigured API key, minus
 * the ability to identify one: when three users in a row fail at the same
 * vendor it is the vendor, not the credentials, and walking the remaining users
 * to collect identical errors costs the tick and tells nobody anything.
 */
export const VENDOR_ABORT_THRESHOLD = 3;

interface CredentialSyncTask {
  key: CredentialSyncVendor;
  /**
   * How stale this vendor's value may get before the sweep refreshes it.
   *
   * Chosen from how fast the underlying number moves against what the call
   * costs, not from a default. These are per-user API calls against accounts
   * that mostly change when their owner does something, so none of them is
   * hourly.
   */
  intervalMs: number;
  /** The connection table whose health columns decide due-ness. */
  table: PgTable;
  userId: PgColumn;
  /** Advances on success AND failure, which is what makes backoff work. */
  lastAttemptAt: PgColumn;
  consecutiveFailures: PgColumn;
  disabled: PgColumn;
  /** The sync extracted from this vendor's route. */
  run(userId: string): Promise<VendorSyncResult<object>>;
}

export const CREDENTIAL_SYNC_TASKS: CredentialSyncTask[] = [
  {
    // A crypto balance moves whenever the market does, but the number Coiny
    // shows is a net worth line and not a trading screen. Six hours keeps it
    // honest within a day without spending a signed API call an hour.
    key: 'kraken',
    intervalMs: 6 * HOUR,
    table: krakenConnections,
    userId: krakenConnections.userId,
    lastAttemptAt: krakenConnections.lastAttemptAt,
    consecutiveFailures: krakenConnections.consecutiveFailures,
    disabled: krakenConnections.disabled,
    run: syncKraken,
  },
  {
    // Equity only moves while the US market is open, and this sweep has no
    // market calendar, so six hours lands at least one refresh inside every
    // session without pretending to track it.
    key: 'alpaca',
    intervalMs: 6 * HOUR,
    table: alpacaConnections,
    userId: alpacaConnections.userId,
    lastAttemptAt: alpacaConnections.lastAttemptAt,
    consecutiveFailures: alpacaConnections.consecutiveFailures,
    disabled: alpacaConnections.disabled,
    run: syncAlpaca,
  },
  {
    // Event contracts reprice continuously but a portfolio's VALUE mostly moves
    // when a market resolves, which is a daily-scale event.
    key: 'kalshi',
    intervalMs: 12 * HOUR,
    table: kalshiConnections,
    userId: kalshiConnections.userId,
    lastAttemptAt: kalshiConnections.lastAttemptAt,
    consecutiveFailures: kalshiConnections.consecutiveFailures,
    disabled: kalshiConnections.disabled,
    run: syncKalshi,
  },
  {
    key: 'hyperliquid',
    intervalMs: 6 * HOUR,
    table: hyperliquidAccounts,
    userId: hyperliquidAccounts.userId,
    lastAttemptAt: hyperliquidAccounts.lastAttemptAt,
    consecutiveFailures: hyperliquidAccounts.consecutiveFailures,
    disabled: hyperliquidAccounts.disabled,
    run: syncHyperliquid,
  },
  {
    // One RPC call per wallet across up to sixteen chains, several of them on
    // free public endpoints with their own rate limits. Twelve hours is the
    // quota talking, not the price.
    key: 'chain_wallets',
    intervalMs: 12 * HOUR,
    table: chainWallets,
    userId: chainWallets.userId,
    lastAttemptAt: chainWallets.lastAttemptAt,
    consecutiveFailures: chainWallets.consecutiveFailures,
    disabled: chainWallets.disabled,
    run: syncChainWallets,
  },
  {
    // Floor prices move in days, not minutes, and each wallet costs an Alchemy
    // call whose free tier is metered in compute units.
    key: 'nft',
    intervalMs: DAY,
    table: nftWallets,
    userId: nftWallets.userId,
    lastAttemptAt: nftWallets.lastAttemptAt,
    consecutiveFailures: nftWallets.consecutiveFailures,
    disabled: nftWallets.disabled,
    run: syncNftWallets,
  },
  {
    key: 'polymarket',
    intervalMs: 12 * HOUR,
    table: polymarketAccounts,
    userId: polymarketAccounts.userId,
    lastAttemptAt: polymarketAccounts.lastAttemptAt,
    consecutiveFailures: polymarketAccounts.consecutiveFailures,
    disabled: polymarketAccounts.disabled,
    run: syncPolymarket,
  },
  {
    // A bank balance, so the same shape as the Plaid path: worth refreshing
    // daily, not worth refreshing hourly. This is also the vendor whose grant
    // most reliably expires on a clock, which is the case the sweep exists to
    // discover before the user does.
    key: 'truelayer',
    intervalMs: 12 * HOUR,
    table: truelayerConnections,
    userId: truelayerConnections.userId,
    lastAttemptAt: truelayerConnections.lastAttemptAt,
    consecutiveFailures: truelayerConnections.consecutiveFailures,
    disabled: truelayerConnections.disabled,
    run: syncTruelayer,
  },
  {
    // A price lookup per release against a rate-limited API, over a collection
    // whose value moves on the scale of a record-fair season. Weekly.
    key: 'discogs',
    intervalMs: 7 * DAY,
    table: discogsConnections,
    userId: discogsConnections.userId,
    lastAttemptAt: discogsConnections.lastAttemptAt,
    consecutiveFailures: discogsConnections.consecutiveFailures,
    disabled: discogsConnections.disabled,
    run: syncDiscogs,
  },
  {
    // YNAB is a budget the user edits by hand, so it changes when they change
    // it. Daily is the resolution of the underlying behaviour.
    key: 'ynab',
    intervalMs: DAY,
    table: ynabConnections,
    userId: ynabConnections.userId,
    lastAttemptAt: ynabConnections.lastAttemptAt,
    consecutiveFailures: ynabConnections.consecutiveFailures,
    disabled: ynabConnections.disabled,
    run: syncYnab,
  },
];

/**
 * Users with at least one connection to this vendor that is due a refresh.
 *
 * "At least one" rather than the price registry's "oldest holding", because
 * these syncs refresh ALL of a user's rows for the vendor in one call: a second
 * row that is not yet due costs nothing to include and is fresher afterwards.
 *
 * Three things the query is careful about:
 *   - `disabled` rows are excluded outright. The user turned it off, or we did;
 *     either way it is not a connection any more.
 *   - a NULL `lastAttemptAt` is due, which is how a connection made between two
 *     ticks gets its first scheduled refresh instead of waiting an interval.
 *   - a connection past the failure threshold uses the longer broken interval,
 *     so a revoked grant backs off instead of being retried every tick forever.
 */
export async function usersDueForCredentialSync(task: CredentialSyncTask, now: Date): Promise<string[]> {
  const cutoff = new Date(now.getTime() - task.intervalMs);
  const brokenCutoff = new Date(now.getTime() - BROKEN_RETRY_INTERVAL_MS);

  const rows = await db()
    .selectDistinct({ userId: task.userId })
    .from(task.table)
    .where(
      and(
        eq(task.disabled, false),
        or(
          isNull(task.lastAttemptAt),
          and(lt(task.consecutiveFailures, CONNECTION_ERROR_THRESHOLD), lt(task.lastAttemptAt, cutoff)),
          and(gte(task.consecutiveFailures, CONNECTION_ERROR_THRESHOLD), lt(task.lastAttemptAt, brokenCutoff)),
        ),
      ),
    );

  const ids: string[] = [];
  for (const row of rows) {
    if (typeof row.userId === 'string') ids.push(row.userId);
  }
  return ids;
}

export interface CredentialSyncSummary {
  attempted: number;
  refreshed: number;
  /** Genuine failures: a vendor outage, a bad response, our own bug. */
  failed: number;
  /**
   * Connections the sweep found to have a lapsed credential. Counted apart from
   * `failed` because nothing here can fix one: the connection is now showing
   * `reauth_required`, and the next thing that happens is the user tapping
   * Reconnect, not an engineer reading an alert.
   */
  reauthRequired: number;
  /** Vendors abandoned for this tick after failing for consecutive users. */
  abandoned: CredentialSyncVendor[];
}

/**
 * Run every due credential vendor for every due user.
 *
 * Isolation rules, the same two the price sweep learned, plus one:
 *
 *   - One user's failure never stops the vendor. The alternative is that one
 *     revoked grant freezes everybody else's balances.
 *   - A vendor failing for `VENDOR_ABORT_THRESHOLD` users in a row is skipped
 *     for the rest of the tick. That many identical failures is the vendor.
 *   - An `auth` failure never counts toward that streak. It is specific to one
 *     user's credential and says nothing about the vendor's health, so letting
 *     three lapsed grants abandon a working vendor would be wrong.
 */
export async function runCredentialSync(now: Date = new Date()): Promise<CredentialSyncSummary> {
  const summary: CredentialSyncSummary = {
    attempted: 0,
    refreshed: 0,
    failed: 0,
    reauthRequired: 0,
    abandoned: [],
  };

  for (const task of CREDENTIAL_SYNC_TASKS) {
    const userIds = await usersDueForCredentialSync(task, now);
    if (userIds.length === 0) continue;

    let consecutiveVendorFailures = 0;

    for (const userId of userIds) {
      summary.attempted++;
      try {
        const result = await task.run(userId);
        // `not_connected` is neither an error nor a refresh: the rows went away
        // between the due query and the call, which is what a disconnect in the
        // middle of a tick looks like.
        if (result.status === 'synced') summary.refreshed++;
        consecutiveVendorFailures = 0;
      } catch (err) {
        // Error CLASS only. The vendor's message can quote balances and
        // institution names (.claude/rules/security.md #2); the class is what
        // decides whose problem this is, and Sentry already has the exception.
        if (classifyError(err) === 'auth') {
          summary.reauthRequired++;
          // Deliberately does not touch the streak: this is one user's
          // credential, not the vendor's health.
        } else {
          summary.failed++;
          consecutiveVendorFailures++;
        }
      }

      if (consecutiveVendorFailures >= VENDOR_ABORT_THRESHOLD) {
        summary.abandoned.push(task.key);
        break;
      }
    }
  }

  return summary;
}

/** Exposed for the scheduler's log line and for tests that assert the shape of
 *  the registry rather than its behaviour. */
export const CREDENTIAL_SYNC_VENDOR_KEYS = CREDENTIAL_SYNC_TASKS.map((t) => t.key);
