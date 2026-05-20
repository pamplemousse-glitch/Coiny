import { describe, it, expect } from 'vitest';
import { computeMoodWithDecay, GRACE_HOURS, DECAY_PER_DAY, FLOOR } from '../src/health/decay.js';

function hoursAgo(h: number): Date {
  return new Date(Date.now() - h * 60 * 60 * 1000);
}

describe('computeMoodWithDecay', () => {
  it('returns stored mood when lastReactionAt is null', () => {
    expect(computeMoodWithDecay(60, null)).toBe(60);
  });

  it('returns stored mood within grace period', () => {
    expect(computeMoodWithDecay(80, hoursAgo(GRACE_HOURS - 1))).toBe(80);
  });

  it('decays after the grace period', () => {
    // exactly 1 day past grace → -DECAY_PER_DAY
    const result = computeMoodWithDecay(80, hoursAgo(GRACE_HOURS + 24));
    expect(result).toBe(80 - DECAY_PER_DAY);
  });

  it('decays linearly across multiple days', () => {
    // 4 days past grace → -4 * DECAY_PER_DAY
    const result = computeMoodWithDecay(80, hoursAgo(GRACE_HOURS + 24 * 4));
    expect(result).toBe(80 - 4 * DECAY_PER_DAY);
  });

  it('floors at FLOOR no matter how stale', () => {
    expect(computeMoodWithDecay(80, hoursAgo(GRACE_HOURS + 24 * 365))).toBe(FLOOR);
  });

  it('uses now param for determinism', () => {
    const now = new Date('2026-05-20T00:00:00Z');
    const lastReaction = new Date('2026-05-18T00:00:00Z'); // 48h ago
    // 48h elapsed - 24h grace = 24h decay window = 1 day → -5
    expect(computeMoodWithDecay(70, lastReaction, now)).toBe(65);
  });
});
