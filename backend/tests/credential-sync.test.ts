// The credential-vendor sweep (sync/credential-vendors.ts).
//
// This file is about the SCHEDULING decision: who is due, what a lapsed grant
// counts as, and whether one broken connection can freeze everybody else's.
// The vendor wire formats keep their coverage in their own test files, so the
// clients here are mocked.

import { and, eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetDatabase, testUserId } from './db-helper.js';

vi.mock('../src/kraken/client.js', () => ({
  getBalance: vi.fn(),
  getTotalUsd: vi.fn(),
}));
vi.mock('../src/coinbase/client.js', () => ({
  getSpotPrices: vi.fn(async () => new Map<string, number>()),
}));

import { getTotalUsd } from '../src/kraken/client.js';

const mockedKraken = vi.mocked(getTotalUsd);

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const NOW = new Date('2026-09-02T12:00:00.000Z');

/** A rejected credential, in the shape `classifyError` reads. */
class AuthError extends Error {
  status = 401;
}

async function addKraken(patch: {
  lastAttemptAt?: Date | null;
  consecutiveFailures?: number;
  disabled?: boolean;
  userId?: string;
}) {
  const { db } = await import('../src/db/client.js');
  const { krakenConnections } = await import('../src/db/schema.js');
  const { encryptString } = await import('../src/util/crypto.js');
  await db()
    .insert(krakenConnections)
    .values({
      userId: patch.userId ?? testUserId,
      apiKey: encryptString('key'),
      privateKey: encryptString('secret'),
      lastAttemptAt: patch.lastAttemptAt ?? null,
      consecutiveFailures: patch.consecutiveFailures ?? 0,
      disabled: patch.disabled ?? false,
    });
}

async function krakenTask() {
  const { CREDENTIAL_SYNC_TASKS } = await import('../src/sync/credential-vendors.js');
  const task = CREDENTIAL_SYNC_TASKS.find((t) => t.key === 'kraken');
  if (!task) throw new Error('kraken task missing from the registry');
  return task;
}

describe('credential vendor sweep', () => {
  beforeEach(async () => {
    vi.resetAllMocks();
    await resetDatabase();
  });

  // MARK: the registry

  it('covers every credential vendor with a positive interval', async () => {
    const { CREDENTIAL_SYNC_TASKS, CREDENTIAL_SYNC_VENDOR_KEYS } = await import('../src/sync/credential-vendors.js');

    // The ten the handoff named as nine. YNAB is the tenth: it has the same
    // health columns and the same manual-only refresh, and nothing in
    // networth/refresh.ts touches ynab_connections.
    expect(CREDENTIAL_SYNC_VENDOR_KEYS.sort()).toEqual(
      [
        'alpaca',
        'chain_wallets',
        'discogs',
        'hyperliquid',
        'kalshi',
        'kraken',
        'nft',
        'polymarket',
        'truelayer',
        'ynab',
      ].sort(),
    );
    for (const task of CREDENTIAL_SYNC_TASKS) {
      expect(task.intervalMs).toBeGreaterThan(0);
    }
  });

  it('does not overlap the classes networth/refresh.ts already schedules', async () => {
    const { CREDENTIAL_SYNC_VENDOR_KEYS } = await import('../src/sync/credential-vendors.js');

    // Coinbase rides `crypto`, Zerion rides `defi`, Spinwheel rides `debts`,
    // Plaid rides `investments`. Adding one here would refresh it twice per
    // interval and double its vendor cost.
    expect(CREDENTIAL_SYNC_VENDOR_KEYS).not.toContain('coinbase');
    expect(CREDENTIAL_SYNC_VENDOR_KEYS).not.toContain('zerion');
    expect(CREDENTIAL_SYNC_VENDOR_KEYS).not.toContain('spinwheel');
  });

  // MARK: due-ness

  it('treats a connection that has never been attempted as due', async () => {
    await addKraken({ lastAttemptAt: null });
    const { usersDueForCredentialSync } = await import('../src/sync/credential-vendors.js');

    const due = await usersDueForCredentialSync(await krakenTask(), NOW);

    expect(due).toContain(testUserId);
  });

  it('treats a connection older than its interval as due', async () => {
    await addKraken({ lastAttemptAt: new Date(NOW.getTime() - 2 * DAY) });
    const { usersDueForCredentialSync } = await import('../src/sync/credential-vendors.js');

    const due = await usersDueForCredentialSync(await krakenTask(), NOW);

    expect(due).toContain(testUserId);
  });

  it('leaves a freshly attempted connection alone', async () => {
    await addKraken({ lastAttemptAt: new Date(NOW.getTime() - 60 * 1000) });
    const { usersDueForCredentialSync } = await import('../src/sync/credential-vendors.js');

    const due = await usersDueForCredentialSync(await krakenTask(), NOW);

    expect(due).not.toContain(testUserId);
  });

  it('never touches a disabled connection', async () => {
    await addKraken({ lastAttemptAt: null, disabled: true });
    const { usersDueForCredentialSync } = await import('../src/sync/credential-vendors.js');

    // The user turned it off, or we did. Either way it is not a connection.
    expect(await usersDueForCredentialSync(await krakenTask(), NOW)).toEqual([]);
  });

  // The whole reason due-ness reads lastAttemptAt and not lastSyncedAt: a
  // revoked grant never succeeds again, so a lastSyncedAt rule would make it
  // due on every tick forever.
  it('backs a broken connection off past its normal interval', async () => {
    const { CONNECTION_ERROR_THRESHOLD } = await import('../src/store/connection-health.js');
    await addKraken({
      lastAttemptAt: new Date(NOW.getTime() - 8 * HOUR),
      consecutiveFailures: CONNECTION_ERROR_THRESHOLD,
    });
    const { usersDueForCredentialSync } = await import('../src/sync/credential-vendors.js');

    // Eight hours is past Kraken's six-hour interval and inside the broken
    // one, so a healthy connection would be due here and this one is not.
    expect(await usersDueForCredentialSync(await krakenTask(), NOW)).toEqual([]);
  });

  it('retries a broken connection once the longer interval passes', async () => {
    const { CONNECTION_ERROR_THRESHOLD } = await import('../src/store/connection-health.js');
    const { BROKEN_RETRY_INTERVAL_MS, usersDueForCredentialSync } = await import('../src/sync/credential-vendors.js');
    await addKraken({
      lastAttemptAt: new Date(NOW.getTime() - BROKEN_RETRY_INTERVAL_MS - HOUR),
      consecutiveFailures: CONNECTION_ERROR_THRESHOLD,
    });

    // Non-zero backoff, not abandonment: half of these failures are vendor
    // outages that fix themselves, and that case must heal with no user action.
    expect(await usersDueForCredentialSync(await krakenTask(), NOW)).toContain(testUserId);
  });

  // MARK: running

  it('refreshes a due connection and writes the value back', async () => {
    await addKraken({ lastAttemptAt: new Date(NOW.getTime() - 2 * DAY) });
    mockedKraken.mockResolvedValue(4200);
    const { runCredentialSync } = await import('../src/sync/credential-vendors.js');

    const summary = await runCredentialSync(NOW);

    expect(summary.refreshed).toBe(1);
    expect(summary.failed).toBe(0);

    const { db } = await import('../src/db/client.js');
    const { krakenConnections } = await import('../src/db/schema.js');
    const [row] = await db().select().from(krakenConnections);
    expect(parseFloat(row!.lastTotalUsd!)).toBe(4200);
    expect(row!.lastSyncedAt).not.toBeNull();
  });

  it('clears the failure history on a success', async () => {
    await addKraken({ lastAttemptAt: new Date(NOW.getTime() - 2 * DAY), consecutiveFailures: 2 });
    mockedKraken.mockResolvedValue(1);
    const { runCredentialSync } = await import('../src/sync/credential-vendors.js');

    await runCredentialSync(NOW);

    const { db } = await import('../src/db/client.js');
    const { krakenConnections } = await import('../src/db/schema.js');
    const [row] = await db().select().from(krakenConnections);
    // A working connection must not keep wearing a badge from last week.
    expect(row!.consecutiveFailures).toBe(0);
  });

  // The reason this is a separate registry from the price classes.
  it('counts a lapsed credential as reauth_required, not as a failure', async () => {
    await addKraken({ lastAttemptAt: new Date(NOW.getTime() - 2 * DAY) });
    mockedKraken.mockRejectedValue(new AuthError('key rejected'));
    const { runCredentialSync } = await import('../src/sync/credential-vendors.js');

    const summary = await runCredentialSync(NOW);

    expect(summary.reauthRequired).toBe(1);
    expect(summary.failed).toBe(0);
  });

  it('leaves the connection showing reauth_required after a lapsed credential', async () => {
    await addKraken({ lastAttemptAt: new Date(NOW.getTime() - 2 * DAY), consecutiveFailures: 2 });
    mockedKraken.mockRejectedValue(new AuthError('key rejected'));
    const { runCredentialSync } = await import('../src/sync/credential-vendors.js');

    await runCredentialSync(NOW);

    const { db } = await import('../src/db/client.js');
    const { krakenConnections } = await import('../src/db/schema.js');
    const { deriveConnectionStatus } = await import('../src/store/connection-health.js');
    const [row] = await db().select().from(krakenConnections);
    // The point of the sweep: the app can now ask this person to reconnect
    // without waiting for them to open the Kraken screen and notice.
    expect(deriveConnectionStatus(row!)).toBe('reauth_required');
  });

  it('leaves the last known value alone when a refresh fails', async () => {
    await addKraken({ lastAttemptAt: new Date(NOW.getTime() - 2 * DAY) });
    mockedKraken.mockResolvedValue(900);
    const { runCredentialSync } = await import('../src/sync/credential-vendors.js');
    await runCredentialSync(NOW);

    mockedKraken.mockRejectedValue(new AuthError('key rejected'));
    await runCredentialSync(new Date(NOW.getTime() + 30 * DAY));

    const { db } = await import('../src/db/client.js');
    const { krakenConnections } = await import('../src/db/schema.js');
    const [row] = await db().select().from(krakenConnections);
    // A failed refresh does not make the last good value wrong, it makes it
    // un-refreshable (R-8.1). It reads as stale, never as zero.
    expect(parseFloat(row!.lastTotalUsd!)).toBe(900);
  });

  it('records the attempt even when the vendor fails, so the retry backs off', async () => {
    await addKraken({ lastAttemptAt: new Date(NOW.getTime() - 2 * DAY) });
    mockedKraken.mockRejectedValue(new Error('upstream exploded'));
    const { runCredentialSync } = await import('../src/sync/credential-vendors.js');

    await runCredentialSync(NOW);

    const { db } = await import('../src/db/client.js');
    const { krakenConnections } = await import('../src/db/schema.js');
    const [row] = await db().select().from(krakenConnections);
    expect(row!.lastAttemptAt!.getTime()).toBeGreaterThan(NOW.getTime() - HOUR);
    expect(row!.consecutiveFailures).toBe(1);
  });

  it('counts a vendor outage as a failure rather than a reauth', async () => {
    await addKraken({ lastAttemptAt: new Date(NOW.getTime() - 2 * DAY) });
    mockedKraken.mockRejectedValue(new Error('upstream exploded'));
    const { runCredentialSync } = await import('../src/sync/credential-vendors.js');

    const summary = await runCredentialSync(NOW);

    // Ours or the vendor's to fix. Prompting the user would be telling them to
    // go and repair somebody else's server.
    expect(summary.failed).toBe(1);
    expect(summary.reauthRequired).toBe(0);
  });

  it('keeps going for other users after one of them fails', async () => {
    const { findOrCreateUser } = await import('../src/store/users.js');
    const second = await findOrCreateUser({ appleSub: 'second_user_sub' });
    await addKraken({ lastAttemptAt: new Date(NOW.getTime() - 2 * DAY) });
    await addKraken({ userId: second, lastAttemptAt: new Date(NOW.getTime() - 2 * DAY) });
    mockedKraken.mockRejectedValueOnce(new Error('upstream exploded')).mockResolvedValue(500);
    const { runCredentialSync } = await import('../src/sync/credential-vendors.js');

    const summary = await runCredentialSync(NOW);

    // One revoked grant must never freeze everybody else's balances.
    expect(summary.attempted).toBe(2);
    expect(summary.failed).toBe(1);
    expect(summary.refreshed).toBe(1);
  });

  it('abandons a vendor that fails for consecutive users in one tick', async () => {
    const { findOrCreateUser } = await import('../src/store/users.js');
    const { VENDOR_ABORT_THRESHOLD, runCredentialSync } = await import('../src/sync/credential-vendors.js');
    await addKraken({ lastAttemptAt: new Date(NOW.getTime() - 2 * DAY) });
    for (let i = 0; i < VENDOR_ABORT_THRESHOLD; i++) {
      const id = await findOrCreateUser({ appleSub: `bulk_user_${i}` });
      await addKraken({ userId: id, lastAttemptAt: new Date(NOW.getTime() - 2 * DAY) });
    }
    mockedKraken.mockRejectedValue(new Error('upstream exploded'));

    const summary = await runCredentialSync(NOW);

    // That many identical failures is the vendor, and walking the rest of the
    // users to collect the same error costs the tick and tells nobody anything.
    expect(summary.abandoned).toContain('kraken');
    expect(summary.attempted).toBe(VENDOR_ABORT_THRESHOLD);
  });

  it('never abandons a vendor over lapsed credentials alone', async () => {
    const { findOrCreateUser } = await import('../src/store/users.js');
    const { VENDOR_ABORT_THRESHOLD, runCredentialSync } = await import('../src/sync/credential-vendors.js');
    await addKraken({ lastAttemptAt: new Date(NOW.getTime() - 2 * DAY) });
    for (let i = 0; i < VENDOR_ABORT_THRESHOLD + 1; i++) {
      const id = await findOrCreateUser({ appleSub: `lapsed_user_${i}` });
      await addKraken({ userId: id, lastAttemptAt: new Date(NOW.getTime() - 2 * DAY) });
    }
    mockedKraken.mockRejectedValue(new AuthError('key rejected'));

    const summary = await runCredentialSync(NOW);

    // Every user's key being rejected says nothing about Kraken being up, and
    // abandoning the sweep would leave the last users' connections never
    // discovered as broken.
    expect(summary.abandoned).toEqual([]);
    expect(summary.reauthRequired).toBe(VENDOR_ABORT_THRESHOLD + 2);
  });

  it('does nothing at all when nobody is due', async () => {
    await addKraken({ lastAttemptAt: new Date(NOW.getTime() - 60 * 1000) });
    const { runCredentialSync } = await import('../src/sync/credential-vendors.js');

    const summary = await runCredentialSync(NOW);

    expect(summary).toEqual({ attempted: 0, refreshed: 0, failed: 0, reauthRequired: 0, abandoned: [] });
    expect(mockedKraken).not.toHaveBeenCalled();
  });

  it('scopes every write to the user it synced', async () => {
    const { findOrCreateUser } = await import('../src/store/users.js');
    const other = await findOrCreateUser({ appleSub: 'untouched_user_sub' });
    await addKraken({ lastAttemptAt: new Date(NOW.getTime() - 2 * DAY) });
    await addKraken({ userId: other, lastAttemptAt: new Date(NOW.getTime() - 60 * 1000) });
    mockedKraken.mockResolvedValue(77);
    const { runCredentialSync } = await import('../src/sync/credential-vendors.js');

    await runCredentialSync(NOW);

    const { db } = await import('../src/db/client.js');
    const { krakenConnections } = await import('../src/db/schema.js');
    const [untouched] = await db()
      .select()
      .from(krakenConnections)
      .where(and(eq(krakenConnections.userId, other)));
    // BOLA in a scheduled job looks like writing one user's balance onto
    // another's row (.claude/rules/security.md #6).
    expect(untouched!.lastTotalUsd).toBeNull();
  });
});
