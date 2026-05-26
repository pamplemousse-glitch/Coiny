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

  it('crypto_price_surge returns celebrate reaction', () => {
    const result = evaluateExternalEvent({ ...base, type: 'crypto_price_surge', symbol: 'SOL' });
    expect(result?.animation).toBe('celebrate');
    expect(result?.sound).toBe('fanfare');
    expect(result?.led).toBe('rainbow');
    expect(result?.duration).toBe(5000);
    expect(result?.reason).toContain('SOL');
    expect(result?.reason).toContain('surged');
  });

  it('crypto_price_surge falls back to "Crypto" when symbol is absent', () => {
    const result = evaluateExternalEvent({ ...base, type: 'crypto_price_surge' });
    expect(result?.reason).toContain('Crypto');
  });

  it('crypto_price_drop returns concerned reaction', () => {
    const result = evaluateExternalEvent({ ...base, type: 'crypto_price_drop', symbol: 'DOGE' });
    expect(result?.animation).toBe('concerned');
    expect(result?.sound).toBe('warning');
    expect(result?.led).toBe('amber');
    expect(result?.duration).toBe(3000);
    expect(result?.reason).toContain('DOGE');
    expect(result?.reason).toContain('dropped');
  });

  it('crypto_price_drop falls back to "Crypto" when symbol is absent', () => {
    const result = evaluateExternalEvent({ ...base, type: 'crypto_price_drop' });
    expect(result?.reason).toContain('Crypto');
  });

  it('debt_paydown returns celebrate reaction', () => {
    const result = evaluateExternalEvent({ ...base, type: 'debt_paydown', amountUsd: 200, source: 'spinwheel' });
    expect(result?.animation).toBe('celebrate');
    expect(result?.sound).toBe('chime');
    expect(result?.led).toBe('green');
    expect(result?.duration).toBe(4000);
    expect(result?.reason).toContain('200.00');
  });

  it('debt_missed_payment returns sad reaction', () => {
    const result = evaluateExternalEvent({ ...base, type: 'debt_missed_payment', amountUsd: 50, source: 'spinwheel' });
    expect(result?.animation).toBe('sad');
    expect(result?.sound).toBe('warning');
    expect(result?.led).toBe('red');
    expect(result?.duration).toBe(4000);
    expect(result?.reason).toContain('50.00');
  });

  it('new_liability returns concerned reaction', () => {
    const result = evaluateExternalEvent({ ...base, type: 'new_liability', amountUsd: 1000, source: 'spinwheel' });
    expect(result?.animation).toBe('concerned');
    expect(result?.sound).toBe('warning');
    expect(result?.led).toBe('amber');
    expect(result?.duration).toBe(3000);
    expect(result?.reason).toContain('1000.00');
  });

  it('crypto_sent returns null', () => {
    const result = evaluateExternalEvent({ ...base, type: 'crypto_sent' });
    expect(result).toBeNull();
  });

  it('net_worth_milestone returns celebrate reaction with milestone amount', () => {
    const result = evaluateExternalEvent({ ...base, type: 'net_worth_milestone', amountUsd: 50_000 });
    expect(result?.animation).toBe('celebrate');
    expect(result?.sound).toBe('fanfare');
    expect(result?.led).toBe('rainbow');
    expect(result?.reason).toContain('50000');
  });

  it('credit_score_improved returns celebrate reaction with point delta', () => {
    const result = evaluateExternalEvent({ ...base, type: 'credit_score_improved', amountUsd: 25 });
    expect(result?.animation).toBe('celebrate');
    expect(result?.sound).toBe('chime');
    expect(result?.reason).toContain('25 pts');
  });

  it('credit_score_dropped returns sad reaction with point delta', () => {
    const result = evaluateExternalEvent({ ...base, type: 'credit_score_dropped', amountUsd: 30 });
    expect(result?.animation).toBe('sad');
    expect(result?.led).toBe('red');
    expect(result?.reason).toContain('30 pts');
  });
});
