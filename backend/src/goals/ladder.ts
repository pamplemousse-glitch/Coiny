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
  /** User-adjustable rung 5 target, 0 to 1. Null means "use the default"
   *  (DEFAULT_SHELTERED_RATE), which is different from a declared 0. */
  shelteredTargetRate: number | null;
  /** User-adjustable rung 6 savings-rate target, 0 to 1. Null means "use the
   *  default" (SURPLUS_SAVINGS_RATE). The caller must compute
   *  `monthsAtSurplusRate` against the SAME rate it puts here. */
  surplusTargetRate: number | null;
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
      // The 15% default is the PRD's starting point; the rate is user-adjustable
      // (docs/prd.md R-7.1, rung 5), so a declared rate always wins.
      return ratio(ctx.taxAdvantagedRate, ctx.shelteredTargetRate ?? DEFAULT_SHELTERED_RATE);
    },
  },
  {
    id: 6,
    key: 'surplus',
    name: 'Surplus',
    stage: 'Elder',
    blurb: 'Your target savings rate, held for three months running.',
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

/** Default rung 5 target rate, user-adjustable via `shelteredTargetRate`. */
export const DEFAULT_SHELTERED_RATE = 0.15;

/** Default rung 6 savings-rate target, user-adjustable via `surplusTargetRate`.
 *  Lowered from 0.25 per register row DR-23: 25% of take-home is materially
 *  harder than the published 25%-of-gross standard the old value was copied
 *  from, and our rate is take-home based (derived.ts). */
export const SURPLUS_SAVINGS_RATE = 0.2;

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

  return resolveActive(rungs);
}

/** Re-elect the active rung: the first that is neither completed, skipped, nor
 *  inapplicable. Everything before it is settled; everything after it is dimmed.
 *  Any stale `active` marker is demoted first so the election is total. */
function resolveActive(rungs: Record<string, RungState>): LadderState {
  const out: Record<string, RungState> = { ...rungs };
  for (const [key, state] of Object.entries(out)) {
    if (state.status === 'active') out[key] = { ...state, status: 'pending' };
  }

  const settled = new Set<RungStatus>(['completed', 'skipped', 'not_applicable']);
  const active = RUNGS.find((r) => !settled.has(out[String(r.id)]?.status ?? 'pending'));
  // Rung 7 never completes, so `active` is only undefined if every rung was skipped
  // or marked inapplicable. Fall back to the last rung rather than to 0, which would
  // read as a regression to the user.
  const currentRung = active?.id ?? LAST_RUNG_ID;
  if (active) out[String(active.id)] = { ...out[String(active.id)], status: 'active' };

  return { currentRung, rungs: out };
}

// --- Skips (R-7.4) ----------------------------------------------------------

/** The two user-settable opt-out statuses. There is deliberately no third
 *  option: a rung can never be FAILED (invariant 2). */
export type RungSkipStatus = 'skipped' | 'not_applicable';

/** Mark a rung skipped (user-reversible) or not applicable (structural), per
 *  R-7.4, and re-elect the active rung.
 *
 *  Returns null when the request is invalid: an unknown rung, or a completed
 *  rung, whose completion stands (invariant 1) and cannot be skipped away. */
export function skipRung(
  state: LadderState,
  rungId: number,
  status: RungSkipStatus,
  reason: string | null,
): LadderState | null {
  const key = String(rungId);
  const before = state.rungs[key];
  if (!before || before.status === 'completed') return null;

  const rungs: Record<string, RungState> = { ...state.rungs };
  const next: RungState = { status };
  if (reason !== null) next.skippedReason = reason;
  rungs[key] = next;
  return resolveActive(rungs);
}

/** Reverse a skip (R-7.4: a skip is the user's to reverse). The rung returns to
 *  pending; the next refresh re-judges it and a satisfied condition completes
 *  it. Returns null when the rung is not currently opted out. */
export function unskipRung(state: LadderState, rungId: number): LadderState | null {
  const key = String(rungId);
  const before = state.rungs[key];
  if (!before || (before.status !== 'skipped' && before.status !== 'not_applicable')) return null;

  const rungs: Record<string, RungState> = { ...state.rungs };
  rungs[key] = { status: 'pending' };
  return resolveActive(rungs);
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
