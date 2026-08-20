import { describe, expect, it } from 'vitest';
import { evaluateAll, type RuleContext } from '../src/rules/engine.js';
import type { PetGoals } from '../src/store/pet.js';
import type { Transaction } from '../src/types/transaction.js';

// Plaid grades every categorisation VERY_HIGH down to LOW, plus UNKNOWN, and
// the grade was typed and read nowhere. A guess Plaid itself called LOW
// breached a weekly budget with exactly the authority of a certain one, and
// the visible cost is a pet looking worried about a transaction the user never
// miscategorised.

const GOALS: PetGoals = {
  weeklyBudgetByCategory: { groceries: 150, food_and_drink: 150, restaurants: 150 },
  savingsGoal: 1000,
  paycheckMinAmount: 500,
  largePurchaseThreshold: 200,
};

type Confidence = NonNullable<NonNullable<Transaction['details']>['categoryConfidence']>;

/** A grocery debit that on its own crosses the $150 weekly limit. */
function groceryBreach(confidence?: Confidence): Transaction {
  return {
    id: `txn_${confidence ?? 'absent'}`,
    account_id: 'acc_test',
    amount: '-160.00',
    date: '2026-08-20',
    description: 'Test',
    status: 'posted',
    type: 'card_payment',
    running_balance: null,
    details: { category: 'groceries', ...(confidence !== undefined ? { categoryConfidence: confidence } : {}) },
  };
}

const CONTEXT: RuleContext = { weeklySpendByCategory: { groceries: 160 } } as RuleContext;

function fired(confidence?: Confidence): boolean {
  return evaluateAll(groceryBreach(confidence), GOALS, CONTEXT).some((m) => m.name === 'overspend_vs_plan');
}

describe('overspend_vs_plan respects Plaid category confidence', () => {
  it('fires on a high-confidence categorisation', () => {
    expect(fired('VERY_HIGH')).toBe(true);
  });

  it('does not fire when Plaid grades its own guess LOW', () => {
    expect(fired('LOW')).toBe(false);
  });

  // A user override is not a guess, and must never be second-guessed.
  it('fires on a user-set category whatever any vendor would have said', () => {
    expect(fired('USER')).toBe(true);
  });

  // Absence of evidence about quality is not evidence of poor quality:
  // blocking these would silently switch the rule off for real history.
  it('still fires when the field is absent, as on rows predating it', () => {
    expect(fired()).toBe(true);
  });

  it('still fires on UNKNOWN, which is dominated by legacy-taxonomy rows', () => {
    expect(fired('UNKNOWN')).toBe(true);
  });
});
