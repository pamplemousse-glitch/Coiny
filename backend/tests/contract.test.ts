import { describe, expect, it } from 'vitest';
import {
  contractFor,
  DAILY_REACTION_BUDGET,
  OVERSPEND_COOLDOWN_DAYS,
  orderCandidates,
  PUSHABLE_EVENTS,
  REACTION_CONTRACT,
  reactionForEvent,
} from '../src/reactions/contract.js';

describe('reaction contract', () => {
  describe('controllability classes (section 7.6, principle 1)', () => {
    // The governing rule of the product: the pet reacts to what the user
    // controls, never to the market. Exogenous events must never be direct.
    it('classifies every market and score event as exogenous', () => {
      for (const name of ['net_worth_milestone', 'credit_score_improved', 'credit_score_dropped', 'asset_revalued']) {
        expect(contractFor(name).class).toBe('exogenous');
      }
    });

    it('classifies concentration, runway, cash drag and utilization as structural', () => {
      for (const name of ['concentration_high', 'runway_low', 'cash_drag_high', 'utilization_high_pre_close']) {
        expect(contractFor(name).class).toBe('structural');
      }
    });

    it('gives every exogenous event push never and zero health movement', () => {
      for (const [, entry] of Object.entries(REACTION_CONTRACT)) {
        if (entry.class !== 'exogenous') continue;
        expect(entry.push).toBe('never');
        expect(entry.healthDelta).toBe(0);
      }
    });
  });

  describe('push policy (R-9.5)', () => {
    // The never-list, verbatim from section 9: any exogenous event, a missed
    // goal period, a broken streak, a net worth decrease, a credit score
    // change, a rising debt balance, a single overspend, or "come back".
    it('marks every never-list event push never', () => {
      const neverList = [
        'net_worth_milestone',
        'credit_score_improved',
        'credit_score_dropped',
        'asset_revalued',
        'goal_period_missed',
        'streak_broken',
        'overspend_vs_plan',
        'new_liability',
      ];
      for (const name of neverList) {
        expect(contractFor(name).push).toBe('never');
      }
    });

    // The always-list: rung completion, debt cleared, goal achieved, bill
    // overdue (once), pay-before-close. Plus the sandbox-only debug event,
    // which exists so TestFlight demos can exercise the full APNs path.
    it('pins the pushable event set exactly', () => {
      expect([...PUSHABLE_EVENTS].sort()).toEqual([
        'bill_overdue',
        'debt_cleared',
        'debt_missed_payment',
        'debug',
        'goal_achieved',
        'ladder_rung_completed',
        'utilization_high_pre_close',
      ]);
    });

    // A reaction and a push are different things: the creature responds in-app
    // to plenty that must never buzz a phone.
    it('keeps every routine positive out of the pushable set', () => {
      for (const name of ['paycheck_received', 'contribution_made', 'bill_paid_on_time', 'connection_added']) {
        expect(PUSHABLE_EVENTS.has(name)).toBe(false);
      }
    });

    it('marks the digest-only events digest, not always', () => {
      for (const name of ['goal_period_passed', 'subscription_detected']) {
        expect(contractFor(name).push).toBe('digest');
      }
    });
  });

  describe('precedence (R-7.25)', () => {
    it('ranks celebration above attention above routine above questions above negatives', () => {
      const names = [
        'overspend_vs_plan',
        'large_purchase',
        'bill_paid_on_time',
        'paycheck_received',
        'bill_overdue',
        'goal_achieved',
        'ladder_rung_completed',
      ];
      const ordered = orderCandidates(names.map((name) => ({ name })));
      expect(ordered.map((c) => c.name)).toEqual([
        'ladder_rung_completed',
        'goal_achieved',
        'bill_overdue',
        'paycheck_received',
        'bill_paid_on_time',
        'large_purchase',
        'overspend_vs_plan',
      ]);
    });

    it('keeps producer order for equal-priority candidates', () => {
      const ordered = orderCandidates([
        { name: 'ladder_rung_completed', tag: 'rung5' },
        { name: 'ladder_rung_completed', tag: 'rung3' },
      ]);
      expect(ordered.map((c) => (c as { tag: string }).tag)).toEqual(['rung5', 'rung3']);
    });

    it('sorts an unknown event name after every known direct event', () => {
      const ordered = orderCandidates([{ name: 'some_future_event' }, { name: 'overspend_vs_plan' }]);
      expect(ordered[0]?.name).toBe('overspend_vs_plan');
    });
  });

  describe('unknown events', () => {
    it('defaults an unknown name to direct, no push, no health movement', () => {
      const entry = contractFor('not_a_real_event');
      expect(entry.class).toBe('direct');
      expect(entry.push).toBe('no');
      expect(entry.healthDelta).toBe(0);
      expect(entry.budgetExempt).toBe(false);
    });
  });

  describe('health deltas (R-7.24 stage/vitality column)', () => {
    it('gives large_purchase no health movement at all', () => {
      expect(contractFor('large_purchase').healthDelta).toBe(0);
    });

    it('gives streak_broken no health movement (R-7.12: the reset is everything)', () => {
      expect(contractFor('streak_broken').healthDelta).toBe(0);
    });

    it('rewards the celebration tier hardest', () => {
      for (const name of ['ladder_rung_completed', 'debt_cleared', 'goal_achieved']) {
        expect(contractFor(name).healthDelta).toBe(15);
      }
    });
  });

  describe('budget constants (R-7.25)', () => {
    // Register: budget 5/day chosen to cover a payday (paycheck plus several
    // bills) without muting the afternoon; overspend cap is R-7.24 verbatim.
    it('pins the per-day budget at 5', () => {
      expect(DAILY_REACTION_BUDGET).toBe(5);
    });

    it('pins the overspend cooldown at 7 days', () => {
      expect(OVERSPEND_COOLDOWN_DAYS).toBe(7);
    });

    it('exempts only celebrations, the actionable warnings and debug from the budget', () => {
      const exempt = Object.entries(REACTION_CONTRACT)
        .filter(([, entry]) => entry.budgetExempt)
        .map(([name]) => name)
        .sort();
      expect(exempt).toEqual([
        'bill_overdue',
        'debt_cleared',
        'debt_missed_payment',
        'debug',
        'goal_achieved',
        'ladder_rung_completed',
        'utilization_high_pre_close',
      ]);
    });
  });

  describe('reactionForEvent', () => {
    it('builds the celebrate transform for a completed rung', () => {
      const reaction = reactionForEvent('ladder_rung_completed', 'ladder_rung_completed (rung 3)');
      expect(reaction.animation).toBe('celebrate');
      expect(reaction.sound).toBe('fanfare');
      expect(reaction.reason).toBe('ladder_rung_completed (rung 3)');
    });

    it('builds a silent neutral for goal_period_missed', () => {
      const reaction = reactionForEvent('goal_period_missed');
      expect(reaction.animation).toBe('neutral');
      expect(reaction.sound).toBe('off');
      expect(reaction.led).toBe('off');
    });

    it('builds curious for subscription_detected', () => {
      expect(reactionForEvent('subscription_detected').animation).toBe('curious');
    });

    it('falls back to silent neutral for an event with no preset', () => {
      const reaction = reactionForEvent('net_worth_milestone');
      expect(reaction.animation).toBe('neutral');
      expect(reaction.sound).toBe('off');
    });
  });
});
