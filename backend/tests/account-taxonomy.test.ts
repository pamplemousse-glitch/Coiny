import { describe, expect, it } from 'vitest';
import { classifyAccount, countsAsLiquidCash, subtypeLabel } from '../src/networth/account-taxonomy.js';

// The subtype vocabulary is Plaid's own, transcribed from the vendored contract
// at docs/context/plaid.md:986. These tests are written against the values that
// actually appear there rather than against invented ones.

describe('classifyAccount: retirement wrappers', () => {
  // The point of the whole change. Every one of these arrives from Plaid today
  // and used to be indistinguishable from a checking account at the response.
  it.each([
    ['401k', 'US'],
    ['403B', 'US'],
    ['roth', 'US'],
    ['roth 401k', 'US'],
    ['sep ira', 'US'],
    ['thrift savings plan', 'US'],
    ['sipp', 'UK'],
    ['rrsp', 'Canada'],
    ['rrif', 'Canada'],
    ['lira', 'Canada'],
    ['pension', 'global'],
  ])('classifies %s (%s) as retirement, tax-advantaged and illiquid', (subtype) => {
    const result = classifyAccount('investment', subtype);
    expect(result.category).toBe('retirement');
    expect(result.taxAdvantaged).toBe(true);
    expect(result.liquid).toBe(false);
  });
});

describe('classifyAccount: the other tax-advantaged wrappers', () => {
  it('puts a 529 in education', () => {
    expect(classifyAccount('investment', '529').category).toBe('education');
  });

  it('puts an RESP in education, not retirement', () => {
    expect(classifyAccount('investment', 'resp').category).toBe('education');
  });

  // An HSA is `depository` at Plaid, so without the subtype check it falls into
  // the cash branch and is counted as spendable.
  it('puts an HSA in health even though Plaid types it as depository', () => {
    const result = classifyAccount('depository', 'hsa');
    expect(result.category).toBe('health');
    expect(result.liquid).toBe(false);
  });

  it('treats life insurance and annuities as insurance, not investment', () => {
    expect(classifyAccount('investment', 'life insurance').category).toBe('insurance');
    expect(classifyAccount('investment', 'variable annuity').category).toBe('insurance');
  });
});

describe('classifyAccount: tax-advantaged but liquid', () => {
  // Grouping these with retirement because they share a tax treatment would
  // understate real emergency savings for every Canadian and British user.
  it('treats a TFSA as tax-advantaged and still spendable', () => {
    const result = classifyAccount('depository', 'tfsa');
    expect(result.taxAdvantaged).toBe(true);
    expect(result.liquid).toBe(true);
  });

  it('treats a Cash ISA as spendable cash', () => {
    const result = classifyAccount('depository', 'cash isa');
    expect(result.category).toBe('cash');
    expect(result.liquid).toBe(true);
  });

  // Plaid separates the cash ISA from the stocks-and-shares one by type, not
  // by subtype, so the same subtype has to land in two different categories.
  it('treats a stocks-and-shares ISA as an investment rather than cash', () => {
    const result = classifyAccount('investment', 'isa');
    expect(result.category).toBe('investment');
    expect(result.liquid).toBe(false);
  });
});

describe('countsAsLiquidCash', () => {
  // This is the assertion with teeth: the figure feeds the ladder's
  // emergency-fund rungs via liquidCash.
  it.each(['checking', 'savings', 'money market', 'prepaid', 'paypal', 'cash management'])(
    'counts %s as spendable',
    (subtype) => {
      expect(countsAsLiquidCash('depository', subtype)).toBe(true);
    },
  );

  it.each([
    ['cd', 'locked until maturity'],
    ['gic', 'the Canadian equivalent lock'],
    ['hsa', 'penalised outside qualifying medical spending'],
    ['ebt', 'a restricted government benefit balance'],
  ])('does not count %s as spendable (%s)', (subtype) => {
    expect(countsAsLiquidCash('depository', subtype)).toBe(false);
  });

  it('counts an unclassified depository account as spendable', () => {
    // Null subtype is the common case for non-Plaid providers. Refusing to
    // count them would silently zero a user's cash.
    expect(countsAsLiquidCash('depository', null)).toBe(true);
  });

  it('counts an unrecognised depository subtype as spendable', () => {
    // Plaid adds subtypes over time. A new savings-like product must not
    // vanish from the emergency fund the day it is introduced.
    expect(countsAsLiquidCash('depository', 'some-future-subtype')).toBe(true);
  });

  it('never counts a credit or loan balance as cash', () => {
    expect(countsAsLiquidCash('credit', 'credit card')).toBe(false);
    expect(countsAsLiquidCash('loan', 'student')).toBe(false);
  });
});

describe('classifyAccount: coarse types without a subtype', () => {
  it('maps credit and loan to their own categories', () => {
    expect(classifyAccount('credit', null).category).toBe('credit');
    expect(classifyAccount('loan', null).category).toBe('loan');
  });

  it('maps brokerage to investment', () => {
    expect(classifyAccount('brokerage', null).category).toBe('investment');
  });

  it('falls through to other for a type it does not know', () => {
    expect(classifyAccount('other', null).category).toBe('other');
  });
});

describe('subtypeLabel', () => {
  it('expands the abbreviations a user would not read aloud', () => {
    expect(subtypeLabel('investment', '401k')).toBe('401(k)');
    expect(subtypeLabel('investment', 'roth')).toBe('Roth IRA');
    expect(subtypeLabel('depository', 'hsa')).toBe('Health Savings Account');
    expect(subtypeLabel('depository', 'cd')).toBe('Certificate of Deposit');
  });

  it('title-cases a subtype it has no special label for', () => {
    expect(subtypeLabel('depository', 'checking')).toBe('Checking');
  });

  it('falls back to the type when there is no subtype', () => {
    expect(subtypeLabel('depository', null)).toBe('Depository');
  });

  // A label is user-facing. An unrecognised value must still read as a name
  // rather than as a raw database token.
  it('produces something readable for a subtype it has never seen', () => {
    expect(subtypeLabel('depository', 'green savings bond')).toBe('Green Savings Bond');
  });
});
