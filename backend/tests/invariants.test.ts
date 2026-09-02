// Plausibility checks (survey part B).
//
// The two incidents these exist for are named in the module, and the tests
// below reproduce their SHAPES rather than their specifics: a value that
// collapses without erroring, and a value that becomes exactly zero. Both
// parse cleanly, which is why schema validation was never going to catch them.

import { beforeEach, describe, expect, it } from 'vitest';
import { config } from '../src/config.js';
import { db } from '../src/db/client.js';
import { opsEvents } from '../src/db/schema.js';
import { checkValueTransition } from '../src/resilience/invariants.js';
import { recordClassSuccess } from '../src/store/asset-cache.js';
import { resetDatabase, testUserId } from './db-helper.js';

/** The shipped thresholds, so a test that passes here is a test about the
 *  behaviour users get rather than about numbers invented for the test. */
const THRESHOLDS = {
  collapseRatio: config.INVARIANT_COLLAPSE_RATIO,
  spikeRatio: config.INVARIANT_SPIKE_RATIO,
  minPreviousUsd: config.INVARIANT_MIN_PREVIOUS_USD,
};

describe('checkValueTransition', () => {
  it('says nothing about a first fetch, because a baseline is a profile not an alarm', () => {
    // A canary that alerts on day one is a canary that gets muted by week two.
    expect(checkValueTransition(null, 0, THRESHOLDS)).toBeNull();
    expect(checkValueTransition(null, 12_345, THRESHOLDS)).toBeNull();
  });

  it('ignores ordinary movement', () => {
    expect(checkValueTransition(10_000, 9_000, THRESHOLDS)).toBeNull();
    expect(checkValueTransition(10_000, 12_000, THRESHOLDS)).toBeNull();
    // A bad day in the market must not fire, or the alert gets muted and a
    // muted alert is worse than none because it reads as coverage.
    expect(checkValueTransition(10_000, 5_000, THRESHOLDS)).toBeNull();
  });

  it('catches the Polkadot shape: a collapse to dust with no error', () => {
    // #302. The relay chain kept answering 200 OK after balances moved to
    // Asset Hub, so every DOT holder read as near-empty. Right type, right
    // field, wrong magnitude.
    const check = checkValueTransition(8_400, 3, THRESHOLDS);
    expect(check?.violation).toBe('value_collapsed');
    expect(check?.dropPercent).toBe(100);
  });

  it('reports an exact zero separately from a collapse, because the causes differ', () => {
    // #289's shape: all thirteen chain clients returned 0 on every failure
    // path, so an expired key wrote a whole position to zero. That is a
    // different bug from a magnitude error and wants a different fix, so it
    // gets its own name rather than being folded into a 100% drop.
    expect(checkValueTransition(8_400, 0, THRESHOLDS)?.violation).toBe('zero_from_non_zero');
  });

  it('catches a value becoming unpriceable, which silently shrinks the total', () => {
    expect(checkValueTransition(8_400, null, THRESHOLDS)?.violation).toBe('null_from_value');
  });

  it('says nothing when there was nothing to lose', () => {
    // Only a previously positive value can collapse. A zero going to zero, or
    // to null, is not evidence of anything.
    expect(checkValueTransition(0, 0, THRESHOLDS)).toBeNull();
    expect(checkValueTransition(0, null, THRESHOLDS)).toBeNull();
  });

  it('does not fire on a debt, where the sign makes the ratio meaningless', () => {
    expect(checkValueTransition(-5_000, -10, THRESHOLDS)).toBeNull();
  });

  it('reports the drop as whole percent, not a full-precision ratio of two balances', () => {
    expect(checkValueTransition(1_000, 50, THRESHOLDS)?.dropPercent).toBe(95);
  });

  // The other direction. Every check above watches the number get smaller, and
  // a unit error breaks whichever way the units moved.

  it('catches a cents-for-dollars unit error, the shape nobody reports', () => {
    // A vendor that starts answering in cents multiplies a balance by exactly
    // 100. It parses, it is positive, and it looks like extraordinary news, so
    // unlike a collapse the user has no reason to complain about it.
    const check = checkValueTransition(4_200, 420_000, THRESHOLDS);
    expect(check?.violation).toBe('value_inflated');
    expect(check?.growthFactor).toBe(100);
  });

  it('catches a milliunits error', () => {
    // The shape api/ynab.ts already divides by 1000 to avoid.
    expect(checkValueTransition(1_500, 1_500_000, THRESHOLDS)?.violation).toBe('value_inflated');
  });

  it('catches a wei-for-ether error without overflowing the factor', () => {
    const check = checkValueTransition(1_000, 1e21, THRESHOLDS);
    expect(check?.violation).toBe('value_inflated');
    expect(check?.growthFactor).toBe(1e18);
  });

  it('ignores a very good day, which is a different question', () => {
    // A portfolio can double. No portfolio multiplies by a hundred between two
    // refreshes, which is why the threshold sits at the smallest unit error
    // rather than at "suspiciously good".
    expect(checkValueTransition(10_000, 25_000, THRESHOLDS)).toBeNull();
  });

  it('ignores a small balance that grew a lot, because that is a deposit', () => {
    // $2 receiving $500 has grown 250 times and nothing is wrong. Without the
    // floor this fires constantly on honest behaviour, and an alert that fires
    // on honest behaviour is an alert that gets muted.
    expect(checkValueTransition(2, 500, THRESHOLDS)).toBeNull();
  });

  it('still catches a unit error on a balance just above the floor', () => {
    // The floor costs almost nothing in detection: a unit error is
    // proportional, so it trips the same ratio at any size.
    const justAbove = config.INVARIANT_MIN_PREVIOUS_USD;
    expect(checkValueTransition(justAbove, justAbove * 100, THRESHOLDS)?.violation).toBe('value_inflated');
  });

  it('does not report a growth factor on a collapse', () => {
    expect(checkValueTransition(8_400, 3, THRESHOLDS)?.growthFactor).toBeUndefined();
  });
});

describe('recordClassSuccess', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('WRITES THE VALUE ANYWAY when an invariant fires', async () => {
    // The single most important behaviour in this file. A user who genuinely
    // sold everything must still see the truth; from inside one account that is
    // indistinguishable from the bug. Blocking the write would turn a
    // monitoring feature into an outage, which is strictly worse than the
    // failure it is trying to catch.
    await recordClassSuccess(testUserId, 'crypto', { valueUsd: 8_400, payload: null });
    await recordClassSuccess(testUserId, 'crypto', { valueUsd: 3, payload: null });

    const { getClassCache } = await import('../src/store/asset-cache.js');
    const cache = await getClassCache(testUserId);
    expect(Number(cache.get('crypto')?.valueUsd)).toBe(3);
  });

  it('records the violation as an ops event, so it reaches the health rollup', async () => {
    await recordClassSuccess(testUserId, 'crypto', { valueUsd: 8_400, payload: null });
    await recordClassSuccess(testUserId, 'crypto', { valueUsd: 3, payload: null });

    const rows = await db().select().from(opsEvents);
    const violations = rows.filter((r) => r.kind === 'invariant_violated');
    expect(violations).toHaveLength(1);
    expect(violations[0]?.errorClass).toBe('value_collapsed');
    expect(violations[0]?.detail).toMatchObject({ asset_class: 'crypto' });
  });

  it('carries no user identifier into the ops row', async () => {
    await recordClassSuccess(testUserId, 'crypto', { valueUsd: 8_400, payload: null });
    await recordClassSuccess(testUserId, 'crypto', { valueUsd: 0, payload: null });

    const rows = await db().select().from(opsEvents);
    expect(JSON.stringify(rows)).not.toContain(testUserId);
  });

  it('stays quiet through a normal sequence of refreshes', async () => {
    for (const v of [10_000, 10_500, 9_800, 11_200]) {
      await recordClassSuccess(testUserId, 'crypto', { valueUsd: v, payload: null });
    }

    const rows = await db().select().from(opsEvents);
    expect(rows.filter((r) => r.kind === 'invariant_violated')).toHaveLength(0);
  });

  it('records an inflation with its growth factor, so the magnitude names the bug', async () => {
    await recordClassSuccess(testUserId, 'crypto', { valueUsd: 4_200, payload: null });
    await recordClassSuccess(testUserId, 'crypto', { valueUsd: 420_000, payload: null });

    const rows = await db().select().from(opsEvents);
    const violations = rows.filter((r) => r.kind === 'invariant_violated');
    expect(violations).toHaveLength(1);
    expect(violations[0]?.errorClass).toBe('value_inflated');
    // 100 is cents-for-dollars, 1000 is milliunits, 1e18 is wei. The number is
    // the diagnosis.
    expect(violations[0]?.detail).toMatchObject({ growth_factor: 100 });
  });

  it('does not fire on the bank bookkeeping row, whose value is legitimately null', async () => {
    // `bank` stores null by design: its values live per account in
    // plaid_account_balances. A null-from-null transition is not a violation.
    await recordClassSuccess(testUserId, 'bank', { valueUsd: null, payload: null });
    await recordClassSuccess(testUserId, 'bank', { valueUsd: null, payload: null });

    const rows = await db().select().from(opsEvents);
    expect(rows.filter((r) => r.kind === 'invariant_violated')).toHaveLength(0);
  });
});
