import { describe, it, expect } from 'vitest';
import { evaluate } from '../src/rules/engine.js';
import type { TellerTransaction } from '../src/teller/types.js';

function tx(overrides: Partial<TellerTransaction> = {}): TellerTransaction {
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
    it('fires for a credit >= $500', () => {
      const match = evaluate(tx({ amount: '2400.00', type: 'paycheck' }));
      expect(match?.name).toBe('paycheck_received');
      expect(match?.reaction.animation).toBe('celebrate');
      expect(match?.reaction.reason).toMatch(/paycheck_received/);
    });

    it('does not fire for a small credit', () => {
      const match = evaluate(tx({ amount: '50.00', type: 'paycheck' }));
      expect(match).toBeNull();
    });
  });

  describe('overspent_in_category', () => {
    it('fires for groceries spend over $150', () => {
      const match = evaluate(
        tx({
          amount: '-185.00',
          type: 'card_payment',
          details: { category: 'groceries', counterparty: { name: 'Whole Foods', type: 'organization' } },
        }),
      );
      expect(match?.name).toBe('overspent_in_category');
      expect(match?.reaction.animation).toBe('sad');
      expect(match?.reaction.reason).toMatch(/overspent_in_category/);
    });

    it('does not fire for small groceries spend', () => {
      const match = evaluate(
        tx({
          amount: '-30.00',
          type: 'card_payment',
          details: { category: 'groceries' },
        }),
      );
      expect(match).toBeNull();
    });

    it('does not fire for non-budget categories', () => {
      const match = evaluate(
        tx({
          amount: '-200.00',
          type: 'card_payment',
          details: { category: 'electronics' },
        }),
      );
      expect(match).toBeNull();
    });
  });

  describe('savings_milestone', () => {
    it('fires when crossing 25% of the $1000 goal', () => {
      // balance goes from 200 → 260, crosses 250 (25%)
      const match = evaluate(
        tx({
          amount: '60.00',
          type: 'transfer',
          running_balance: '260.00',
          details: { category: 'transfer' },
        }),
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
      );
      expect(match).toBeNull();
    });

    it('does not fire when running_balance is null', () => {
      const match = evaluate(
        tx({ amount: '60.00', type: 'transfer', running_balance: null }),
      );
      expect(match).toBeNull();
    });

    it('fires celebrate animation at 100% milestone', () => {
      // balance goes from 999 → 1000, crosses 100%
      const match = evaluate(
        tx({
          amount: '1.00',
          type: 'transfer',
          running_balance: '1000.00',
          details: { category: 'transfer' },
        }),
      );
      expect(match?.name).toBe('savings_milestone');
      expect(match?.reaction.animation).toBe('celebrate');
    });
  });

  describe('bill_paid_on_time', () => {
    it('fires for a known biller', () => {
      const match = evaluate(
        tx({
          amount: '-89.99',
          type: 'ach',
          details: { category: 'utilities', counterparty: { name: 'internet provider', type: 'organization' } },
        }),
      );
      expect(match?.name).toBe('bill_paid_on_time');
      expect(match?.reaction.animation).toBe('happy');
      expect(match?.reaction.sound).toBe('coin');
      expect(match?.reaction.reason).toMatch(/bill_paid_on_time/);
    });

    it('does not fire for an unknown payee', () => {
      const match = evaluate(
        tx({
          amount: '-30.00',
          type: 'ach',
          details: { category: 'services', counterparty: { name: 'random vendor', type: 'organization' } },
        }),
      );
      expect(match).toBeNull();
    });
  });

  describe('large_purchase', () => {
    it('fires for a purchase > $200', () => {
      const match = evaluate(tx({ amount: '-349.99', type: 'card_payment' }));
      expect(match?.name).toBe('large_purchase');
      expect(match?.reaction.animation).toBe('concerned');
      expect(match?.reaction.reason).toMatch(/large_purchase/);
    });

    it('does not fire for a small purchase', () => {
      const match = evaluate(tx({ amount: '-50.00', type: 'card_payment' }));
      expect(match).toBeNull();
    });
  });
});
