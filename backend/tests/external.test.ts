import { describe, expect, it } from 'vitest';
import { evaluateExternalEvent } from '../src/reactions/external.js';

describe('evaluateExternalEvent', () => {
  const base = { id: 'evt-1', userId: 'user-1', source: 'coinbase' as const };

  it('crypto_received returns happy reaction with symbol and amount', () => {
    const result = evaluateExternalEvent({ ...base, type: 'crypto_received', symbol: 'BTC', amountUsd: 500 });
    expect(result).not.toBeNull();
    expect(result?.animation).toBe('happy');
    expect(result?.sound).toBe('chime');
    expect(result?.led).toBe('green');
    expect(result?.duration).toBe(3000);
    expect(result?.reason).toContain('BTC');
    expect(result?.reason).toContain('500.00');
  });

  it('crypto_received omits symbol/amount when absent', () => {
    const result = evaluateExternalEvent({ ...base, type: 'crypto_received' });
    expect(result?.reason).toBe('Crypto received:');
  });

  it('wallet_receive returns happy reaction', () => {
    const result = evaluateExternalEvent({ ...base, type: 'wallet_receive', source: 'zerion' });
    expect(result?.animation).toBe('happy');
    expect(result?.sound).toBe('chime');
    expect(result?.led).toBe('green');
    expect(result?.reason).toContain('Wallet received');
  });

  it('wallet_receive includes symbol and amount when provided', () => {
    const result = evaluateExternalEvent({
      ...base,
      type: 'wallet_receive',
      symbol: 'ETH',
      amountUsd: 200,
      source: 'zerion',
    });
    expect(result?.reason).toContain('ETH');
    expect(result?.reason).toContain('200.00');
  });

  it('defi_yield returns happy reaction with coin sound', () => {
    const result = evaluateExternalEvent({ ...base, type: 'defi_yield', symbol: 'ETH', amountUsd: 10 });
    expect(result?.animation).toBe('happy');
    expect(result?.sound).toBe('coin');
    expect(result?.reason).toContain('DeFi yield');
    expect(result?.reason).toContain('ETH');
    expect(result?.reason).toContain('10.00');
  });

  // Market-movement events were deliberately removed: the pet must react to
  // what the user controls, never to price action. These assertions lock that
  // in, so re-adding the events fails the build rather than shipping quietly.
  it('does not accept market price-movement event types', () => {
    // @ts-expect-error crypto_price_surge is intentionally not a valid event type
    expect(evaluateExternalEvent({ ...base, type: 'crypto_price_surge', symbol: 'SOL' })).toBeNull();
    // @ts-expect-error crypto_price_drop is intentionally not a valid event type
    expect(evaluateExternalEvent({ ...base, type: 'crypto_price_drop', symbol: 'DOGE' })).toBeNull();
  });

  // R-7.24: a payment toward debt is happy and routine (the extra_debt_payment
  // treatment). Celebration is reserved for debt_cleared, which has no honest
  // producer until the R-7.13 debt_accounts merge.
  it('debt_paydown returns happy reaction', () => {
    const result = evaluateExternalEvent({ ...base, type: 'debt_paydown', amountUsd: 200, source: 'spinwheel' });
    expect(result?.animation).toBe('happy');
    expect(result?.sound).toBe('chime');
    expect(result?.led).toBe('green');
    expect(result?.duration).toBe(3000);
    expect(result?.reason).toContain('200.00');
  });

  // R-7.24/R-7.20: concerned and amber, never sad and red. Distress is
  // reserved for sustained multi-week vitality failure, not a single event.
  it('debt_missed_payment returns concerned reaction', () => {
    const result = evaluateExternalEvent({ ...base, type: 'debt_missed_payment', amountUsd: 50, source: 'spinwheel' });
    expect(result?.animation).toBe('concerned');
    expect(result?.sound).toBe('warning');
    expect(result?.led).toBe('amber');
    expect(result?.duration).toBe(3000);
    expect(result?.reason).toContain('50.00');
  });

  it('new_liability is acknowledged, not judged', () => {
    const result = evaluateExternalEvent({ ...base, type: 'new_liability', amountUsd: 1000, source: 'spinwheel' });
    expect(result?.animation).toBe('neutral');
    expect(result?.reason).toContain('1000.00');
  });

  it('crypto_sent returns null', () => {
    const result = evaluateExternalEvent({ ...base, type: 'crypto_sent' });
    expect(result).toBeNull();
  });

  // These three are not things the user did, so they must not move the creature.
  // net worth crosses a threshold on market movement; a credit score moves on
  // inquiries ageing off or an issuer changing a limit. Celebrating or sulking at
  // either punishes or rewards the user for something outside their control.
  it('does not react to events the user did not cause', () => {
    expect(evaluateExternalEvent({ ...base, type: 'net_worth_milestone', amountUsd: 50_000 })).toBeNull();
    expect(evaluateExternalEvent({ ...base, type: 'credit_score_improved', amountUsd: 25 })).toBeNull();
    expect(evaluateExternalEvent({ ...base, type: 'credit_score_dropped', amountUsd: 30 })).toBeNull();
  });

  // R-7.23: opening a card or taking a mortgage is a decision, not a moral
  // failure, and a "new" liability is often the bureau reporting an account that
  // already existed. Neutral is outside the push allowlist, so it never interrupts.
  it('acknowledges a new liability without concern or sound', () => {
    const result = evaluateExternalEvent({ ...base, type: 'new_liability', amountUsd: 4000 });
    expect(result?.animation).toBe('neutral');
    expect(result?.sound).toBe('off');
    expect(result?.led).toBe('off');
  });

  it('still reacts to events the user did cause', () => {
    expect(evaluateExternalEvent({ ...base, type: 'debt_paydown', amountUsd: 500 })?.animation).toBe('happy');
    expect(evaluateExternalEvent({ ...base, type: 'crypto_received', amountUsd: 100 })?.animation).toBe('happy');
  });
});
