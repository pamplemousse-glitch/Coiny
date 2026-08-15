// The scheduler (prd.md R-16.2, engineering-budgets.md section 3): one
// in-process 15-minute tick started from server boot. Node built-ins only, no
// queue infrastructure. Per tick it (a) refreshes classes whose cache is older
// than their section-2 interval, with per-user jitter and a concurrency cap,
// and (b) runs the daily goal refresh (net_worth_daily point, ladder
// re-evaluation, milestone baseline) for users with no point today, so a
// dormant user's series has no gaps.
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
import { getClassCacheForUsers } from '../store/asset-cache.js';
import { usersMissingDailyPoint } from '../store/goals.js';

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
};

const silentLogger: SchedulerLogger = { info: () => {}, warn: () => {} };

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
};

export async function runSchedulerTick(
  now: Date = new Date(),
  log: SchedulerLogger = silentLogger,
): Promise<TickSummary> {
  if (inFlight) {
    log.info({}, 'scheduler_tick_skipped');
    return { skipped: true, refreshed: 0, failed: 0, goalRefreshes: 0 };
  }
  inFlight = true;
  const summary: TickSummary = { skipped: false, refreshed: 0, failed: 0, goalRefreshes: 0 };
  const startedTick = Date.now();

  try {
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

    const dueUsers = await findUsersDueDailyGoalRefresh(now);
    await runWithConcurrency(CONCURRENCY, dueUsers, async (userId) => {
      try {
        await runGoalRefreshFromCache(userId, now);
        summary.goalRefreshes++;
      } catch (err) {
        log.warn({ user_id: userId, err }, 'daily goal refresh failed');
      }
    });

    lastTickAt = new Date();
    log.info(
      {
        duration_ms: Date.now() - startedTick,
        refreshed: summary.refreshed,
        failed: summary.failed,
        goal_refreshes: summary.goalRefreshes,
      },
      'scheduler_tick_completed',
    );
  } finally {
    inFlight = false;
  }

  return summary;
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
