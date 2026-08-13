// Per-transaction rules, named to the R-7.24 event taxonomy (docs/prd.md
// section 7.6). These are the LEAST of the reaction sources now: the ladder,
// guardrails and goal system produce the moments that matter. Everything here
// is a routine event, and its treatment (animation, precedence, push policy,
// health delta) binds through reactions/contract.ts.
//
// R-7.24 deltas from the legacy five rules:
//   - paycheck_received celebrates no more: a paycheck is routine (happy).
//     Celebration is reserved for rungs, cleared debts and achieved goals.
//   - overspent_in_category is renamed overspend_vs_plan and softened from
//     sad to concerned. It performs at most once per week (enforced in
//     reactions/perform.ts) and never pushes.
//   - large_purchase drops the concerned/amber punishment entirely: neutral
//     plus a question ("That was a big one. Planned?", section 10), no health
//     movement. A big purchase is a question, not a verdict.
//   - savings_milestone is renamed contribution_made: the celebration event
//     the taxonomy wants is dollars the user moved, not a balance threshold.
//     Milestone crossings of the legacy savings goal still detect it (the
//     legacy pet_state goal columns power these rules until R-13.3 drops
//     them), but the animation is happy: goal completion celebrations belong
//     to the target-goal system (goals/evaluation.ts emits goal_achieved).
//
// extra_debt_payment is deliberately NOT detected here: telling an extra
// payment from a minimum payment requires the debt_accounts merge (R-7.13),
// which does not exist. A loan payment still lands as bill_paid_on_time, and
// guessing "extra" without the minimum would celebrate wrong.

import type { Reaction } from '../reactions/types.js';
import type { PetGoals } from '../store/pet.js';
import type { Transaction } from '../types/transaction.js';

export type RuleContext = {
  weeklySpendByCategory: Record<string, number>;
};

export type Rule = {
  name: string;
  match: (tx: Transaction, goals: PetGoals, context: RuleContext) => boolean;
  react: (tx: Transaction, goals: PetGoals) => Reaction;
};

const WEEKLY_BUDGET_CATEGORIES = new Set(['groceries', 'food_and_drink', 'restaurants']);
const CONTRIBUTION_MILESTONES = [0.25, 0.5, 1.0] as const;
const BILL_CATEGORIES = new Set(['utilities', 'loan_payment', 'rent', 'insurance', 'mortgage']);

function parseDollar(amount: string): number {
  return Math.abs(parseFloat(amount));
}

function isCredit(tx: Transaction): boolean {
  return parseFloat(tx.amount) > 0;
}

function isDebit(tx: Transaction): boolean {
  return parseFloat(tx.amount) < 0;
}

function formatAmount(amount: string): string {
  return `$${parseDollar(amount).toFixed(2)}`;
}

export const rules: Rule[] = [
  {
    name: 'paycheck_received',
    match(tx, goals) {
      return isCredit(tx) && tx.details?.category === 'paycheck' && parseDollar(tx.amount) >= goals.paycheckMinAmount;
    },
    react(tx) {
      return {
        animation: 'happy',
        sound: 'chime',
        led: 'green',
        duration: 2000,
        reason: `paycheck_received (Direct Deposit ${formatAmount(tx.amount)})`,
      };
    },
  },

  {
    name: 'contribution_made',
    match(tx, goals) {
      if (!tx.running_balance) return false;
      const balance = parseFloat(tx.running_balance);
      const goal = goals.savingsGoal;
      const pct = balance / goal;
      const prevPct = (balance - parseFloat(tx.amount)) / goal;
      return CONTRIBUTION_MILESTONES.some((m) => prevPct < m && pct >= m);
    },
    react(tx, goals) {
      const balance = parseFloat(tx.running_balance ?? '0');
      const pct = Math.round((balance / goals.savingsGoal) * 100);
      return {
        animation: 'happy',
        sound: 'chime',
        led: 'green',
        duration: 2000,
        reason: `contribution_made (${pct}% of savings goal)`,
      };
    },
  },

  {
    name: 'bill_paid_on_time',
    match(tx) {
      if (!isDebit(tx)) return false;
      return BILL_CATEGORIES.has(tx.details?.category ?? '');
    },
    react(tx) {
      const counterparty = tx.details?.counterparty?.name ?? 'biller';
      return {
        animation: 'happy',
        sound: 'coin',
        led: 'green',
        duration: 2000,
        reason: `bill_paid_on_time (${counterparty} ${formatAmount(tx.amount)})`,
      };
    },
  },

  {
    name: 'overspend_vs_plan',
    match(tx, goals, context) {
      if (!isDebit(tx)) return false;
      const category = tx.details?.category?.toLowerCase() ?? '';
      const limit = goals.weeklyBudgetByCategory[category] ?? null;
      if (limit === null || !WEEKLY_BUDGET_CATEGORIES.has(category)) return false;
      // weeklyTotal already includes this transaction (caller adds it before evaluating).
      // prevTotal reconstructs the running total before this transaction.
      // Fire only when this transaction is the one that crosses the threshold.
      const weeklyTotal = context.weeklySpendByCategory[category] ?? 0;
      const prevTotal = weeklyTotal - parseDollar(tx.amount);
      return prevTotal < limit && weeklyTotal > limit;
    },
    react(tx) {
      const category = tx.details?.category ?? 'unknown';
      return {
        animation: 'concerned',
        sound: 'warning',
        led: 'amber',
        duration: 2000,
        reason: `overspend_vs_plan (${category} ${formatAmount(tx.amount)})`,
      };
    },
  },

  {
    name: 'large_purchase',
    match(tx, goals) {
      return isDebit(tx) && parseDollar(tx.amount) > goals.largePurchaseThreshold;
    },
    react(tx) {
      return {
        animation: 'neutral',
        sound: 'off',
        led: 'off',
        duration: 2000,
        reason: `large_purchase (${formatAmount(tx.amount)})`,
      };
    },
  },
];
