// The goal-system refresh (docs/prd.md R-7.6): recompute the derived substrate,
// re-evaluate the ladder, persist the context it was judged against, and record
// today's net-worth point.
//
// SCHEDULER SEAM: there is no scheduler in this codebase yet. For now the only
// production caller is GET /api/net-worth, which already assembles every input.
// When the nightly job (prd.md §16) exists it must call `refreshGoalSystem`
// with a snapshot assembled from `fetchPlaidSnapshot` / `fetchDebtSnapshot`
// (src/goals/snapshot.ts) plus the full net-worth total, exactly as the
// endpoint does. Nothing here may assume it is running inside a request.

import { getDeclarations } from '../store/declarations.js';
import {
  getLadderInputs,
  getLadderState,
  monthsAtSavingsRate,
  recordNetWorthDaily,
  refreshDerivedState,
  refreshLadder,
  saveLadderInputs,
} from '../store/goals.js';
import type { DerivedState } from './derived.js';
import { evaluateGoalSystem } from './evaluation.js';
import {
  type LadderContext,
  type LadderState,
  RUNGS,
  reopenedRungs,
  SURPLUS_SAVINGS_RATE,
  stageForLadder,
} from './ladder.js';

export type GoalRefreshInputs = {
  hasConnectedAccount: boolean;
  /** Positive depository balances, or null when balances could not be read.
   *  Null means unknown and must never be passed as zero. */
  liquidCash: number | null;
  /** From `highAprDebtBalances` (snapshot.ts). Empty means none known. */
  highAprDebtBalances: number[];
  /** Plaid investment holdings total, or null when no account is connected. */
  investedTotal: number | null;
  /** No honest producer exists: 401k contributions are pre-tax and invisible to
   *  bank transactions. Callers pass null and rung 5 reports indeterminate.
   *  Do not invent a proxy. */
  taxAdvantagedRate: number | null;
  /** Today's assembled net worth, or null to skip recording a daily point. */
  netWorth: { totalUsd: number; byClass: Record<string, number> } | null;
  /** Live balance per Plaid account id (fetchPlaidSnapshot().bankAccounts),
   *  for balance-counting target goals (R-7.8). Optional so existing callers
   *  keep compiling; omitted or null means balances are unknown, and those
   *  goals report a null pace, never a zero-based one. The nightly scheduler
   *  should always pass this. */
  accountBalances?: Record<string, number> | null;
  /** How old the money behind these inputs is: the oldest `asOf` among the
   *  classes in the total, decided by `assembleNetWorth`. Optional so existing
   *  callers keep compiling; omitted or null is recorded as UNKNOWN, which the
   *  client renders differently from fresh (R-8.2). */
  inputsAsOf?: Date | null;
};

export type GoalRefreshResult = {
  derived: DerivedState;
  ladder: LadderState;
  stage: number;
  context: LadderContext;
};

/** One full pass of the goal pipeline for one user. Idempotent per day: the
 *  net-worth point upserts on (user, date), and the ladder only ever moves
 *  forward (rungs never un-complete, stage never drops). */
export async function refreshGoalSystem(
  userId: string,
  inputs: GoalRefreshInputs,
  now: Date,
): Promise<GoalRefreshResult> {
  const derived = await refreshDerivedState(userId, inputs.liquidCash, now);
  const declarations = await getDeclarations(userId);

  // The streak must be counted against the SAME rate the ladder will judge.
  const surplusTarget = declarations.surplusTargetRate ?? SURPLUS_SAVINGS_RATE;
  const monthsAtSurplusRate = await monthsAtSavingsRate(userId, surplusTarget, now);

  const context: LadderContext = {
    hasConnectedAccount: inputs.hasConnectedAccount,
    essentialMonthly: derived.essentialMonthly,
    incomeVolatility: derived.incomeVolatility,
    takeHomeMonthly: derived.takeHomeMonthly,
    liquidCash: derived.liquidCash,
    savingsRate: derived.savingsRate,
    monthsAtSurplusRate,
    highAprDebtBalances: inputs.highAprDebtBalances,
    investedTotal: inputs.investedTotal,
    taxAdvantagedRate: inputs.taxAdvantagedRate,
    // Founder decision: no employer-match storage or intake exists. 'unknown'
    // keeps rung 2 indeterminate, which the engine refuses to auto-complete.
    employerMatch: 'unknown',
    shelteredTargetRate: declarations.shelteredTargetRate,
    surplusTargetRate: declarations.surplusTargetRate,
  };

  const ladder = await refreshLadder(userId, context, now);
  await saveLadderInputs(userId, context, now, inputs.inputsAsOf ?? null);

  // Layer 2 and 3: target-goal pace (R-7.8) and guardrail periods (R-7.11,
  // R-7.12). Runs inside this seam so the nightly job gets it by calling
  // refreshGoalSystem, not a second pipeline.
  await evaluateGoalSystem(
    userId,
    {
      accountBalances: inputs.accountBalances ?? null,
      surplusTargetRate: declarations.surplusTargetRate,
    },
    now,
  );

  if (inputs.netWorth) {
    await recordNetWorthDaily(
      userId,
      now.toISOString().slice(0, 10),
      inputs.netWorth.totalUsd,
      inputs.netWorth.byClass,
    );
  }

  return { derived, ladder, stage: stageForLadder(ladder), context };
}

// --- Read-side presentation -------------------------------------------------

export type ActiveRungView = {
  id: number;
  key: string;
  name: string;
  stage: string;
  blurb: string;
  /** 0 to 1 progress toward the rung's condition. */
  progress: number;
  /** USD target, or null when the rung has none or the inputs are unknown. */
  target: number | null;
  gap: number | null;
  /** True when the inputs to judge this rung are missing; the UI must read
   *  "too early to say", never zero. */
  indeterminate: boolean;
};

export type LadderView = {
  currentRung: number;
  rungs: LadderState['rungs'];
  activeRung: ActiveRungView | null;
  /** Completed rungs whose condition is currently violated: surfaced as tasks,
   *  never as a demotion. */
  reopened: Array<{ id: number; key: string; name: string }>;
};

/** Pure assembly of the client-facing ladder shape from stored state plus the
 *  context of the last refresh. Null state means the pipeline has never run. */
export function ladderView(state: LadderState | null, inputs: LadderContext | null): LadderView | null {
  if (!state) return null;

  const active = RUNGS.find((r) => r.id === state.currentRung) ?? null;
  let activeRung: ActiveRungView | null = null;
  if (active) {
    const result = inputs
      ? active.evaluate(inputs)
      : { progress: 0, target: null, gap: null, satisfied: false, indeterminate: true };
    activeRung = {
      id: active.id,
      key: active.key,
      name: active.name,
      stage: active.stage,
      blurb: active.blurb,
      progress: result.progress,
      target: result.target,
      gap: result.gap,
      indeterminate: result.indeterminate,
    };
  }

  const reopened = inputs ? reopenedRungs(inputs, state).map((r) => ({ id: r.id, key: r.key, name: r.name })) : [];

  return { currentRung: state.currentRung, rungs: state.rungs, activeRung, reopened };
}

/** Apply a declared-rate change and immediately re-judge the ladder against the
 *  freshest stored financial inputs, so the user sees the effect of moving a
 *  slider without waiting for the next refresh. */
export async function reevaluateWithDeclarations(userId: string, now: Date): Promise<LadderState | null> {
  const stored = await getLadderInputs(userId);
  if (!stored) return getLadderState(userId);

  const declarations = await getDeclarations(userId);
  const surplusTarget = declarations.surplusTargetRate ?? SURPLUS_SAVINGS_RATE;
  const context: LadderContext = {
    ...stored,
    monthsAtSurplusRate: await monthsAtSavingsRate(userId, surplusTarget, now),
    shelteredTargetRate: declarations.shelteredTargetRate,
    surplusTargetRate: declarations.surplusTargetRate,
  };

  const ladder = await refreshLadder(userId, context, now);
  await saveLadderInputs(userId, context, now);
  return ladder;
}
