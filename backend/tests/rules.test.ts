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
      const reaction = evaluate(tx({ amount: '2400.00', type: 'paycheck' }));
      expect(reaction?.animation).toBe('celebrate');
      expect(reaction?.reason).toMatch(/paycheck_received/);
    });

    it('does not fire for a small credit', () => {
      const reaction = evaluate(tx({ amount: '50.00', type: 'paycheck' }));
      expect(reaction?.animation).not.toBe('celebrate');
    });
  });

  describe('overspent_in_category', () => {
    it('fires for groceries spend over $150', () => {
      const reaction = evaluate(
        tx({
          amount: '-185.00',
          type: 'card_payment',
          details: { category: 'groceries', counterparty: { name: 'Whole Foods', type: 'organization' } },
        }),
      );
      expect(reaction?.animation).toBe('sad');
      expect(reaction?.reason).toMatch(/overspent_in_category/);
    });

    it('does not fire for small groceries spend', () => {
      const reaction = evaluate(
        tx({
          amount: '-30.00',
          type: 'card_payment',
          details: { category: 'groceries' },
        }),
      );
      expect(reaction?.animation).not.toBe('sad');
    });

    it('does not fire for non-budget categories', () => {
      const reaction = evaluate(
        tx({
          amount: '-200.00',
          type: 'card_payment',
          details: { category: 'electronics' },
        }),
      );
      // $200.00 is not > threshold, and electronics is not a budget category → no rule fires
      expect(reaction).toBeNull();
    });
  });

  describe('savings_milestone', () => {
    it('fires when crossing 25% of the $1000 goal', () => {
      // balance goes from 200 → 260, crosses 250 (25%)
      const reaction = evaluate(
        tx({
          amount: '60.00',
          type: 'transfer',
          running_balance: '260.00',
          details: { category: 'transfer' },
        }),
      );
      expect(reaction?.animation).toBe('happy');
      expect(reaction?.reason).toMatch(/savings_milestone/);
    });

    it('does not fire when no milestone is crossed', () => {
      const reaction = evaluate(
        tx({
          amount: '10.00',
          type: 'transfer',
          running_balance: '100.00',
          details: { category: 'transfer' },
        }),
      );
      // balance stays at 10% of goal — no 25/50/100% milestone crossed
      expect(reaction).toBeNull();
    });
  });

  describe('bill_paid_on_time', () => {
    it('fires for a known biller', () => {
      const reaction = evaluate(
        tx({
          amount: '-89.99',
          type: 'ach',
          details: { category: 'utilities', counterparty: { name: 'internet provider', type: 'organization' } },
        }),
      );
      expect(reaction?.animation).toBe('happy');
      expect(reaction?.sound).toBe('coin');
      expect(reaction?.reason).toMatch(/bill_paid_on_time/);
    });

    it('does not fire for an unknown payee', () => {
      const reaction = evaluate(
        tx({
          amount: '-30.00',
          type: 'ach',
          details: { category: 'services', counterparty: { name: 'random vendor', type: 'organization' } },
        }),
      );
      // No known biller match, amount not over threshold → no rule fires
      expect(reaction).toBeNull();
    });
  });

  describe('large_purchase', () => {
    it('fires for a purchase > $200', () => {
      const reaction = evaluate(tx({ amount: '-349.99', type: 'card_payment' }));
      expect(reaction?.animation).toBe('concerned');
      expect(reaction?.reason).toMatch(/large_purchase/);
    });

    it('does not fire for a small purchase', () => {
      const reaction = evaluate(tx({ amount: '-50.00', type: 'card_payment' }));
      expect(reaction).toBeNull();
    });
  });
});
