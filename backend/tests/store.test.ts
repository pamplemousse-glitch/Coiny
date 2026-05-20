import { describe, it, expect, beforeEach, vi } from 'vitest';

process.env['TELLER_APPLICATION_ID'] = 'app_test';
process.env['TELLER_CERT_PATH'] = '/dev/null';
process.env['TELLER_KEY_PATH'] = '/dev/null';
process.env['NODE_ENV'] = 'test';

describe('events store', () => {
  // Reset module cache before each test so the in-memory Set starts fresh.
  beforeEach(() => { vi.resetModules(); });

  async function importStore() {
    const { isAlreadyProcessed, markProcessed } = await import('../src/store/events.js');
    return { isAlreadyProcessed, markProcessed };
  }

  it('returns false for an unseen id', async () => {
    const { isAlreadyProcessed } = await importStore();
    expect(isAlreadyProcessed('evt_new')).toBe(false);
  });

  it('returns true after marking an id', async () => {
    const { isAlreadyProcessed, markProcessed } = await importStore();
    markProcessed('evt_a');
    expect(isAlreadyProcessed('evt_a')).toBe(true);
  });

  it('does not affect other ids', async () => {
    const { isAlreadyProcessed, markProcessed } = await importStore();
    markProcessed('evt_x');
    expect(isAlreadyProcessed('evt_y')).toBe(false);
  });

  it('evicts the oldest id when the capacity is reached', async () => {
    const { isAlreadyProcessed, markProcessed } = await importStore();
    const MAX_IDS = 10_000;
    for (let i = 0; i < MAX_IDS; i++) {
      markProcessed(`evt_fill_${i}`);
    }
    // First entry is still present before overflow.
    expect(isAlreadyProcessed('evt_fill_0')).toBe(true);

    // One more pushes the oldest out.
    markProcessed('evt_overflow');
    expect(isAlreadyProcessed('evt_fill_0')).toBe(false);
    expect(isAlreadyProcessed('evt_overflow')).toBe(true);
    // Later entries are unaffected.
    expect(isAlreadyProcessed(`evt_fill_${MAX_IDS - 1}`)).toBe(true);
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
