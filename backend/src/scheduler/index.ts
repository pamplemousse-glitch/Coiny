// The scheduler (prd.md R-16.2, engineering-budgets.md section 3): one
// in-process 15-minute tick started from server boot. Node built-ins only, no
// queue infrastructure. Per tick it (a) refreshes classes whose cache is older
// than their section-2 interval, with per-user jitter and a concurrency cap,
// (b) runs the daily goal refresh (net_worth_daily point, ladder
// re-evaluation, milestone baseline) for users with no point today, so a
// dormant user's series has no gaps, and (c) once a day runs the retention
// purge that executes docs/legal/data-disposal-schedule.md.
//
// Cost shape: the tick sleeps between runs, so the Neon endpoint suspends
// between ticks instead of being kept awake 24/7 (the difference between
// staying inside the Free plan's compute budget and exhausting it mid-month).
//
// Two-instance safety: every unit of work is an idempotent upsert keyed by
// (user, class) or (user, date), so concurrent instances at worst duplicate a
// fetch, never corrupt state. A Postgres advisory lock is the documented
// upgrade when a second machine exists; not before.
//
// Overlap: a single in-flight guard skips a tick that starts before the
// previous one finished. Work lost to a skip is staleness measured in
// minutes, never correctness.
//
// Failure: each (user, class) unit is isolated; a failure records an error
// class on the cache row and never aborts the sweep. `asOf` advances only on
// success so failed units retry next tick, and after 5 consecutive failures a
// unit is not retried until its interval has passed again, so a dead vendor
// does not burn the concurrency budget every 15 minutes.
//
// Nothing else in the codebase may create timers (R-16.2).

import { createHash } from 'node:crypto';
import { isNotNull } from 'drizzle-orm';
import { db } from '../db/client.js';
import { coinbaseConnections, plaidItems, spinwheelConnections, zerionWallets } from '../db/schema.js';
import { refreshScheduledClass, runGoalRefreshFromCache, type ScheduledClass } from '../networth/refresh.js';
import { captureError } from '../observability/sentry.js';
import { openBreakers } from '../resilience/circuit-breaker.js';
import { retryBudgetStats } from '../resilience/retry-budget.js';
import { getClassCacheForUsers } from '../store/asset-cache.js';
import { usersMissingDailyPoint } from '../store/goals.js';
import { recordOpsEvent } from '../store/ops.js';
import { type PriceSyncSummary, runPriceSync } from '../sync/price-classes.js';
import { type HealthSweepSummary, isHealthSweepDue, runConnectionHealthSweep } from './plaid-health.js';
import { drainPlaidRemovalQueue, type RemovalDrainSummary } from './plaid-removals.js';
import { isPurgeDue, type PurgeSummary, runRetentionPurge } from './purge.js';

const HOUR = 60 * 60 * 1000;

export const TICK_INTERVAL_MS = 15 * 60 * 1000;
/** /health reports 503 past this age: routes scheduler death through the
 *  existing Fly health check and the external pinger for free. */
export const TICK_STALE_MS = 45 * 60 * 1000;

const CONCURRENCY = 5;
const FAILURE_BACKOFF_THRESHOLD = 5;

/** Refresh interval per scheduled class (engineering-budgets.md section 2).
 *  Bank is deliberately absent: balances ride the transactions webhook for
 *  free, and /accounts/balance/get is billed per call. */
const CLASS_INTERVALS: Record<ScheduledClass, number> = {
  investments: 24 * HOUR,
  crypto: 6 * HOUR,
  defi: 6 * HOUR,
  debts: 24 * HOUR,
};

/** The daily goal pass is spread over the 3 hours after UTC midnight by
 *  per-user jitter, so one tick never stampedes every user at once. */
const DAILY_JITTER_WINDOW_MS = 3 * HOUR;

type SchedulerLogger = {
  info: (obj: Record<string, unknown>, msg: string) => void;
  warn: (obj: Record<string, unknown>, msg: string) => void;
  /** Added for the circuit breaker. A throttled vendor is a control working as
   *  designed and warns; an EJECTED vendor means refreshes are being skipped
   *  and users are not getting fresh numbers, which is a different thing and
   *  should not share a level with it. pino provides this; the silent logger
   *  below and any test double must too. */
  error: (obj: Record<string, unknown>, msg: string) => void;
};

const silentLogger: SchedulerLogger = { info: () => {}, warn: () => {}, error: () => {} };

let timer: NodeJS.Timeout | null = null;
let startedAt: Date | null = null;
let lastTickAt: Date | null = null;
let inFlight = false;

export type SchedulerStatus = { enabled: boolean; startedAt: Date | null; lastTickAt: Date | null };

export function getSchedulerStatus(): SchedulerStatus {
  return { enabled: timer !== null, startedAt, lastTickAt };
}

/** True when the scheduler is supposed to be running but has not completed a
 *  tick within the staleness window: the /health 503 condition. */
export function isSchedulerStale(now: Date = new Date()): boolean {
  if (timer === null) return false;
  const reference = lastTickAt ?? startedAt;
  if (reference === null) return false;
  return now.getTime() - reference.getTime() > TICK_STALE_MS;
}

export function startScheduler(log: SchedulerLogger): void {
  if (timer !== null) return;
  startedAt = new Date();
  timer = setInterval(() => {
    void runSchedulerTick(new Date(), log);
  }, TICK_INTERVAL_MS);
  // The interval must never keep a shutting-down process alive.
  timer.unref();
  // First tick immediately so /health has a heartbeat from boot.
  void runSchedulerTick(new Date(), log);
}

export function stopScheduler(): void {
  if (timer !== null) clearInterval(timer);
  timer = null;
  startedAt = null;
  lastTickAt = null;
}

/** Deterministic per-user offset in [0, range): spreads scheduled work so a
 *  cohort of users linked at the same moment never refreshes in one burst. */
export function userJitter(userId: string, salt: string, range: number): number {
  const digest = createHash('sha256').update(`${userId}:${salt}`).digest();
  return digest.readUInt32BE(0) % range;
}

export type TickSummary = {
  skipped: boolean;
  refreshed: number;
  failed: number;
  goalRefreshes: number;
  /** Null on the ticks that were not the day's purge tick. */
  purge: PurgeSummary | null;
  /** Every tick, unlike the purge: a queued Item is being billed monthly. */
  removals: RemovalDrainSummary;
  /** Null on the ticks that were not the day's health-sweep tick. */
  health: HealthSweepSummary | null;
  /** Every tick. Unlike the purge and the health sweep this has no daily gate
   *  of its own: each price class carries its own interval and the due query
   *  returns nobody on the ticks where nothing has aged out, which is most of
   *  them. */
  priceSync: PriceSyncSummary;
};

export async function runSchedulerTick(
  now: Date = new Date(),
  log: SchedulerLogger = silentLogger,
): Promise<TickSummary> {
  if (inFlight) {
    log.info({}, 'scheduler_tick_skipped');
    return {
      skipped: true,
      refreshed: 0,
      failed: 0,
      goalRefreshes: 0,
      purge: null,
      removals: emptyDrain(),
      health: null,
      priceSync: emptyPriceSync(),
    };
  }
  inFlight = true;
  const summary: TickSummary = {
    skipped: false,
    refreshed: 0,
    failed: 0,
    goalRefreshes: 0,
    purge: null,
    removals: emptyDrain(),
    health: null,
    priceSync: emptyPriceSync(),
  };
  const startedTick = Date.now();

  try {
    // First, and every tick. An Item stuck in the removal queue is accruing a
    // monthly Plaid charge that nothing else can cancel, so it must not queue
    // behind a slow refresh sweep. Isolated like every other unit: a failure
    // here costs the drain, never the tick.
    try {
      summary.removals = await drainPlaidRemovalQueue(now, log);
    } catch (err) {
      log.warn({ err }, 'plaid removal queue drain failed');
      captureError(err, { task: 'plaid_removal_drain' });
      await recordOpsEvent({ severity: 'error', kind: 'task_failed', detail: { task: 'plaid_removal_drain' } });
    }

    const work = await findDueClassRefreshes(now);
    await runWithConcurrency(CONCURRENCY, work, async ({ userId, cls }) => {
      try {
        const outcome = await refreshScheduledClass(userId, cls);
        if (outcome === 'refreshed') summary.refreshed++;
        if (outcome === 'failed') summary.failed++;
      } catch (err) {
        // Store-layer failure; the vendor path records its own failures.
        summary.failed++;
        log.warn({ user_id: userId, asset_class: cls, err }, 'scheduled refresh failed');
      }
    });

    // Price-recompute classes: metals, energy, farmland, sneakers, coins and
    // both card vendors. Until this existed they refreshed ONLY when the user
    // pulled to refresh that specific class, so a third of a net worth could
    // sit weeks old inside a total the product presents as current.
    //
    // Runs after the vendor refreshes and before the goal pass, so the daily
    // point is derived from prices this tick has already updated rather than
    // from yesterday's. Isolated like every other unit.
    try {
      summary.priceSync = await runPriceSync(now);
      if (summary.priceSync.attempted > 0 || summary.priceSync.unconfigured.length > 0) {
        log.info({ ...summary.priceSync }, 'price_sync_completed');
      }
    } catch (err) {
      log.warn({ err }, 'price sync sweep failed');
      captureError(err, { task: 'price_sync' });
      await recordOpsEvent({ severity: 'error', kind: 'task_failed', detail: { task: 'price_sync' } });
    }

    const dueUsers = await findUsersDueDailyGoalRefresh(now);
    await runWithConcurrency(CONCURRENCY, dueUsers, async (userId) => {
      try {
        await runGoalRefreshFromCache(userId, now);
        summary.goalRefreshes++;
      } catch (err) {
        log.warn({ user_id: userId, err }, 'daily goal refresh failed');
      }
    });

    // Connection-health sweep, once a day (testing-strategy section 8 item 3).
    // Webhooks are the fast path and are not a guarantee; this is what finds
    // the items that broke while no webhook arrived. Isolated like every other
    // unit: a Plaid outage costs the sweep, never the tick.
    if (isHealthSweepDue(now)) {
      try {
        summary.health = await runConnectionHealthSweep(now, log);
        log.info({ ...summary.health }, 'connection_health_sweep_completed');
      } catch (err) {
        log.warn({ err }, 'connection health sweep failed');
        captureError(err, { task: 'connection_health_sweep' });
        await recordOpsEvent({ severity: 'error', kind: 'task_failed', detail: { task: 'connection_health_sweep' } });
      }
    }

    // Retention purge, once a day. Counts only, never contents. A failing
    // purge is an operational problem and must not cost the tick its
    // refreshes, so it is caught here like every other unit of work.
    if (isPurgeDue(now)) {
      try {
        summary.purge = await runRetentionPurge(now);
        log.info({ ...summary.purge }, 'retention_purge_completed');
      } catch (err) {
        log.warn({ err }, 'retention purge failed');
        captureError(err, { task: 'retention_purge' });
        await recordOpsEvent({ severity: 'error', kind: 'task_failed', detail: { task: 'retention_purge' } });
      }
    }

    lastTickAt = new Date();
    log.info(
      {
        duration_ms: Date.now() - startedTick,
        refreshed: summary.refreshed,
        failed: summary.failed,
        goal_refreshes: summary.goalRefreshes,
        removals_completed: summary.removals.removed,
        removals_pending: summary.removals.failed,
      },
      'scheduler_tick_completed',
    );

    // A throttled vendor is the retry budget doing its job, and it is also the
    // clearest early signal that a vendor is down for everyone rather than for
    // one user. Logged per tick rather than per occurrence so a sustained
    // outage produces one line every 15 minutes instead of thousands.
    //
    // This is a stopgap surface. `/health/integrations` is where it belongs,
    // and an unread statistic is how a control goes unnoticed for a month, so
    // it gets a reader now rather than waiting for its proper one.
    const throttled = retryBudgetStats().filter((s) => s.throttled);
    if (throttled.length > 0) {
      log.warn(
        {
          vendors: throttled.map((s) => s.vendor),
          retries_denied: throttled.reduce((n, s) => n + s.retriesDenied, 0),
        },
        'vendor_retry_budget_throttled',
      );
      // Durable now, not just a log line. The retry budget lives in memory and
      // dies with the process; a vendor that was throttled across a deploy
      // leaves no trace otherwise, which is precisely the "quietly stopped
      // moving" failure this table exists for.
      for (const s of throttled) {
        await recordOpsEvent({
          severity: 'warn',
          kind: 'vendor_throttled',
          vendor: s.vendor,
          detail: {
            retries_denied: s.retriesDenied,
            local_failures: s.localFailures,
            upstream_failures: s.upstreamFailures,
          },
        });
      }
    }

    // An ejected vendor is strictly worse news than a throttled one: the budget
    // only stops RETRYING, the breaker stops calling the vendor at all, so this
    // is the first point at which refreshes are being skipped rather than
    // merely slowed. Same durability argument as above and more so, because the
    // breaker's state is in-process and dies with the machine.
    //
    // `error`, not `warn`: a throttled vendor is a control working as designed,
    // while an ejected one means users are not getting fresh numbers.
    const ejected = openBreakers();
    if (ejected.length > 0) {
      log.error(
        {
          vendors: ejected.map((s) => s.vendor),
          reasons: ejected.map((s) => s.lastTrip),
        },
        'vendor_circuit_opened',
      );
      for (const s of ejected) {
        await recordOpsEvent({
          severity: 'error',
          kind: 'vendor_circuit_opened',
          vendor: s.vendor,
          detail: {
            trip_reason: s.lastTrip,
            consecutive_failures: s.consecutiveFailures,
            window_requests: s.windowRequests,
            window_failures: s.windowFailures,
            ejections: s.ejections,
            local_failures: s.localFailures,
            upstream_failures: s.upstreamFailures,
          },
        });
      }
    }
  } finally {
    inFlight = false;
  }

  return summary;
}

function emptyDrain(): RemovalDrainSummary {
  return { attempted: 0, removed: 0, alreadyGone: 0, failed: 0 };
}

function emptyPriceSync(): PriceSyncSummary {
  return { attempted: 0, refreshed: 0, failed: 0, unconfigured: [] };
}

type RefreshUnit = { userId: string; cls: ScheduledClass };

async function findDueClassRefreshes(now: Date): Promise<RefreshUnit[]> {
  const units: RefreshUnit[] = [];

  const [investmentUsers, cryptoUsers, defiUsers, debtUsers] = await Promise.all([
    plaidUserIds(),
    db()
      .select({ userId: coinbaseConnections.userId })
      .from(coinbaseConnections)
      .then((rows) => dedupe(rows)),
    db()
      .select({ userId: zerionWallets.userId })
      .from(zerionWallets)
      .then((rows) => dedupe(rows)),
    db()
      .select({ userId: spinwheelConnections.userId })
      .from(spinwheelConnections)
      .then((rows) => dedupe(rows)),
  ]);

  const byClass: Record<ScheduledClass, string[]> = {
    investments: investmentUsers,
    crypto: cryptoUsers,
    defi: defiUsers,
    debts: debtUsers,
  };

  for (const cls of Object.keys(byClass) as ScheduledClass[]) {
    const userIds = byClass[cls];
    if (userIds.length === 0) continue;
    const interval = CLASS_INTERVALS[cls];
    const cache = await getClassCacheForUsers(cls, userIds);

    for (const userId of userIds) {
      const row = cache.get(userId) ?? null;

      // Dead-vendor backoff: after 5 consecutive failures, wait a full
      // interval from the last attempt before retrying.
      if (
        row &&
        row.consecutiveFailures >= FAILURE_BACKOFF_THRESHOLD &&
        row.lastAttemptAt !== null &&
        now.getTime() - row.lastAttemptAt.getTime() < interval
      ) {
        continue;
      }

      const jitter = userJitter(userId, cls, TICK_INTERVAL_MS);
      const asOf = row?.asOf ?? null;
      const due = asOf === null || now.getTime() - asOf.getTime() >= interval + jitter;
      if (due) units.push({ userId, cls });
    }
  }

  return units;
}

async function findUsersDueDailyGoalRefresh(now: Date): Promise<string[]> {
  const today = now.toISOString().slice(0, 10);
  const missing = await usersMissingDailyPoint(today);
  const startOfDayUtc = Date.parse(`${today}T00:00:00.000Z`);
  return missing.filter((userId) => {
    const jitter = userJitter(userId, 'daily', DAILY_JITTER_WINDOW_MS);
    return now.getTime() >= startOfDayUtc + jitter;
  });
}

async function plaidUserIds(): Promise<string[]> {
  const rows = await db().select({ userId: plaidItems.userId }).from(plaidItems).where(isNotNull(plaidItems.userId));
  const ids = new Set<string>();
  for (const r of rows) {
    if (r.userId !== null) ids.add(r.userId);
  }
  return [...ids];
}

function dedupe(rows: Array<{ userId: string }>): string[] {
  return [...new Set(rows.map((r) => r.userId))];
}

async function runWithConcurrency<T>(width: number, items: T[], worker: (item: T) => Promise<void>): Promise<void> {
  let index = 0;
  const lanes = Array.from({ length: Math.min(width, items.length) }, async () => {
    while (index < items.length) {
      const item = items[index++]!;
      await worker(item);
    }
  });
  await Promise.all(lanes);
}
