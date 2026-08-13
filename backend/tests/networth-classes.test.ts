import { describe, expect, it } from 'vitest';
import { deriveStatus, FRESHNESS, includedInTotal, rollupRows } from '../src/networth/classes.js';

const NOW = new Date('2026-08-13T12:00:00Z');
const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function ago(ms: number): Date {
  return new Date(NOW.getTime() - ms);
}

describe('deriveStatus', () => {
  const policy = FRESHNESS.bank; // 24h fresh, 7d never-show

  it('reports not_connected when no provider row exists', () => {
    expect(deriveStatus({ connected: false, value: null, asOf: null, failed: false, policy, now: NOW })).toBe(
      'not_connected',
    );
  });

  it('reports disconnected when the connection was revoked', () => {
    expect(
      deriveStatus({
        connected: true,
        disconnected: true,
        value: 100,
        asOf: ago(HOUR),
        failed: false,
        policy,
        now: NOW,
      }),
    ).toBe('disconnected');
  });

  it('reports error when a fetch failed and no cache exists', () => {
    expect(deriveStatus({ connected: true, value: null, asOf: null, failed: true, policy, now: NOW })).toBe('error');
  });

  it('reports pending when connected but never fetched', () => {
    expect(deriveStatus({ connected: true, value: null, asOf: null, failed: false, policy, now: NOW })).toBe('pending');
  });

  it('reports ok within the fresh interval', () => {
    expect(deriveStatus({ connected: true, value: 5, asOf: ago(HOUR), failed: false, policy, now: NOW })).toBe('ok');
  });

  it('reports stale past the fresh interval', () => {
    expect(deriveStatus({ connected: true, value: 5, asOf: ago(2 * DAY), failed: false, policy, now: NOW })).toBe(
      'stale',
    );
  });

  it('reports stale_excluded past the never-show age', () => {
    expect(deriveStatus({ connected: true, value: 5, asOf: ago(8 * DAY), failed: false, policy, now: NOW })).toBe(
      'stale_excluded',
    );
  });

  it('reports stale, never ok, when the age is unknown', () => {
    expect(deriveStatus({ connected: true, value: 5, asOf: null, failed: false, policy, now: NOW })).toBe('stale');
  });

  it('never excludes a class whose policy has no never-show age', () => {
    expect(
      deriveStatus({
        connected: true,
        value: 5,
        asOf: ago(400 * DAY),
        failed: false,
        policy: FRESHNESS.realEstate,
        now: NOW,
      }),
    ).toBe('stale');
  });
});

describe('includedInTotal', () => {
  it('includes only ok and stale readings', () => {
    expect(includedInTotal('ok')).toBe(true);
    expect(includedInTotal('stale')).toBe(true);
  });

  it('excludes every failure and unknown state', () => {
    expect(includedInTotal('stale_excluded')).toBe(false);
    expect(includedInTotal('error')).toBe(false);
    expect(includedInTotal('disconnected')).toBe(false);
    expect(includedInTotal('not_connected')).toBe(false);
    expect(includedInTotal('pending')).toBe(false);
  });
});

describe('rollupRows', () => {
  const policy = FRESHNESS.chainWallets; // 6h fresh, 7d never-show

  it('reports not_connected for an empty row set', () => {
    expect(rollupRows([], policy, NOW).status).toBe('not_connected');
  });

  it('reports pending when rows exist but nothing is priced', () => {
    const r = rollupRows([{ valueUsd: null, syncedAt: null }], policy, NOW);
    expect(r.status).toBe('pending');
    expect(r.value).toBeNull();
  });

  it('sums fresh rows into an ok reading', () => {
    const r = rollupRows(
      [
        { valueUsd: 100, syncedAt: ago(HOUR) },
        { valueUsd: 50, syncedAt: ago(2 * HOUR) },
      ],
      policy,
      NOW,
    );
    expect(r.value).toBe(150);
    expect(r.status).toBe('ok');
  });

  it('uses the oldest contributing row as the class asOf', () => {
    const r = rollupRows(
      [
        { valueUsd: 100, syncedAt: ago(HOUR) },
        { valueUsd: 50, syncedAt: ago(3 * DAY) },
      ],
      policy,
      NOW,
    );
    expect(r.asOf).toBe(ago(3 * DAY).toISOString());
    expect(r.status).toBe('stale');
  });

  it('drops rows past the never-show age from the sum individually', () => {
    const r = rollupRows(
      [
        { valueUsd: 100, syncedAt: ago(HOUR) },
        { valueUsd: 999, syncedAt: ago(10 * DAY) },
      ],
      policy,
      NOW,
    );
    expect(r.value).toBe(100);
    expect(r.status).toBe('ok');
  });

  it('reports stale_excluded with the muted sum when every row is expired', () => {
    const r = rollupRows([{ valueUsd: 999, syncedAt: ago(10 * DAY) }], policy, NOW);
    expect(r.value).toBe(999);
    expect(r.status).toBe('stale_excluded');
  });

  it('keeps rows with unknown age included, as stale', () => {
    const r = rollupRows(
      [
        { valueUsd: 100, syncedAt: ago(HOUR) },
        { valueUsd: 50, syncedAt: null },
      ],
      policy,
      NOW,
    );
    expect(r.value).toBe(150);
    expect(r.asOf).toBeNull();
    expect(r.status).toBe('stale');
  });
});

// R-8.5 into R-8.4: the Plaid item lifecycle column now drives two statuses
// that the read path previously could never emit, which left the Wealth screen
// unable to show that a bank had broken.
describe('provider lifecycle statuses', () => {
  const policy = { freshMs: 24 * 60 * 60 * 1000, excludeMs: 7 * 24 * 60 * 60 * 1000 };
  const now = new Date('2026-08-13T12:00:00Z');
  const base = { connected: true, value: 1000, failed: false, policy, now };

  it('reports reauth_required instead of ok while the value is still fresh', () => {
    const status = deriveStatus({ ...base, asOf: now, health: 'reauth_required' });
    expect(status).toBe('reauth_required');
  });

  // A broken login does not make the last known balance wrong, it makes it
  // un-refreshable. Dropping it would swing the user's total for a reason that
  // has nothing to do with their money.
  it('keeps a reauth_required value in the total', () => {
    expect(includedInTotal('reauth_required')).toBe(true);
  });

  it('drops a reauth_required value once it passes the never-show age', () => {
    const old = new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000);
    expect(deriveStatus({ ...base, asOf: old, health: 'reauth_required' })).toBe('stale_excluded');
  });

  it('lets an expiring connection keep flowing normally', () => {
    expect(deriveStatus({ ...base, asOf: now, health: 'expiring' })).toBe('expiring');
    expect(includedInTotal('expiring')).toBe(true);
  });

  // Showing revoked data is wrong, not stale, so revocation outranks both.
  it('does not let lifecycle state mask a revocation', () => {
    const status = deriveStatus({ ...base, asOf: now, disconnected: true, health: 'expiring' });
    expect(status).toBe('disconnected');
  });

  it('does not invent a value when the class has none', () => {
    const status = deriveStatus({ ...base, value: null, asOf: null, failed: true, health: 'reauth_required' });
    expect(status).toBe('error');
  });
});
