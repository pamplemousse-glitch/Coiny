import type { TellerTransaction } from '../teller/types.js';
import type { Reaction } from '../reactions/types.js';

export type Rule = {
  name: string;
  match: (tx: TellerTransaction) => boolean;
  react: (tx: TellerTransaction) => Reaction;
};

// Hardcoded Phase 1 goals — replaced by per-user config in Phase 3.
const PAYCHECK_MIN_AMOUNT = 500;
const LARGE_PURCHASE_THRESHOLD = 200;
const WEEKLY_BUDGET_CATEGORIES = new Set(['groceries', 'food_and_drink', 'restaurants']);
const WEEKLY_BUDGET_LIMIT = 150;
const SAVINGS_GOAL = 1000;
const SAVINGS_MILESTONES = [0.25, 0.5, 1.0] as const;
const KNOWN_BILLERS = new Set(['electric company', 'water utilities', 'internet provider', 'insurance']);

function parseDollar(amount: string): number {
  return Math.abs(parseFloat(amount));
}

function isCredit(tx: TellerTransaction): boolean {
  return parseFloat(tx.amount) > 0;
}

function isDebit(tx: TellerTransaction): boolean {
  return parseFloat(tx.amount) < 0;
}

function formatAmount(amount: string): string {
  return `$${parseDollar(amount).toFixed(2)}`;
}

export const rules: Rule[] = [
  {
    name: 'paycheck_received',
    match(tx) {
      return isCredit(tx) && parseDollar(tx.amount) >= PAYCHECK_MIN_AMOUNT;
    },
    react(tx) {
      return {
        animation: 'celebrate',
        sound: 'fanfare',
        led: 'rainbow',
        duration: 3000,
        reason: `paycheck_received (Direct Deposit ${formatAmount(tx.amount)})`,
      };
    },
  },

  {
    name: 'overspent_in_category',
    match(tx) {
      if (!isDebit(tx)) return false;
      const category = tx.details?.category?.toLowerCase() ?? '';
      return WEEKLY_BUDGET_CATEGORIES.has(category) && parseDollar(tx.amount) > WEEKLY_BUDGET_LIMIT;
    },
    react(tx) {
      const category = tx.details?.category ?? 'unknown';
      return {
        animation: 'sad',
        sound: 'warning',
        led: 'amber',
        duration: 2000,
        reason: `overspent_in_category (${category} ${formatAmount(tx.amount)})`,
      };
    },
  },

  {
    name: 'savings_milestone',
    match(tx) {
      if (!tx.running_balance) return false;
      const balance = parseFloat(tx.running_balance);
      const pct = balance / SAVINGS_GOAL;
      return SAVINGS_MILESTONES.some((m) => {
        const prevBalance = balance - parseFloat(tx.amount);
        const prevPct = prevBalance / SAVINGS_GOAL;
        return prevPct < m && pct >= m;
      });
    },
    react(tx) {
      const balance = parseFloat(tx.running_balance ?? '0');
      const pct = Math.round((balance / SAVINGS_GOAL) * 100);
      const isComplete = pct >= 100;
      return {
        animation: isComplete ? 'celebrate' : 'happy',
        sound: isComplete ? 'fanfare' : 'chime',
        led: 'green',
        duration: isComplete ? 3000 : 2000,
        reason: `savings_milestone (${pct}% of goal reached)`,
      };
    },
  },

  {
    name: 'bill_paid_on_time',
    match(tx) {
      if (!isDebit(tx)) return false;
      const counterparty = tx.details?.counterparty?.name?.toLowerCase() ?? '';
      return Array.from(KNOWN_BILLERS).some((b) => counterparty.includes(b));
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
    name: 'large_purchase',
    match(tx) {
      return isDebit(tx) && parseDollar(tx.amount) > LARGE_PURCHASE_THRESHOLD;
    },
    react(tx) {
      return {
        animation: 'concerned',
        sound: 'warning',
        led: 'amber',
        duration: 2000,
        reason: `large_purchase (${formatAmount(tx.amount)})`,
      };
    },
  },
];
