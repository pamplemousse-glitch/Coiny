// Per-connection health (survey gaps 1 and 2).
//
// The claim under test is the survey's own worked example: a user with three
// Zerion wallets, one of which has died, must end up with something specific to
// prompt about, rather than a `defi` class that reads degraded with no way to
// say which wallet needs attention.

import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/db/client.js';
import { zerionWallets } from '../src/db/schema.js';
import {
  CONNECTION_ERROR_THRESHOLD,
  type ConnectionHealthRow,
  deriveConnectionStatus,
  failurePatch,
  isUserActionable,
  successPatch,
} from '../src/store/connection-health.js';
import { resetDatabase, testUserId } from './db-helper.js';

/** A healthy row, so each test states only the field it is about. */
function row(overrides: Partial<ConnectionHealthRow> = {}): ConnectionHealthRow {
  return {
    lastSyncedAt: new Date(),
    lastAttemptAt: new Date(),
    lastErrorClass: null,
    consecutiveFailures: 0,
    disabled: false,
    ...overrides,
  };
}

describe('deriveConnectionStatus', () => {
  it('reads ok for a connection that last succeeded', () => {
    expect(deriveConnectionStatus(row())).toBe('ok');
  });

  it('reads pending before the first fetch, never ok and never a zero', () => {
    expect(deriveConnectionStatus(row({ lastSyncedAt: null, lastAttemptAt: null }))).toBe('pending');
  });

  it('reads disconnected when disabled, whatever else is true', () => {
    // Revocation outranks everything: showing revoked data is wrong, not stale.
    expect(deriveConnectionStatus(row({ disabled: true, consecutiveFailures: 99, lastErrorClass: 'auth' }))).toBe(
      'disconnected',
    );
  });

  it('tolerates a blip below the threshold rather than crying broken', () => {
    // A connection that reads broken on a single transient failure trains the
    // user to ignore the badge, which is the same judgement plaid-health.ts
    // makes when it refuses to move an item's lifecycle on a rate limit.
    expect(deriveConnectionStatus(row({ consecutiveFailures: CONNECTION_ERROR_THRESHOLD - 1 }))).toBe('ok');
  });

  it('reads error past the threshold for a vendor-side failure', () => {
    expect(
      deriveConnectionStatus(row({ consecutiveFailures: CONNECTION_ERROR_THRESHOLD, lastErrorClass: '5xx' })),
    ).toBe('error');
  });

  it('reads reauth_required past the threshold for an auth failure', () => {
    // The distinction that decides whether the user gets a prompt at all.
    expect(
      deriveConnectionStatus(row({ consecutiveFailures: CONNECTION_ERROR_THRESHOLD, lastErrorClass: 'auth' })),
    ).toBe('reauth_required');
  });

  it('does not decide staleness, because age belongs to the value not the connection', () => {
    // A connection can be perfectly healthy and hold a value too old to count.
    // networth/classes.ts owns that, and conflating the two is how a working
    // connection ends up wearing a broken badge.
    const ancient = row({ lastSyncedAt: new Date('2020-01-01') });
    expect(deriveConnectionStatus(ancient)).toBe('ok');
  });
});

describe('isUserActionable', () => {
  it('is true only where the user is the one who can fix it', () => {
    // Plaid's own guidance and Actual Budget's `showAuth` draw the same line:
    // a rate limit or a vendor outage must not produce a "reconnect" prompt.
    expect(isUserActionable('reauth_required')).toBe(true);
    expect(isUserActionable('disconnected')).toBe(true);
    expect(isUserActionable('error')).toBe(false);
    expect(isUserActionable('ok')).toBe(false);
    expect(isUserActionable('pending')).toBe(false);
  });
});

describe('the patches', () => {
  it('a success clears the failure history, so a fixed connection loses its badge', () => {
    const patch = successPatch();
    expect(patch.consecutiveFailures).toBe(0);
    expect(patch.lastErrorClass).toBeNull();
  });

  it('a failure leaves lastSyncedAt alone, because the last good value is still real', () => {
    // Same rule as recordClassFailure: a failed refresh does not make the last
    // balance wrong, it makes it un-refreshable (R-8.1).
    const patch = failurePatch(2, 'auth');
    expect(patch.consecutiveFailures).toBe(3);
    expect(Object.keys(patch)).not.toContain('lastSyncedAt');
  });
});

describe('three wallets, one dead', () => {
  // The survey's worked example, end to end against the real table.
  beforeEach(async () => {
    await resetDatabase();
  });

  it('records health per wallet, so the broken one is identifiable', async () => {
    const inserted = await db()
      .insert(zerionWallets)
      .values([
        { userId: testUserId, address: '0xaaa' },
        { userId: testUserId, address: '0xbbb' },
        { userId: testUserId, address: '0xccc' },
      ])
      .returning({ id: zerionWallets.id, address: zerionWallets.address });

    const dead = inserted.find((w) => w.address === '0xbbb')!;
    for (const w of inserted) {
      if (w.id === dead.id) continue;
      await db().update(zerionWallets).set(successPatch()).where(eq(zerionWallets.id, w.id));
    }
    // Enough consecutive failures on one wallet to cross the threshold.
    for (let i = 0; i < CONNECTION_ERROR_THRESHOLD; i++) {
      await db().update(zerionWallets).set(failurePatch(i, 'auth')).where(eq(zerionWallets.id, dead.id));
    }

    const rows = await db().select().from(zerionWallets).where(eq(zerionWallets.userId, testUserId));
    const statuses = new Map(rows.map((r) => [r.address, deriveConnectionStatus(r)]));

    // Before this change every one of these was indistinguishable: the class
    // was degraded and the wallets carried nothing at all.
    expect(statuses.get('0xaaa')).toBe('ok');
    expect(statuses.get('0xccc')).toBe('ok');
    expect(statuses.get('0xbbb')).toBe('reauth_required');

    const actionable = rows.filter((r) => isUserActionable(deriveConnectionStatus(r)));
    expect(actionable).toHaveLength(1);
    expect(actionable[0]?.address).toBe('0xbbb');
  });
});
