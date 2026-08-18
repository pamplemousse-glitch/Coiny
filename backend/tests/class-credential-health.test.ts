// testing-strategy section 8 item 4, the slice that needs no schema change.
//
// The per-class health machinery was Plaid-shaped: `bank` computed a health
// value from plaid_items.status and every other class passed none. So a
// Coinbase key the user revoked read as a generic error, or as `stale` beside
// a confident total, and the user cannot fix what the app does not name.
//
// classifyError already maps 401/403 to 'auth' and recordClassFailure already
// stores it. The fact was being recorded and discarded at the read.

import { beforeEach, describe, expect, it } from 'vitest';
import { resetDatabase, testUserId } from './db-helper.js';

async function cryptoStatus(): Promise<string> {
  const { assembleNetWorth } = await import('../src/networth/read.js');
  const res = await assembleNetWorth(testUserId);
  return (res.response.classes.crypto as { status: string }).status;
}

beforeEach(async () => {
  await resetDatabase();
  const { db } = await import('../src/db/client.js');
  const { coinbaseConnections } = await import('../src/db/schema.js');
  await db().insert(coinbaseConnections).values({ userId: testUserId, mode: 'oauth' });

  // A connection that WORKED first, which is the case that matters and the
  // only one this can address. A class that never once succeeded still reads
  // 'error', deliberately: 'reauth_required' is included in the total, so
  // letting it win with no value would drop a failing class out of the
  // `excluded` counter, which is what makes a vendor outage visible instead of
  // reading as a smaller number. That ordering is pinned by
  // tests/networth-classes.test.ts and this feature does not get to break it.
  const { recordClassSuccess } = await import('../src/store/asset-cache.js');
  await recordClassSuccess(testUserId, 'crypto', { valueUsd: 4200, payload: { positions: [] } });
});

describe('a revoked non-Plaid credential', () => {
  it('reads as reauth_required rather than a generic error', async () => {
    const { recordClassFailure } = await import('../src/store/asset-cache.js');
    await recordClassFailure(testUserId, 'crypto', 'auth');

    expect(await cryptoStatus()).toBe('reauth_required');
  });

  // A vendor outage is not the user's problem to fix. Asking them to
  // re-authenticate over a 5xx is how a real warning becomes noise.
  it('does not claim reauth_required for a transient failure', async () => {
    const { recordClassFailure } = await import('../src/store/asset-cache.js');
    await recordClassFailure(testUserId, 'crypto', '5xx');

    expect(await cryptoStatus()).not.toBe('reauth_required');
  });

  // recordClassSuccess nulls lastErrorClass, so the state cannot latch on
  // after the user re-links.
  it('clears once a refresh succeeds', async () => {
    const { recordClassFailure, recordClassSuccess } = await import('../src/store/asset-cache.js');
    await recordClassFailure(testUserId, 'crypto', 'auth');
    expect(await cryptoStatus()).toBe('reauth_required');

    await recordClassSuccess(testUserId, 'crypto', { valueUsd: 100, payload: { positions: [] } });

    expect(await cryptoStatus()).not.toBe('reauth_required');
  });
});
