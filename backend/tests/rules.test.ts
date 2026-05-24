import { describe, expect, it } from 'vitest';
import { evaluate, type RuleContext } from '../src/rules/engine.js';
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

describe('rule engine', () => {
  describe('paycheck_received', () => {
    it('fires for a credit >= $500 with paycheck category', () => {
      const match = evaluate(tx({ amount: '2400.00', details: { category: 'paycheck' } }), DEFAULT_GOALS);
      expect(match?.name).toBe('paycheck_received');
      expect(match?.reaction.animation).toBe('celebrate');
      expect(match?.reaction.reason).toMatch(/paycheck_received/);
    });

    it('does not fire for a small credit even with paycheck category', () => {
      const match = evaluate(tx({ amount: '50.00', details: { category: 'paycheck' } }), DEFAULT_GOALS);
      expect(match).toBeNull();
    });

    it('does not fire for a large credit without paycheck category (prevents false positives on refunds)', () => {
      const match = evaluate(tx({ amount: '2400.00' }), DEFAULT_GOALS);
      expect(match).toBeNull();
    });
  });

  describe('overspent_in_category', () => {
    // Helper: build context where a single transaction is the only weekly spend
    function ctxWith(category: string, total: number): RuleContext {
      return { weeklySpendByCategory: { [category]: total } };
    }

    it('fires when this transaction pushes weekly groceries over the $150 limit', () => {
      // $120 already spent this week + $65 now = $185 total, crossing $150
      const match = evaluate(
        tx({ amount: '-65.00', type: 'card_payment', details: { category: 'groceries' } }),
        DEFAULT_GOALS,
        ctxWith('groceries', 185),
      );
      expect(match?.name).toBe('overspent_in_category');
      expect(match?.reaction.animation).toBe('sad');
      expect(match?.reaction.reason).toMatch(/overspent_in_category/);
    });

    it('fires when a single large transaction exceeds the limit on its own', () => {
      const match = evaluate(
        tx({
          amount: '-185.00',
          type: 'card_payment',
          details: { category: 'groceries', counterparty: { name: 'Whole Foods', type: 'organization' } },
        }),
        DEFAULT_GOALS,
        ctxWith('groceries', 185),
      );
      expect(match?.name).toBe('overspent_in_category');
    });

    it('does not fire when already over limit before this transaction', () => {
      // $200 already spent (over $150 limit); this $40 tx should not re-trigger
      const match = evaluate(
        tx({ amount: '-40.00', type: 'card_payment', details: { category: 'groceries' } }),
        DEFAULT_GOALS,
        ctxWith('groceries', 240),
      );
      expect(match).toBeNull();
    });

    it('does not fire when under budget', () => {
      const match = evaluate(
        tx({ amount: '-30.00', type: 'card_payment', details: { category: 'groceries' } }),
        DEFAULT_GOALS,
        ctxWith('groceries', 30),
      );
      expect(match).toBeNull();
    });

    it('does not fire for non-budget categories', () => {
      const match = evaluate(
        tx({ amount: '-200.00', type: 'card_payment', details: { category: 'electronics' } }),
        DEFAULT_GOALS,
        ctxWith('electronics', 200),
      );
      expect(match).toBeNull();
    });

    it('does not fire for a credit transaction', () => {
      const match = evaluate(
        tx({ amount: '30.00', details: { category: 'groceries' } }),
        DEFAULT_GOALS,
        ctxWith('groceries', 0),
      );
      expect(match).toBeNull();
    });
  });

  describe('savings_milestone', () => {
    it('fires when crossing 25% of the $1000 goal', () => {
      const match = evaluate(
        tx({
          amount: '60.00',
          type: 'transfer',
          running_balance: '260.00',
          details: { category: 'transfer' },
        }),
        DEFAULT_GOALS,
      );
      expect(match?.name).toBe('savings_milestone');
      expect(match?.reaction.animation).toBe('happy');
      expect(match?.reaction.reason).toMatch(/savings_milestone/);
    });

    it('does not fire when no milestone is crossed', () => {
      const match = evaluate(
        tx({
          amount: '10.00',
          type: 'transfer',
          running_balance: '100.00',
          details: { category: 'transfer' },
        }),
        DEFAULT_GOALS,
      );
      expect(match).toBeNull();
    });

    it('does not fire when running_balance is null', () => {
      const match = evaluate(tx({ amount: '60.00', type: 'transfer', running_balance: null }), DEFAULT_GOALS);
      expect(match).toBeNull();
    });

    it('fires celebrate animation at 100% milestone', () => {
      const match = evaluate(
        tx({
          amount: '1.00',
          type: 'transfer',
          running_balance: '1000.00',
          details: { category: 'transfer' },
        }),
        DEFAULT_GOALS,
      );
      expect(match?.name).toBe('savings_milestone');
      expect(match?.reaction.animation).toBe('celebrate');
    });
  });

  describe('bill_paid_on_time', () => {
    it('fires for a utility payment (category: utilities)', () => {
      const match = evaluate(
        tx({
          amount: '-89.99',
          type: 'ach',
          details: { category: 'utilities', counterparty: { name: 'CONSOLIDATED EDISON', type: 'organization' } },
        }),
        DEFAULT_GOALS,
      );
      expect(match?.name).toBe('bill_paid_on_time');
      expect(match?.reaction.animation).toBe('happy');
      expect(match?.reaction.sound).toBe('coin');
      expect(match?.reaction.reason).toMatch(/bill_paid_on_time/);
    });

    it('fires for a credit card payment (category: loan_payment)', () => {
      const match = evaluate(
        tx({
          amount: '-200.00',
          type: 'ach',
          details: { category: 'loan_payment' },
        }),
        DEFAULT_GOALS,
      );
      expect(match?.name).toBe('bill_paid_on_time');
    });

    it('fires for a rent payment (category: rent)', () => {
      const match = evaluate(tx({ amount: '-1500.00', type: 'ach', details: { category: 'rent' } }), DEFAULT_GOALS);
      expect(match?.name).toBe('bill_paid_on_time');
    });

    it('does not fire for non-bill categories', () => {
      const match = evaluate(
        tx({
          amount: '-30.00',
          type: 'ach',
          details: { category: 'services', counterparty: { name: 'AT&T*BILL', type: 'organization' } },
        }),
        DEFAULT_GOALS,
      );
      expect(match).toBeNull();
    });

    it('does not fire for credit transactions', () => {
      const match = evaluate(tx({ amount: '89.99', details: { category: 'utilities' } }), DEFAULT_GOALS);
      expect(match).toBeNull();
    });
  });

  describe('large_purchase', () => {
    it('fires for a purchase > $200', () => {
      const match = evaluate(tx({ amount: '-349.99', type: 'card_payment' }), DEFAULT_GOALS);
      expect(match?.name).toBe('large_purchase');
      expect(match?.reaction.animation).toBe('concerned');
      expect(match?.reaction.reason).toMatch(/large_purchase/);
    });

    it('does not fire for a small purchase', () => {
      const match = evaluate(tx({ amount: '-50.00', type: 'card_payment' }), DEFAULT_GOALS);
      expect(match).toBeNull();
    });
  });
});
