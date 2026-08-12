// The Foundation Ladder (docs/prd-app-v2.md §3.3 and §6A.2).
//
// Eight rungs, sequenced, one active at a time. This is what drives the creature's
// permanent evolution stage. Everything here is a pure function of a context object
// so the whole ladder is testable without a database or a network call.
//
// Two invariants that the rest of the product depends on:
//
//   1. A rung NEVER un-completes. A user who clears rung 3 and later takes on new
//      high-APR debt keeps the completion, and keeps the creature's stage. The rung
//      reopens as an active task instead. Progress is permanent, problems are
//      current. Demoting someone's creature for having a bad year is the shaming
//      mechanic this product exists to avoid.
//
//   2. A rung can never be FAILED, only satisfied, skipped, or marked not
//      applicable. There is no losing state anywhere in the ladder.

export type RungStatus = 'pending' | 'active' | 'completed' | 'not_applicable' | 'skipped';

export type RungState = {
  status: RungStatus;
  completedAt?: string;
  skippedReason?: string;
};

export type LadderState = {
  currentRung: number;
  rungs: Record<string, RungState>;
};

/** Everything the ladder needs to evaluate itself. Assembled by the caller from
 *  `derived_state`, the debt map, and the user's declared answers. Any field that
 *  is null means "we do not know yet", which is different from zero and must never
 *  be treated as a satisfied condition. */
export type LadderContext = {
  hasConnectedAccount: boolean;
  essentialMonthly: number | null;
  incomeVolatility: number | null;
  takeHomeMonthly: number | null;
  liquidCash: number | null;
  savingsRate: number | null;
  /** Trailing consecutive months at or above the rung 6 savings-rate target. */
  monthsAtSurplusRate: number;
  /** Balances on debts above the high-APR threshold. Empty means none. */
  highAprDebtBalances: number[];
  /** Total invested across tax-advantaged and taxable accounts. */
  investedTotal: number | null;
  /** Annualised rate currently going into tax-advantaged accounts, 0 to 1. */
  taxAdvantagedRate: number | null;
  /** User-declared: do they have an employer plan with a match, and is it captured. */
  employerMatch: 'captured' | 'not_captured' | 'no_employer_plan' | 'unknown';
};

export type RungProgress = {
  /** 0 to 1. Rung 7 keeps reporting a fraction forever and never completes. */
  progress: number;
  /** The number the user is working toward, in USD, or null when not applicable. */
  target: number | null;
  /** What is left to do, in USD, or null. */
  gap: number | null;
  satisfied: boolean;
  /** True when we lack the inputs to judge, so the rung must not auto-complete. */
  indeterminate: boolean;
};

export type RungDefinition = {
  id: number;
  key: string;
  /** Shown to the user. "Rung 4 of 8" is engineering language; this is a place. */
  name: string;
  stage: string;
  blurb: string;
  evaluate: (ctx: LadderContext) => RungProgress;
};

/** Debt above this APR is treated as an emergency to clear before investing.
 *  Chosen over Ramsey's "all debt" and over a 6% rule: at 10% the arithmetic is
 *  unambiguous against any plausible expected market return. */
export const HIGH_APR_THRESHOLD = 0.1;

/** Rung 1 is deliberately not Ramsey's $1,000, which is an unadjusted 1990s figure.
 *  See docs/prd-app-v2.md §3.3 for the JPMorgan Chase Institute cash-buffer basis. */
export const STARTER_BUFFER_USD = 2000;

const unknown = (): RungProgress => ({
  progress: 0,
  target: null,
  gap: null,
  satisfied: false,
  indeterminate: true,
});

function ratio(have: number, need: number): RungProgress {
  if (need <= 0) return { progress: 1, target: need, gap: 0, satisfied: true, indeterminate: false };
  const progress = Math.max(0, Math.min(1, have / need));
  return {
    progress,
    target: need,
    gap: Math.max(0, need - have),
    satisfied: have >= need,
    indeterminate: false,
  };
}

/** Emergency fund months, sized by measured income volatility rather than the flat
 *  "3 to 6 months" convention. A salaried employee and a freelancer should not get
 *  the same target, and no competitor does this. */
export function emergencyFundMonths(incomeVolatility: number | null): number {
  if (incomeVolatility === null) return 6; // Unknown volatility sizes conservatively.
  if (incomeVolatility < 0.15) return 3;
  if (incomeVolatility < 0.35) return 4.5;
  return 6;
}

export const RUNGS: RungDefinition[] = [
  {
    id: 0,
    key: 'sighted',
    name: 'Sighted',
    stage: 'Egg',
    blurb: 'Everything you own, in one number.',
    evaluate: (ctx) => ({
      progress: ctx.hasConnectedAccount ? 1 : 0,
      target: null,
      gap: null,
      satisfied: ctx.hasConnectedAccount,
      indeterminate: false,
    }),
  },
  {
    id: 1,
    key: 'floor',
    name: 'Floor',
    stage: 'Hatchling',
    blurb: 'A starter buffer, so a flat tyre is not a crisis.',
    evaluate: (ctx) => {
      if (ctx.liquidCash === null) return unknown();
      const target = Math.max(STARTER_BUFFER_USD, 0.5 * (ctx.essentialMonthly ?? 0));
      return ratio(ctx.liquidCash, target);
    },
  },
  {
    id: 2,
    key: 'free_money',
    name: 'Free money',
    stage: 'Sprout',
    blurb: 'Your employer match, taken in full. It is the only free money you get.',
    evaluate: (ctx) => {
      if (ctx.employerMatch === 'unknown') return unknown();
      // 'no_employer_plan' is resolved to not_applicable by the caller, not here.
      const satisfied = ctx.employerMatch === 'captured' || ctx.employerMatch === 'no_employer_plan';
      return { progress: satisfied ? 1 : 0, target: null, gap: null, satisfied, indeterminate: false };
    },
  },
  {
    id: 3,
    key: 'bleeding_stopped',
    name: 'Bleeding stopped',
    stage: 'Fledgling',
    blurb: 'Nothing left above 10% interest.',
    evaluate: (ctx) => {
      const outstanding = ctx.highAprDebtBalances.reduce((a, b) => a + b, 0);
      return {
        progress: outstanding === 0 ? 1 : 0,
        target: 0,
        gap: outstanding,
        satisfied: outstanding === 0,
        indeterminate: false,
      };
    },
  },
  {
    id: 4,
    key: 'buffer',
    name: 'Buffer',
    stage: 'Adolescent',
    blurb: 'A full emergency fund, sized to how steady your income actually is.',
    evaluate: (ctx) => {
      if (ctx.liquidCash === null || ctx.essentialMonthly === null) return unknown();
      return ratio(ctx.liquidCash, ctx.essentialMonthly * emergencyFundMonths(ctx.incomeVolatility));
    },
  },
  {
    id: 5,
    key: 'sheltered',
    name: 'Sheltered',
    stage: 'Adult',
    blurb: 'Retirement accounts funded at a rate you set.',
    evaluate: (ctx) => {
      if (ctx.taxAdvantagedRate === null) return unknown();
      return ratio(ctx.taxAdvantagedRate, 0.15);
    },
  },
  {
    id: 6,
    key: 'surplus',
    name: 'Surplus',
    stage: 'Elder',
    blurb: 'A 25% savings rate, held for three months running.',
    evaluate: (ctx) => {
      if (ctx.savingsRate === null) return unknown();
      return {
        progress: Math.max(0, Math.min(1, ctx.monthsAtSurplusRate / 3)),
        target: 3,
        gap: Math.max(0, 3 - ctx.monthsAtSurplusRate),
        satisfied: ctx.monthsAtSurplusRate >= 3,
        indeterminate: false,
      };
    },
  },
  {
    id: 7,
    key: 'freedom',
    name: 'Freedom',
    stage: 'Ascendant',
    blurb: 'Twenty-five times your annual essentials. Work becomes optional.',
    evaluate: (ctx) => {
      if (ctx.investedTotal === null || ctx.essentialMonthly === null) return unknown();
      const r = ratio(ctx.investedTotal, ctx.essentialMonthly * 12 * 25);
      // Rung 7 never completes: it reports a percentage forever, which is what
      // keeps the ladder from running out and the creature from having nothing
      // left to grow toward.
      return { ...r, satisfied: false };
    },
  },
];

export const SURPLUS_SAVINGS_RATE = 0.25;

/** The final rung's id. Rung 7 never completes by design, so this is also the
 *  ceiling for `currentRung`. */
export const LAST_RUNG_ID = 7;

function emptyLadder(): LadderState {
  const rungs: Record<string, RungState> = {};
  for (const r of RUNGS) rungs[String(r.id)] = { status: 'pending' };
  return { currentRung: 0, rungs };
}

/** Recompute the ladder from context, preserving prior completions and skips.
 *
 *  `now` is injected rather than read from the clock so the result is deterministic
 *  and testable. */
export function evaluateLadder(ctx: LadderContext, prior: LadderState | null, now: Date): LadderState {
  const previous = prior ?? emptyLadder();
  const rungs: Record<string, RungState> = {};

  for (const rung of RUNGS) {
    const key = String(rung.id);
    const before = previous.rungs[key] ?? { status: 'pending' as RungStatus };

    // Invariant 2: a user's explicit skip is theirs to reverse, never ours.
    if (before.status === 'skipped') {
      rungs[key] = before;
      continue;
    }

    // A declared "no employer plan" makes rung 2 structurally inapplicable. This is
    // different from skipping: there is no condition to meet, so the ladder simply
    // gets shorter for this user.
    if (rung.key === 'free_money' && ctx.employerMatch === 'no_employer_plan') {
      rungs[key] = { ...before, status: 'not_applicable' };
      continue;
    }

    const result = rung.evaluate(ctx);

    // Invariant 1: never un-complete. A previously completed rung stays completed
    // even when its condition is currently violated. The caller surfaces the
    // violation as an active task; the creature keeps its stage.
    if (before.status === 'completed') {
      rungs[key] = before;
      continue;
    }

    if (result.satisfied && !result.indeterminate) {
      rungs[key] = { status: 'completed', completedAt: now.toISOString() };
      continue;
    }

    rungs[key] = { ...before, status: 'pending' };
  }

  // The active rung is the first that is neither completed, skipped, nor
  // inapplicable. Everything before it is settled; everything after it is dimmed.
  const settled = new Set<RungStatus>(['completed', 'skipped', 'not_applicable']);
  const active = RUNGS.find((r) => !settled.has(rungs[String(r.id)]?.status ?? 'pending'));
  // Rung 7 never completes, so `active` is only undefined if every rung was skipped
  // or marked inapplicable. Fall back to the last rung rather than to 0, which would
  // read as a regression to the user.
  const currentRung = active?.id ?? LAST_RUNG_ID;
  if (active) rungs[String(active.id)] = { ...rungs[String(active.id)], status: 'active' };

  return { currentRung, rungs };
}

/** Rungs whose condition is currently violated despite having been completed.
 *  These are surfaced as tasks needing attention without touching the creature. */
export function reopenedRungs(ctx: LadderContext, state: LadderState): RungDefinition[] {
  return RUNGS.filter((rung) => {
    if (state.rungs[String(rung.id)]?.status !== 'completed') return false;
    const result = rung.evaluate(ctx);
    return !result.indeterminate && !result.satisfied && rung.id !== 7;
  });
}

/** The creature's stage: the highest rung completed, and it never goes backwards.
 *  Derived from the ladder rather than stored, so the two can never disagree. */
export function stageForLadder(state: LadderState): number {
  let stage = 0;
  for (const rung of RUNGS) {
    if (state.rungs[String(rung.id)]?.status === 'completed') stage = Math.max(stage, rung.id);
  }
  return stage;
}
