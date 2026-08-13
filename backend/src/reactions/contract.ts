// The reaction contract (docs/prd.md section 7.6, R-7.24, R-7.25).
//
// This table IS the spec's "most important table in the document", in code.
// Every event the product can produce carries a controllability class, and the
// class determines everything:
//
//   direct     - the user's own action in the last 7 days. The only class the
//                creature may react to.
//   structural - slowly-changing state (concentration, runway, utilization).
//                Never animates; renders as a card. utilization_high_pre_close
//                is the single structural event allowed to push (R-7.17).
//   exogenous  - market moves, price changes, score changes, valuation updates.
//                Never animates, never pushes, never appears in the feed. The
//                reasoning lives in reactions/external.ts and DR-5.
//
// PRINCIPLE 1 (the governing rule of the product): the pet reacts to what the
// user CONTROLS, never to the market. Adding an event here means deciding its
// class first; an exogenous event with an animation is a contract violation
// and the tests in tests/contract.test.ts pin against it.
//
// R-7.25: the engine collects EVERY match and this module decides which one the
// creature performs. The creature has one body: `priority` is the explicit,
// testable precedence (lower wins), replacing what used to be an accident of
// rule-array order. The order encodes a product judgment:
//
//   celebration (rung / debt cleared / goal) > needs-attention (overdue) >
//   routine positives > questions and curiosities > gentle negatives > neutral
//
// A rung completing is the loudest moment in the app (section 7.5); a paycheck
// landing is routine; an overspend is deliberately quiet and rate-limited.

import type { Reaction } from './types.js';

export type ControllabilityClass = 'direct' | 'structural' | 'exogenous';

/** Push policy per event (R-9.5). The animation no longer decides pushability:
 *  overspend_vs_plan animates `concerned` and must NEVER push, while
 *  bill_overdue animates `concerned` and pushes once. Only the event knows.
 *
 *   always - may push, subject to the R-9.1 budget and quiet hours
 *   once   - may push, once per episode (same-type cooldown enforces this)
 *   digest - weekly digest only (R-9.4); never an immediate push
 *   no     - routine; never worth a buzz
 *   never  - the R-9.5 never-list; pushing this is a product violation */
export type PushPolicy = 'always' | 'once' | 'digest' | 'no' | 'never';

export type ReactionContractEntry = {
  class: ControllabilityClass;
  /** Precedence when one event must be chosen from several. Lower wins. */
  priority: number;
  push: PushPolicy;
  /** Applied to the legacy healthScore/mood pair until the R-7.19 three-variable
   *  model (stage/vitality/rest) replaces it. Sign follows the R-7.24
   *  stage/vitality column; magnitudes are carried over from health/score.ts. */
  healthDelta: number;
  /** Exempt from the R-7.25 per-day reaction budget. Reserved for the rare,
   *  justified moments: celebrations and the one actionable warning. */
  budgetExempt: boolean;
};

export const REACTION_CONTRACT = {
  // --- Celebration tier: the moments the product exists for ------------------
  ladder_rung_completed: { class: 'direct', priority: 10, push: 'always', healthDelta: 15, budgetExempt: true },
  debt_cleared: { class: 'direct', priority: 20, push: 'always', healthDelta: 15, budgetExempt: true },
  goal_achieved: { class: 'direct', priority: 30, push: 'always', healthDelta: 15, budgetExempt: true },

  // --- Needs attention: actionable, pushes once, never masked by a routine
  //     positive in the same batch ---------------------------------------------
  bill_overdue: { class: 'direct', priority: 40, push: 'once', healthDelta: -5, budgetExempt: true },
  // Spinwheel's view of the same real-world fact as bill_overdue.
  debt_missed_payment: { class: 'direct', priority: 41, push: 'once', healthDelta: -5, budgetExempt: true },

  // --- Routine positives: happy in-app, never a buzz --------------------------
  paycheck_received: { class: 'direct', priority: 50, push: 'no', healthDelta: 10, budgetExempt: false },
  extra_debt_payment: { class: 'direct', priority: 51, push: 'no', healthDelta: 10, budgetExempt: false },
  // Spinwheel/liability-cache vocabulary for extra_debt_payment.
  debt_paydown: { class: 'direct', priority: 52, push: 'no', healthDelta: 10, budgetExempt: false },
  contribution_made: { class: 'direct', priority: 53, push: 'no', healthDelta: 10, budgetExempt: false },
  bill_paid_on_time: { class: 'direct', priority: 54, push: 'no', healthDelta: 5, budgetExempt: false },
  streak_extended: { class: 'direct', priority: 55, push: 'no', healthDelta: 5, budgetExempt: false },
  connection_added: { class: 'direct', priority: 56, push: 'no', healthDelta: 5, budgetExempt: false },
  subscription_cancelled: { class: 'direct', priority: 57, push: 'no', healthDelta: 5, budgetExempt: false },
  // Crypto/DeFi inflows are transfers the user made or arranged (DR-5 allows
  // them); their USD size is market-priced, so no health delta rides on them.
  crypto_received: { class: 'direct', priority: 60, push: 'no', healthDelta: 0, budgetExempt: false },
  wallet_receive: { class: 'direct', priority: 61, push: 'no', healthDelta: 0, budgetExempt: false },
  defi_yield: { class: 'direct', priority: 62, push: 'no', healthDelta: 0, budgetExempt: false },
  goal_period_passed: { class: 'direct', priority: 65, push: 'digest', healthDelta: 5, budgetExempt: false },

  // --- Questions and curiosities ----------------------------------------------
  subscription_detected: { class: 'direct', priority: 70, push: 'digest', healthDelta: 0, budgetExempt: false },
  // R-7.24: neutral + question, never concern. A big purchase is a question to
  // ask ("That was a big one. Planned?"), not a failure to mourn, so it carries
  // no health delta at all.
  large_purchase: { class: 'direct', priority: 75, push: 'no', healthDelta: 0, budgetExempt: false },

  // --- Gentle negatives: in-app only, never a push (R-9.5) --------------------
  overspend_vs_plan: { class: 'direct', priority: 80, push: 'never', healthDelta: -5, budgetExempt: false },
  goal_period_missed: { class: 'direct', priority: 85, push: 'never', healthDelta: -5, budgetExempt: false },
  // R-7.12: a broken streak resets the counter and NOTHING else. No stage loss,
  // no distress, no push, no health delta. The neutral acknowledgment exists so
  // the moment is honest, not so it hurts.
  streak_broken: { class: 'direct', priority: 86, push: 'never', healthDelta: 0, budgetExempt: false },
  // R-7.23: a decision, not a moral failure. Neutral, silent, never interrupts.
  new_liability: { class: 'direct', priority: 90, push: 'never', healthDelta: 0, budgetExempt: false },

  // --- Sandbox-only. /api/debug/react exists to exercise the full push path in
  //     TestFlight demos and is only registered when PLAID_ENV=sandbox. --------
  debug: { class: 'direct', priority: 95, push: 'always', healthDelta: 0, budgetExempt: true },

  // --- Structural: card on the relevant tab, never an animation ----------------
  // The one structural push in the product (R-7.17): pay-before-close.
  utilization_high_pre_close: {
    class: 'structural',
    priority: 100,
    push: 'always',
    healthDelta: 0,
    budgetExempt: true,
  },
  concentration_high: { class: 'structural', priority: 101, push: 'digest', healthDelta: 0, budgetExempt: false },
  runway_low: { class: 'structural', priority: 102, push: 'digest', healthDelta: 0, budgetExempt: false },
  cash_drag_high: { class: 'structural', priority: 103, push: 'digest', healthDelta: 0, budgetExempt: false },

  // --- Exogenous: the never-list (R-7.22, R-9.5, DR-5) -------------------------
  net_worth_milestone: { class: 'exogenous', priority: 900, push: 'never', healthDelta: 0, budgetExempt: false },
  credit_score_improved: { class: 'exogenous', priority: 901, push: 'never', healthDelta: 0, budgetExempt: false },
  credit_score_dropped: { class: 'exogenous', priority: 902, push: 'never', healthDelta: 0, budgetExempt: false },
  asset_revalued: { class: 'exogenous', priority: 903, push: 'never', healthDelta: 0, budgetExempt: false },
} as const satisfies Record<string, ReactionContractEntry>;

export type ReactionEventName = keyof typeof REACTION_CONTRACT;

/** Unknown names (a future producer wired before its contract row lands) get
 *  the quietest possible treatment: direct so the reaction still records, last
 *  in precedence, no push, no health movement. Silence is the safe default. */
const UNKNOWN_EVENT_ENTRY: ReactionContractEntry = {
  class: 'direct',
  priority: 500,
  push: 'no',
  healthDelta: 0,
  budgetExempt: false,
};

export function contractFor(name: string): ReactionContractEntry {
  return (REACTION_CONTRACT as Record<string, ReactionContractEntry>)[name] ?? UNKNOWN_EVENT_ENTRY;
}

/** Events whose contract allows an immediate alert push ('always' or 'once').
 *  This set, not the animation, is what the dispatcher enforces (R-9.5).
 *  Pinned by tests/dispatch.test.ts: widening it is a product decision. */
export const PUSHABLE_EVENTS: ReadonlySet<string> = new Set(
  Object.entries(REACTION_CONTRACT)
    .filter(([, entry]) => entry.push === 'always' || entry.push === 'once')
    .map(([name]) => name),
);

/** R-7.25: the per-day reaction budget. At most this many budgeted (non-exempt)
 *  reactions perform per user per UTC day, so a large sync batch cannot flood
 *  the creature or the feed. Chosen, not specified: 5 covers a payday (paycheck
 *  plus several bills) without muting the afternoon. */
export const DAILY_REACTION_BUDGET = 5;

/** R-7.24: overspend_vs_plan performs at most once per rolling week. */
export const OVERSPEND_COOLDOWN_DAYS = 7;

/** Stable precedence sort: contract priority first, original order as the
 *  tiebreak so equal-priority candidates (e.g. several rungs completing at
 *  once) keep the order the producer chose. */
export function orderCandidates<T extends { name: string }>(candidates: T[]): T[] {
  return candidates
    .map((candidate, index) => ({ candidate, index }))
    .sort((a, b) => {
      const byPriority = contractFor(a.candidate.name).priority - contractFor(b.candidate.name).priority;
      return byPriority !== 0 ? byPriority : a.index - b.index;
    })
    .map(({ candidate }) => candidate);
}

// --- Canonical reaction shapes for non-engine producers ----------------------
//
// The transaction rules (rules/definitions.ts) build their own reactions with
// amounts in the reason. Producers outside the engine (ladder, guardrails,
// goals, link flow, liabilities webhook) use these presets so the same event
// always looks the same. Animations bind to the R-7.24 table.

const REACTION_PRESETS: Partial<Record<ReactionEventName, Omit<Reaction, 'reason'>>> = {
  ladder_rung_completed: { animation: 'celebrate', sound: 'fanfare', led: 'rainbow', duration: 4000 },
  debt_cleared: { animation: 'celebrate', sound: 'fanfare', led: 'rainbow', duration: 4000 },
  goal_achieved: { animation: 'celebrate', sound: 'fanfare', led: 'green', duration: 3000 },
  subscription_cancelled: { animation: 'celebrate', sound: 'chime', led: 'green', duration: 2000 },
  bill_overdue: { animation: 'concerned', sound: 'warning', led: 'amber', duration: 2000 },
  goal_period_passed: { animation: 'happy', sound: 'chime', led: 'green', duration: 2000 },
  streak_extended: { animation: 'happy', sound: 'chime', led: 'green', duration: 2000 },
  connection_added: { animation: 'happy', sound: 'chime', led: 'green', duration: 2000 },
  subscription_detected: { animation: 'curious', sound: 'off', led: 'off', duration: 1500 },
  goal_period_missed: { animation: 'neutral', sound: 'off', led: 'off', duration: 1500 },
  streak_broken: { animation: 'neutral', sound: 'off', led: 'off', duration: 1500 },
};

/** Build the canonical reaction for a preset event. The reason is a plain event
 *  label by default; callers may append context but must keep the security rule
 *  in mind: the reason may carry detail because it never reaches a log line or
 *  a push body (dispatch.ts strips it), but less is still better. */
export function reactionForEvent(name: ReactionEventName, reason?: string): Reaction {
  const preset = REACTION_PRESETS[name];
  if (!preset) {
    // A non-animating class asked for an animation: contract violation caught
    // in development, silent neutral in production.
    return { animation: 'neutral', sound: 'off', led: 'off', duration: 1000, reason: reason ?? name };
  }
  return { ...preset, reason: reason ?? name };
}
