import { describe, expect, it } from 'vitest';
import { evaluateAll, type RuleContext } from '../src/rules/engine.js';
import type { PetGoals } from '../src/store/pet.js';
import type { Transaction } from '../src/types/transaction.js';

const DEFAULT_GOALS: PetGoals = {
  weeklyBudgetByCategory: { groceries: 150, food_and_drink: 150, restaurants: 150 },
  savingsGoal: 1000,
  paycheckMinAmount: 500,
  largePurchaseThreshold: 200,
};

function tx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'txn_test',
    account_id: 'acc_test',
    amount: '-10.00',
    date: '2026-05-19',
    description: 'Test',
    status: 'posted',
    type: 'card_payment',
    running_balance: null,
    ...overrides,
  };
}

/** Convenience: the single match for cases where exactly one rule should fire. */
function only(matches: ReturnType<typeof evaluateAll>) {
  expect(matches).toHaveLength(1);
  return matches[0]!;
}

describe('rule engine', () => {
  // R-7.25: collect-all, not first-match. A transaction tripping several rules
  // reports every one of them; choosing what the creature performs is the
  // contract's job, not the array's.
  describe('collect-all', () => {
    it('reports both matches for a paycheck that also crosses a savings milestone', () => {
      const matches = evaluateAll(
        tx({
          amount: '2400.00',
          type: 'transfer',
          running_balance: '260.00',
          details: { category: 'paycheck' },
        }),
        DEFAULT_GOALS,
      );
      expect(matches.map((m) => m.name)).toEqual(['paycheck_received', 'contribution_made']);
    });

    it('reports both matches for a large bill payment', () => {
      const matches = evaluateAll(
        tx({ amount: '-350.00', type: 'ach', details: { category: 'utilities' } }),
        DEFAULT_GOALS,
      );
      expect(matches.map((m) => m.name)).toEqual(['bill_paid_on_time', 'large_purchase']);
    });

    it('returns an empty array when nothing matches', () => {
      expect(evaluateAll(tx({ amount: '-5.00' }), DEFAULT_GOALS)).toEqual([]);
    });
  });

  describe('paycheck_received', () => {
    // R-7.24: a paycheck is routine, so it is happy, not celebrate. Celebration
    // is reserved for rungs, cleared debts and achieved goals.
    it('fires happy for a credit >= $500 with paycheck category', () => {
      const match = only(evaluateAll(tx({ amount: '2400.00', details: { category: 'paycheck' } }), DEFAULT_GOALS));
      expect(match.name).toBe('paycheck_received');
      expect(match.reaction.animation).toBe('happy');
      expect(match.reaction.reason).toMatch(/paycheck_received/);
    });

    it('does not fire for a small credit even with paycheck category', () => {
      expect(evaluateAll(tx({ amount: '50.00', details: { category: 'paycheck' } }), DEFAULT_GOALS)).toEqual([]);
    });

    it('does not fire for a large credit without paycheck category (prevents false positives on refunds)', () => {
      expect(evaluateAll(tx({ amount: '2400.00' }), DEFAULT_GOALS)).toEqual([]);
    });
  });

  describe('overspend_vs_plan', () => {
    // Helper: build context where a single transaction is the only weekly spend
    function ctxWith(category: string, total: number): RuleContext {
      return { weeklySpendByCategory: { [category]: total } };
    }

    // R-7.24: concerned, not sad. The overspend is a nudge, not a mourning.
    it('fires concerned when this transaction pushes weekly groceries over the $150 limit', () => {
      const match = only(
        evaluateAll(
          tx({ amount: '-65.00', type: 'card_payment', details: { category: 'groceries' } }),
          DEFAULT_GOALS,
          ctxWith('groceries', 185),
        ),
      );
      expect(match.name).toBe('overspend_vs_plan');
      expect(match.reaction.animation).toBe('concerned');
      expect(match.reaction.reason).toMatch(/overspend_vs_plan/);
    });

    it('fires when a single large transaction exceeds the limit on its own', () => {
      const matches = evaluateAll(
        tx({
          amount: '-185.00',
          type: 'card_payment',
          details: { category: 'groceries', counterparty: { name: 'Whole Foods', type: 'organization' } },
        }),
        DEFAULT_GOALS,
        ctxWith('groceries', 185),
      );
      expect(matches.map((m) => m.name)).toEqual(['overspend_vs_plan']);
    });

    it('does not fire when already over limit before this transaction', () => {
      // $200 already spent (over $150 limit); this $40 tx should not re-trigger
      const matches = evaluateAll(
        tx({ amount: '-40.00', type: 'card_payment', details: { category: 'groceries' } }),
        DEFAULT_GOALS,
        ctxWith('groceries', 240),
      );
      expect(matches).toEqual([]);
    });

    it('does not fire when under budget', () => {
      const matches = evaluateAll(
        tx({ amount: '-30.00', type: 'card_payment', details: { category: 'groceries' } }),
        DEFAULT_GOALS,
        ctxWith('groceries', 30),
      );
      expect(matches).toEqual([]);
    });

    it('does not fire for non-budget categories', () => {
      const matches = evaluateAll(
        tx({ amount: '-200.00', type: 'card_payment', details: { category: 'electronics' } }),
        DEFAULT_GOALS,
        ctxWith('electronics', 200),
      );
      // The $200 threshold is not crossed ($200 is not > $200), and electronics
      // is not a budget category, so nothing fires.
      expect(matches).toEqual([]);
    });

    it('does not fire for a credit transaction', () => {
      const matches = evaluateAll(
        tx({ amount: '30.00', details: { category: 'groceries' } }),
        DEFAULT_GOALS,
        ctxWith('groceries', 0),
      );
      expect(matches).toEqual([]);
    });
  });

  describe('contribution_made', () => {
    // R-7.24: renamed from savings_milestone, and always happy. Reaching 100%
    // of the legacy savings goal no longer celebrates from here: goal
    // completion celebrations belong to the target-goal system.
    it('fires happy when crossing 25% of the $1000 goal', () => {
      const match = only(
        evaluateAll(
          tx({
            amount: '60.00',
            type: 'transfer',
            running_balance: '260.00',
            details: { category: 'transfer' },
          }),
          DEFAULT_GOALS,
        ),
      );
      expect(match.name).toBe('contribution_made');
      expect(match.reaction.animation).toBe('happy');
      expect(match.reaction.reason).toMatch(/contribution_made/);
    });

    it('does not fire when no milestone is crossed', () => {
      const matches = evaluateAll(
        tx({
          amount: '10.00',
          type: 'transfer',
          running_balance: '100.00',
          details: { category: 'transfer' },
        }),
        DEFAULT_GOALS,
      );
      expect(matches).toEqual([]);
    });

    it('does not fire when running_balance is null', () => {
      expect(evaluateAll(tx({ amount: '60.00', type: 'transfer', running_balance: null }), DEFAULT_GOALS)).toEqual([]);
    });

    it('stays happy (not celebrate) at the 100% milestone', () => {
      const match = only(
        evaluateAll(
          tx({
            amount: '1.00',
            type: 'transfer',
            running_balance: '1000.00',
            details: { category: 'transfer' },
          }),
          DEFAULT_GOALS,
        ),
      );
      expect(match.name).toBe('contribution_made');
      expect(match.reaction.animation).toBe('happy');
    });
  });

  describe('bill_paid_on_time', () => {
    it('fires for a utility payment (category: utilities)', () => {
      const match = only(
        evaluateAll(
          tx({
            amount: '-89.99',
            type: 'ach',
            details: { category: 'utilities', counterparty: { name: 'CONSOLIDATED EDISON', type: 'organization' } },
          }),
          DEFAULT_GOALS,
        ),
      );
      expect(match.name).toBe('bill_paid_on_time');
      expect(match.reaction.animation).toBe('happy');
      expect(match.reaction.sound).toBe('coin');
      expect(match.reaction.reason).toMatch(/bill_paid_on_time/);
    });

    it('fires for a credit card payment (category: loan_payment)', () => {
      const matches = evaluateAll(
        tx({
          amount: '-200.00',
          type: 'ach',
          details: { category: 'loan_payment' },
        }),
        DEFAULT_GOALS,
      );
      expect(matches.map((m) => m.name)).toContain('bill_paid_on_time');
    });

    it('fires for a rent payment (category: rent)', () => {
      const matches = evaluateAll(
        tx({ amount: '-1500.00', type: 'ach', details: { category: 'rent' } }),
        DEFAULT_GOALS,
      );
      expect(matches.map((m) => m.name)).toContain('bill_paid_on_time');
    });

    it('does not fire for non-bill categories', () => {
      const matches = evaluateAll(
        tx({
          amount: '-30.00',
          type: 'ach',
          details: { category: 'services', counterparty: { name: 'AT&T*BILL', type: 'organization' } },
        }),
        DEFAULT_GOALS,
      );
      expect(matches).toEqual([]);
    });

    it('does not fire for credit transactions', () => {
      expect(evaluateAll(tx({ amount: '89.99', details: { category: 'utilities' } }), DEFAULT_GOALS)).toEqual([]);
    });
  });

  describe('large_purchase', () => {
    // R-7.24: neutral plus a question, never concern. The old concerned/amber
    // treatment punished spending money on purpose; this asks about it instead.
    it('fires neutral with no sound for a purchase > $200', () => {
      const match = only(evaluateAll(tx({ amount: '-349.99', type: 'card_payment' }), DEFAULT_GOALS));
      expect(match.name).toBe('large_purchase');
      expect(match.reaction.animation).toBe('neutral');
      expect(match.reaction.sound).toBe('off');
      expect(match.reaction.led).toBe('off');
      expect(match.reaction.reason).toMatch(/large_purchase/);
    });

    it('does not fire for a small purchase', () => {
      expect(evaluateAll(tx({ amount: '-50.00', type: 'card_payment' }), DEFAULT_GOALS)).toEqual([]);
    });
  });
});
