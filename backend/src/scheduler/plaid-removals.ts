// Drains the Plaid removal queue: retries /item/remove for every Item whose
// removal failed while the user was unlinking, until Plaid accepts it.
//
// Runs on the scheduler's tick (R-16.2 owns every timer in this codebase).
// Ungated by any daily window, unlike the retention purge: an Item sitting in
// this queue is accruing a monthly charge we cannot otherwise cancel, so the
// right cadence is every tick, held back only by each row's own backoff.
//
// Counts only in the log line, never a token or an institution
// (.claude/rules/security.md #2).

import { itemRemove } from '../plaid/client.js';
import { PlaidApiError } from '../plaid/types.js';
import { dequeueItemRemoval, listDueRemovals, recordRemovalAttempt } from '../store/plaid-removal-queue.js';

/**
 * Plaid error codes that mean there is nothing left at Plaid to remove, so the
 * row can go.
 *
 * ITEM_NOT_FOUND: verified against the vendored contract, "This Item does not
 * exist, has been previously removed via /item/remove, or has had access
 * removed by the user." All three mean nothing is being billed.
 *
 * INVALID_ACCESS_TOKEN: "could not find matching access token". The token
 * addresses nothing under these credentials, so no retry of ours can ever
 * cancel anything with it, and holding the ciphertext forever buys nothing.
 *
 * Every other code, including INVALID_API_KEYS, is retried. Those describe our
 * configuration or Plaid's availability, not the Item's existence, and giving
 * up on them would re-open the leak the queue closes.
 */
const TERMINAL_ERROR_CODES = new Set(['ITEM_NOT_FOUND', 'INVALID_ACCESS_TOKEN']);

export type RemovalDrainSummary = {
  /** Rows whose backoff had elapsed and were tried this tick. */
  attempted: number;
  /** Removals Plaid accepted. The billing stops here. */
  removed: number;
  /** Rows dropped because Plaid says the Item is already gone. */
  alreadyGone: number;
  /** Rows still queued, to be retried after their next backoff. */
  failed: number;
};

type DrainLogger = {
  info: (obj: Record<string, unknown>, msg: string) => void;
  warn: (obj: Record<string, unknown>, msg: string) => void;
};

const silentLogger: DrainLogger = { info: () => {}, warn: () => {} };

export async function drainPlaidRemovalQueue(
  now: Date = new Date(),
  log: DrainLogger = silentLogger,
): Promise<RemovalDrainSummary> {
  const summary: RemovalDrainSummary = { attempted: 0, removed: 0, alreadyGone: 0, failed: 0 };
  const due = await listDueRemovals(now);

  for (const row of due) {
    summary.attempted += 1;
    try {
      await itemRemove(row.accessToken);
      await dequeueItemRemoval(row.itemId);
      summary.removed += 1;
      log.info({ item_id: row.itemId, attempts: row.attempts }, 'plaid item removal completed from queue');
    } catch (err) {
      const errorCode = err instanceof PlaidApiError ? err.body.error_code : null;

      if (errorCode !== null && TERMINAL_ERROR_CODES.has(errorCode)) {
        await dequeueItemRemoval(row.itemId);
        summary.alreadyGone += 1;
        log.info(
          { item_id: row.itemId, plaid_error_code: errorCode },
          'plaid item already gone; removal queue row dropped',
        );
        continue;
      }

      await recordRemovalAttempt(row.itemId, errorCode);
      summary.failed += 1;
      // Warn, not info: every tick this stays queued is a month of billing
      // getting closer, and the queue is empty in the normal case.
      log.warn(
        { item_id: row.itemId, plaid_error_code: errorCode, attempts: row.attempts + 1 },
        'plaid item removal still failing; will retry',
      );
    }
  }

  return summary;
}
