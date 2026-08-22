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

const RATIO = config.INVARIANT_COLLAPSE_RATIO;

describe('checkValueTransition', () => {
  it('says nothing about a first fetch, because a baseline is a profile not an alarm', () => {
    // A canary that alerts on day one is a canary that gets muted by week two.
    expect(checkValueTransition(null, 0, RATIO)).toBeNull();
    expect(checkValueTransition(null, 12_345, RATIO)).toBeNull();
  });

  it('ignores ordinary movement', () => {
    expect(checkValueTransition(10_000, 9_000, RATIO)).toBeNull();
    expect(checkValueTransition(10_000, 12_000, RATIO)).toBeNull();
    // A bad day in the market must not fire, or the alert gets muted and a
    // muted alert is worse than none because it reads as coverage.
    expect(checkValueTransition(10_000, 5_000, RATIO)).toBeNull();
  });

  it('catches the Polkadot shape: a collapse to dust with no error', () => {
    // #302. The relay chain kept answering 200 OK after balances moved to
    // Asset Hub, so every DOT holder read as near-empty. Right type, right
    // field, wrong magnitude.
    const check = checkValueTransition(8_400, 3, RATIO);
    expect(check?.violation).toBe('value_collapsed');
    expect(check?.dropPercent).toBe(100);
  });

  it('reports an exact zero separately from a collapse, because the causes differ', () => {
    // #289's shape: all thirteen chain clients returned 0 on every failure
    // path, so an expired key wrote a whole position to zero. That is a
    // different bug from a magnitude error and wants a different fix, so it
    // gets its own name rather than being folded into a 100% drop.
    expect(checkValueTransition(8_400, 0, RATIO)?.violation).toBe('zero_from_non_zero');
  });

  it('catches a value becoming unpriceable, which silently shrinks the total', () => {
    expect(checkValueTransition(8_400, null, RATIO)?.violation).toBe('null_from_value');
  });

  it('says nothing when there was nothing to lose', () => {
    // Only a previously positive value can collapse. A zero going to zero, or
    // to null, is not evidence of anything.
    expect(checkValueTransition(0, 0, RATIO)).toBeNull();
    expect(checkValueTransition(0, null, RATIO)).toBeNull();
  });

  it('does not fire on a debt, where the sign makes the ratio meaningless', () => {
    expect(checkValueTransition(-5_000, -10, RATIO)).toBeNull();
  });

  it('reports the drop as whole percent, not a full-precision ratio of two balances', () => {
    expect(checkValueTransition(1_000, 50, RATIO)?.dropPercent).toBe(95);
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

  it('does not fire on the bank bookkeeping row, whose value is legitimately null', async () => {
    // `bank` stores null by design: its values live per account in
    // plaid_account_balances. A null-from-null transition is not a violation.
    await recordClassSuccess(testUserId, 'bank', { valueUsd: null, payload: null });
    await recordClassSuccess(testUserId, 'bank', { valueUsd: null, payload: null });

    const rows = await db().select().from(opsEvents);
    expect(rows.filter((r) => r.kind === 'invariant_violated')).toHaveLength(0);
  });
});
