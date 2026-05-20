import { beforeEach, describe, expect, it } from 'vitest';
import { resetDatabase } from './db-helper.js';

describe('claimEvent', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns true for the first claim of an id', async () => {
    const { claimEvent } = await import('../src/store/events.js');
    expect(await claimEvent('evt_new')).toBe(true);
  });

  it('returns false on a re-claim of the same id', async () => {
    const { claimEvent } = await import('../src/store/events.js');
    await claimEvent('evt_a');
    expect(await claimEvent('evt_a')).toBe(false);
  });

  it('does not affect other ids', async () => {
    const { claimEvent } = await import('../src/store/events.js');
    await claimEvent('evt_x');
    expect(await claimEvent('evt_y')).toBe(true);
  });

  it('atomically resolves concurrent claims of the same id', async () => {
    const { claimEvent } = await import('../src/store/events.js');
    // Fire two claims in parallel; PK + onConflictDoNothing guarantees one wins.
    const results = await Promise.all([claimEvent('evt_race'), claimEvent('evt_race')]);
    const wins = results.filter(Boolean).length;
    expect(wins).toBe(1);
  });
});

describe('health score', () => {
  it('returns correct deltas for all known event types', async () => {
    const { deltaForEvent } = await import('../src/health/score.js');
    expect(deltaForEvent('paycheck_received')).toBe(10);
    expect(deltaForEvent('bill_paid_on_time')).toBe(5);
    expect(deltaForEvent('savings_milestone')).toBe(15);
    expect(deltaForEvent('overspent_in_category')).toBe(-10);
    expect(deltaForEvent('large_purchase')).toBe(-5);
  });

  it('returns 0 for an unknown event type', async () => {
    const { deltaForEvent } = await import('../src/health/score.js');
    expect(deltaForEvent('unknown_event')).toBe(0);
  });
});
