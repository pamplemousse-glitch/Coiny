import { describe, expect, it } from 'vitest';
import { deltaForEvent } from '../src/health/score.js';

describe('deltaForEvent', () => {
  it('rewards a paycheck', () => {
    expect(deltaForEvent('paycheck_received')).toBe(10);
  });

  it('rewards a contribution', () => {
    expect(deltaForEvent('contribution_made')).toBe(10);
  });

  it('rewards a bill paid on time', () => {
    expect(deltaForEvent('bill_paid_on_time')).toBe(5);
  });

  it('penalizes an overspend gently', () => {
    expect(deltaForEvent('overspend_vs_plan')).toBe(-5);
  });

  // R-7.24: neutral plus a question, never a penalty. The old rule docked -5
  // for spending money on purpose; that was the punitive mechanic the taxonomy
  // deletes.
  it('moves nothing for a large purchase', () => {
    expect(deltaForEvent('large_purchase')).toBe(0);
  });

  // R-7.12: a broken streak resets the counter and NOTHING else.
  it('moves nothing for a broken streak', () => {
    expect(deltaForEvent('streak_broken')).toBe(0);
  });

  it('moves nothing for exogenous events', () => {
    expect(deltaForEvent('net_worth_milestone')).toBe(0);
    expect(deltaForEvent('credit_score_dropped')).toBe(0);
  });

  it('returns 0 for unknown event types', () => {
    expect(deltaForEvent('nonexistent_event')).toBe(0);
  });
});
