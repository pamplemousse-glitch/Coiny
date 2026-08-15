import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SHELTERED_RATE,
  emergencyFundMonths,
  evaluateLadder,
  type LadderContext,
  RUNGS,
  reopenedRungs,
  SURPLUS_SAVINGS_RATE,
  skipRung,
  stageForLadder,
  unskipRung,
} from '../src/goals/ladder.js';

const NOW = new Date('2026-08-12T00:00:00Z');

function ctx(overrides: Partial<LadderContext> = {}): LadderContext {
  return {
    hasConnectedAccount: true,
    essentialMonthly: 3000,
    incomeVolatility: 0.1,
    takeHomeMonthly: 6000,
    liquidCash: 0,
    savingsRate: 0.1,
    monthsAtSurplusRate: 0,
    highAprDebtBalances: [],
    investedTotal: 0,
    taxAdvantagedRate: 0,
    employerMatch: 'captured',
    shelteredTargetRate: null,
    surplusTargetRate: null,
    ...overrides,
  };
}

describe('emergencyFundMonths', () => {
  it('sizes 3 months for steady income', () => {
    expect(emergencyFundMonths(0.1)).toBe(3);
  });

  it('sizes 4.5 months for moderately variable income', () => {
    expect(emergencyFundMonths(0.25)).toBe(4.5);
  });

  it('sizes 6 months for volatile income', () => {
    expect(emergencyFundMonths(0.5)).toBe(6);
  });

  it('sizes conservatively when volatility is unknown', () => {
    expect(emergencyFundMonths(null)).toBe(6);
  });
});

describe('evaluateLadder', () => {
  it('completes rung 0 once an account is connected', () => {
    const state = evaluateLadder(ctx(), null, NOW);
    expect(state.rungs['0']?.status).toBe('completed');
  });

  it('makes the first unsatisfied rung active', () => {
    const state = evaluateLadder(ctx({ liquidCash: 0 }), null, NOW);
    expect(state.currentRung).toBe(1);
    expect(state.rungs['1']?.status).toBe('active');
  });

  it('auto-completes a rung whose condition is already met', () => {
    // A user with no high-APR debt has already satisfied rung 3 on day one.
    const state = evaluateLadder(ctx({ liquidCash: 50_000, highAprDebtBalances: [] }), null, NOW);
    expect(state.rungs['3']?.status).toBe('completed');
  });

  it('marks rung 2 not applicable when there is no employer plan', () => {
    const state = evaluateLadder(ctx({ employerMatch: 'no_employer_plan' }), null, NOW);
    expect(state.rungs['2']?.status).toBe('not_applicable');
  });

  it('does not auto-complete when the inputs are unknown', () => {
    // Null liquidCash means "we do not know", which must never read as satisfied.
    const state = evaluateLadder(ctx({ liquidCash: null }), null, NOW);
    expect(state.rungs['1']?.status).not.toBe('completed');
  });

  it('preserves an explicit skip', () => {
    const prior = evaluateLadder(ctx(), null, NOW);
    prior.rungs['5'] = { status: 'skipped', skippedReason: 'no retirement account yet' };
    const state = evaluateLadder(ctx({ taxAdvantagedRate: 0.2 }), prior, NOW);
    expect(state.rungs['5']?.status).toBe('skipped');
  });

  it('never completes rung 7, so the ladder does not run out', () => {
    const state = evaluateLadder(ctx({ investedTotal: 10_000_000, essentialMonthly: 3000 }), null, NOW);
    expect(state.rungs['7']?.status).not.toBe('completed');
  });
});

// The invariant the whole no-shame design rests on.
describe('rungs never un-complete', () => {
  it('keeps a completed rung completed when its condition is later violated', () => {
    const clean = evaluateLadder(ctx({ liquidCash: 50_000, highAprDebtBalances: [] }), null, NOW);
    expect(clean.rungs['3']?.status).toBe('completed');

    // The user opens a credit card and carries $8,200 at 24%.
    const after = evaluateLadder(ctx({ liquidCash: 50_000, highAprDebtBalances: [8200] }), clean, NOW);
    expect(after.rungs['3']?.status).toBe('completed');
  });

  it('does not lower the creature stage when a condition is violated', () => {
    const clean = evaluateLadder(ctx({ liquidCash: 50_000, highAprDebtBalances: [] }), null, NOW);
    const before = stageForLadder(clean);
    const after = evaluateLadder(ctx({ liquidCash: 0, highAprDebtBalances: [8200] }), clean, NOW);
    expect(stageForLadder(after)).toBeGreaterThanOrEqual(before);
  });

  it('surfaces the violated rung as reopened instead', () => {
    const clean = evaluateLadder(ctx({ liquidCash: 50_000, highAprDebtBalances: [] }), null, NOW);
    const violated = ctx({ liquidCash: 50_000, highAprDebtBalances: [8200] });
    const after = evaluateLadder(violated, clean, NOW);
    expect(reopenedRungs(violated, after).map((r) => r.key)).toContain('bleeding_stopped');
  });

  it('reports nothing reopened when everything still holds', () => {
    const c = ctx({ liquidCash: 50_000, highAprDebtBalances: [] });
    const state = evaluateLadder(c, null, NOW);
    expect(reopenedRungs(c, state)).toHaveLength(0);
  });
});

describe('no rung can be failed', () => {
  it('never produces a failed status', () => {
    const states = [
      evaluateLadder(ctx({ liquidCash: 0, highAprDebtBalances: [50_000] }), null, NOW),
      evaluateLadder(ctx({ liquidCash: null, essentialMonthly: null }), null, NOW),
      evaluateLadder(ctx({ savingsRate: -1 }), null, NOW),
    ];
    const allowed = new Set(['pending', 'active', 'completed', 'not_applicable', 'skipped']);
    for (const s of states) {
      for (const r of Object.values(s.rungs)) expect(allowed.has(r.status)).toBe(true);
    }
  });
});

describe('adjustable target rates', () => {
  // Pin tests: these constants are product decisions, not tuning knobs.
  // SURPLUS_SAVINGS_RATE was lowered from 0.25 per register row DR-23.
  it('pins the surplus savings rate default at 0.20', () => {
    expect(SURPLUS_SAVINGS_RATE).toBe(0.2);
  });

  it('pins the sheltered rate default at 0.15', () => {
    expect(DEFAULT_SHELTERED_RATE).toBe(0.15);
  });

  it('judges rung 5 against the default when no rate is declared', () => {
    const state = evaluateLadder(ctx({ taxAdvantagedRate: 0.15, shelteredTargetRate: null }), null, NOW);
    expect(state.rungs['5']?.status).toBe('completed');
  });

  it('leaves rung 5 open below the default when no rate is declared', () => {
    const state = evaluateLadder(ctx({ taxAdvantagedRate: 0.1, shelteredTargetRate: null }), null, NOW);
    expect(state.rungs['5']?.status).not.toBe('completed');
  });

  it('judges rung 5 against a declared rate instead of the default', () => {
    const state = evaluateLadder(ctx({ taxAdvantagedRate: 0.1, shelteredTargetRate: 0.1 }), null, NOW);
    expect(state.rungs['5']?.status).toBe('completed');
  });

  it('reports the declared rate as the rung 5 target and gap basis', () => {
    const rung5 = RUNGS.find((r) => r.id === 5);
    const result = rung5?.evaluate(ctx({ taxAdvantagedRate: 0.05, shelteredTargetRate: 0.1 }));
    expect(result?.target).toBe(0.1);
    expect(result?.progress).toBeCloseTo(0.5, 5);
  });
});

describe('rung definitions', () => {
  it('has 8 rungs with unique ids and names', () => {
    expect(RUNGS).toHaveLength(8);
    expect(new Set(RUNGS.map((r) => r.id)).size).toBe(8);
    expect(new Set(RUNGS.map((r) => r.name)).size).toBe(8);
  });

  it('gives every rung a place name rather than a number', () => {
    for (const r of RUNGS) expect(r.name).not.toMatch(/^Rung/);
  });
});

describe('skipRung (R-7.4)', () => {
  // Rungs 0, 2 and 3 complete (connected, match captured, no high-APR debt);
  // rung 1 active (liquidCash 0); rungs 4 to 7 pending.
  const base = () => evaluateLadder(ctx({ liquidCash: 0 }), null, NOW);

  it('marks a rung skipped with its stated reason', () => {
    const next = skipRung(base(), 4, 'skipped', 'handled_elsewhere');
    expect(next?.rungs['4']).toEqual({ status: 'skipped', skippedReason: 'handled_elsewhere' });
  });

  it('re-elects the active rung when the active one is skipped', () => {
    const next = skipRung(base(), 1, 'skipped', 'not_now');
    expect(next?.currentRung).toBe(4);
    expect(next?.rungs['4']?.status).toBe('active');
  });

  it('refuses to skip a completed rung: the completion stands', () => {
    expect(skipRung(base(), 0, 'skipped', 'not_relevant')).toBeNull();
  });

  it('refuses an unknown rung id', () => {
    expect(skipRung(base(), 9, 'skipped', 'not_now')).toBeNull();
  });

  it('marks not_applicable without requiring a reason', () => {
    const next = skipRung(base(), 4, 'not_applicable', null);
    expect(next?.rungs['4']).toEqual({ status: 'not_applicable' });
  });

  it('does not change the creature stage', () => {
    const before = base();
    const next = skipRung(before, 1, 'skipped', 'not_now');
    expect(stageForLadder(next ?? before)).toBe(stageForLadder(before));
  });

  it('survives a later refresh: an explicit skip is never overwritten', () => {
    const skipped = skipRung(base(), 1, 'skipped', 'handled_elsewhere');
    const refreshed = evaluateLadder(ctx({ liquidCash: 0 }), skipped, NOW);
    expect(refreshed.rungs['1']).toEqual({ status: 'skipped', skippedReason: 'handled_elsewhere' });
  });
});

describe('unskipRung (R-7.4)', () => {
  const base = () => evaluateLadder(ctx({ liquidCash: 0 }), null, NOW);

  it('returns a skipped rung to pending and re-elects it as active', () => {
    const skipped = skipRung(base(), 1, 'skipped', 'not_now');
    const next = unskipRung(skipped ?? base(), 1);
    expect(next?.rungs['1']?.status).toBe('active');
    expect(next?.currentRung).toBe(1);
  });

  it('lets the next refresh complete a formerly skipped, now satisfied rung', () => {
    const skipped = skipRung(base(), 1, 'skipped', 'not_now');
    const unskipped = unskipRung(skipped ?? base(), 1);
    const refreshed = evaluateLadder(ctx({ liquidCash: 50_000 }), unskipped, NOW);
    expect(refreshed.rungs['1']?.status).toBe('completed');
  });

  it('refuses a rung that is not opted out', () => {
    expect(unskipRung(base(), 1)).toBeNull();
    expect(unskipRung(base(), 0)).toBeNull();
  });
});
