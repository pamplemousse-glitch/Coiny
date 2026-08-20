import { beforeEach, describe, expect, it } from 'vitest';
import type { PlaidHolding, PlaidSecurity } from '../src/plaid/types.js';

// summariseHoldings is a pure function over one /investments/holdings/get
// response, so it is tested directly rather than through the whole refresh
// path. Both callers share it, which is the point of the extraction.
let summariseHoldings: typeof import('../src/goals/snapshot.js').summariseHoldings;

beforeEach(async () => {
  ({ summariseHoldings } = await import('../src/goals/snapshot.js'));
});

function holding(over: Partial<PlaidHolding> = {}): PlaidHolding {
  return {
    account_id: 'acct-1',
    security_id: 'sec-1',
    institution_price: 100,
    institution_value: 1000,
    quantity: 10,
    cost_basis: null,
    ...over,
  };
}

function security(over: Partial<PlaidSecurity> = {}): PlaidSecurity {
  return { security_id: 'sec-1', name: 'Acme Inc', ticker_symbol: 'ACME', type: 'equity', ...over };
}

describe('vesting', () => {
  // The defect. institution_value is the WHOLE grant, vested and unvested
  // together. Leave before the cliff and the unvested part never becomes
  // yours, so counting it inflates net worth in the flattering direction.
  it('counts only the vested portion of an equity grant', () => {
    const result = summariseHoldings(
      [holding({ institution_value: 180_000, vested_value: 60_000, vested_quantity: 600 })],
      [security()],
    );

    expect(result.total).toBe(60_000);
    expect(result.unvestedTotal).toBe(120_000);
    expect(result.holdings[0]).toMatchObject({ value: 60_000, unvestedValue: 120_000 });
  });

  // Ordinary shares carry no vested_value. A share you bought is entirely
  // yours, so the market value stands.
  it('counts the full market value when Plaid reports no vesting', () => {
    const result = summariseHoldings([holding({ institution_value: 5000 })], [security()]);

    expect(result.total).toBe(5000);
    expect(result.unvestedTotal).toBe(0);
    expect(result.holdings[0]?.unvestedValue).toBe(0);
  });

  // The one that a falsy check would get wrong: vested_value 0 is a real
  // answer meaning "none of this is yours yet", not a missing field.
  it('counts nothing for a grant that has not begun vesting', () => {
    const result = summariseHoldings(
      [holding({ institution_value: 90_000, vested_value: 0, vested_quantity: 0 })],
      [security()],
    );

    expect(result.total).toBe(0);
    expect(result.unvestedTotal).toBe(90_000);
  });

  it('never reports negative unvested value if the vendor over-reports vesting', () => {
    const result = summariseHoldings([holding({ institution_value: 1000, vested_value: 1500 })], [security()]);

    expect(result.unvestedTotal).toBe(0);
  });
});

describe('cash equivalents', () => {
  // The mirror of #274. That PR stopped a five-year CD counting as emergency
  // cash via depository ACCOUNT subtypes. A money market fund held as a
  // SECURITY never reaches that code.
  it('totals cash-equivalent securities separately from the rest', () => {
    const result = summariseHoldings(
      [
        holding({ security_id: 'sec-mmf', institution_value: 20_000 }),
        holding({ security_id: 'sec-etf', institution_value: 30_000 }),
      ],
      [
        security({
          security_id: 'sec-mmf',
          name: 'Vanguard Federal MMF',
          type: 'mutual fund',
          subtype: 'money market',
          is_cash_equivalent: true,
        }),
        security({ security_id: 'sec-etf', name: 'Total Market ETF', type: 'etf', subtype: 'etf' }),
      ],
    );

    // Still inside the investments total; whether it should move to the
    // ladder's liquid cash is a product decision, not a parsing one.
    expect(result.total).toBe(50_000);
    expect(result.cashEquivalentTotal).toBe(20_000);
  });

  it('carries the security subtype and cash-equivalent flag per holding', () => {
    const result = summariseHoldings(
      [holding({ security_id: 'sec-mmf' })],
      [security({ security_id: 'sec-mmf', subtype: 'money market', is_cash_equivalent: true })],
    );

    expect(result.holdings[0]).toMatchObject({ securitySubtype: 'money market', isCashEquivalent: true });
  });

  it('counts only the vested portion of a cash-equivalent holding', () => {
    const result = summariseHoldings(
      [holding({ institution_value: 1000, vested_value: 400 })],
      [security({ is_cash_equivalent: true })],
    );

    expect(result.cashEquivalentTotal).toBe(400);
  });
});
