import { describe, expect, it } from 'vitest';
import { computeMoodWithDecay, DECAY_PER_DAY, FLOOR, GRACE_HOURS } from '../src/health/decay.js';

// Anchored to a fixed instant and passed explicitly as `now`. Reading the wall
// clock twice, once to build the timestamp and once inside computeMoodWithDecay,
// lets real elapsed time slip across a day boundary when the suite is under load,
// which made these tests flake as the suite grew.
const NOW = new Date('2026-08-12T12:00:00Z');

function hoursAgo(h: number): Date {
  return new Date(NOW.getTime() - h * 60 * 60 * 1000);
}

describe('computeMoodWithDecay', () => {
  it('returns stored mood when lastReactionAt is null', () => {
    expect(computeMoodWithDecay(60, null)).toBe(60);
  });

  it('returns stored mood within grace period', () => {
    expect(computeMoodWithDecay(80, hoursAgo(GRACE_HOURS - 1), NOW)).toBe(80);
  });

  it('decays after the grace period', () => {
    // exactly 1 day past grace → -DECAY_PER_DAY
    const result = computeMoodWithDecay(80, hoursAgo(GRACE_HOURS + 24), NOW);
    expect(result).toBe(80 - DECAY_PER_DAY);
  });

  it('decays linearly across multiple days', () => {
    // 4 days past grace → -4 * DECAY_PER_DAY
    const result = computeMoodWithDecay(80, hoursAgo(GRACE_HOURS + 24 * 4), NOW);
    expect(result).toBe(80 - 4 * DECAY_PER_DAY);
  });

  it('floors at FLOOR no matter how stale', () => {
    expect(computeMoodWithDecay(80, hoursAgo(GRACE_HOURS + 24 * 365), NOW)).toBe(FLOOR);
  });

  it('uses now param for determinism', () => {
    const now = new Date('2026-05-20T00:00:00Z');
    const lastReaction = new Date('2026-05-18T00:00:00Z'); // 48h ago
    // 48h elapsed - 24h grace = 24h decay window = 1 day → -5
    expect(computeMoodWithDecay(70, lastReaction, now)).toBe(65);
  });
});
