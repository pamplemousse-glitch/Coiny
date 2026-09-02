// Breadth escalation for plausibility violations (store/ops.ts).
//
// `resilience/invariants.ts` states the limit it cannot pass, in its own words:
// a 99% drop is indistinguishable, from inside one account, from a vendor bug,
// and "only breadth across many accounts tells them apart". These tests are
// about that sentence becoming a thing the system does rather than a caveat in
// a comment.

import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../src/db/client.js';
import { opsEvents } from '../src/db/schema.js';
import { recordInvariantViolation } from '../src/store/ops.js';
import { resetDatabase } from './db-helper.js';

const WINDOW_MINUTES = 60;

async function violate(count: number, over: { assetClass?: string; violation?: string } = {}) {
  for (let i = 0; i < count; i++) {
    await recordInvariantViolation({
      assetClass: over.assetClass ?? 'crypto',
      violation: over.violation ?? 'value_collapsed',
      detail: { drop_percent: 99 },
      breadthThreshold: 3,
      windowMinutes: WINDOW_MINUTES,
    });
  }
}

async function kinds() {
  const rows = await db().select().from(opsEvents);
  return rows.map((r) => r.kind);
}

describe('invariant breadth', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('records the violation itself every time', async () => {
    await violate(1);

    expect((await kinds()).filter((k) => k === 'invariant_violated')).toHaveLength(1);
  });

  it('stays quiet for one account, because one account selling everything is a person', async () => {
    await violate(2);

    // Two is under the threshold and, more to the point, is exactly what an
    // ordinary week looks like. Alerting here is how the alert gets muted.
    expect(await kinds()).not.toContain('invariant_breadth');
  });

  it('escalates once the same violation hits the threshold', async () => {
    await violate(3);

    // Several accounts' crypto collapsing inside an hour is a deploy or a
    // vendor, not three people who all sold on the same afternoon.
    expect(await kinds()).toContain('invariant_breadth');
  });

  it('escalates at error severity, above the warnings it summarises', async () => {
    await violate(3);

    const rows = await db().select().from(opsEvents);
    const breadth = rows.find((r) => r.kind === 'invariant_breadth');
    expect(breadth?.severity).toBe('error');
    expect(breadth?.errorClass).toBe('value_collapsed');
    expect(breadth?.detail).toMatchObject({ asset_class: 'crypto', occurrences: 3 });
  });

  it('alerts once per window, not once per subsequent account', async () => {
    await violate(6);

    // The signal is that the threshold was crossed. Repeating it for every
    // later user turns one alert into a page of them, which is the same
    // failure as not alerting.
    expect((await kinds()).filter((k) => k === 'invariant_breadth')).toHaveLength(1);
  });

  it('does not mix two different violations into one breadth signal', async () => {
    await violate(2, { violation: 'value_collapsed' });
    await violate(2, { violation: 'value_inflated' });

    // A collapse and an inflation have different causes and different fixes.
    // Summing them would invent a threshold crossing that never happened.
    expect(await kinds()).not.toContain('invariant_breadth');
  });

  it('does not mix two different asset classes into one breadth signal', async () => {
    await violate(2, { assetClass: 'crypto' });
    await violate(2, { assetClass: 'investments' });

    // "Crypto is broken" and "investments are broken" are separate incidents
    // with separate vendors behind them.
    expect(await kinds()).not.toContain('invariant_breadth');
  });

  it('separates classes even once one of them does cross', async () => {
    await violate(3, { assetClass: 'crypto' });
    await violate(1, { assetClass: 'investments' });

    const rows = await db().select().from(opsEvents);
    const breadth = rows.filter((r) => r.kind === 'invariant_breadth');
    expect(breadth).toHaveLength(1);
    expect(breadth[0]?.detail).toMatchObject({ asset_class: 'crypto' });
  });

  it('ignores violations older than the window', async () => {
    await violate(2);
    // Age the existing rows out. Two last month plus one today is not a
    // pattern; a breadth check that never forgets eventually alerts on
    // everything once.
    await db()
      .update(opsEvents)
      .set({ at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000) });
    await violate(1);

    expect(await kinds()).not.toContain('invariant_breadth');
  });

  it('carries no user identifier, like every other ops row', async () => {
    await violate(3);

    const rows = await db().select().from(opsEvents);
    // The table has no user column by design (see store/ops.ts), which is what
    // lets it sit outside the analytics consent gate. The escalation must not
    // smuggle one into `detail`.
    expect(JSON.stringify(rows)).not.toMatch(/user_id|userId/);
  });
});
