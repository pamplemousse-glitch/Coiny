/**
 * What kind of account is this, really.
 *
 * Plaid returns a coarse `type` (depository, credit, loan, investment,
 * brokerage, other) and a precise `subtype` from a fixed vocabulary of ~75
 * values. We stored the subtype from the beginning and then used it for exactly
 * one thing, classifying debts. Everywhere else it was dropped at the response
 * boundary, so a 401(k), a Cash ISA, an HSA and a checking account all arrived
 * at the app as the same undifferentiated "depository" or "investment".
 *
 * Two consequences, and the second is a correctness bug rather than a missing
 * feature:
 *
 *  1. The app cannot name what it is showing. "Your ISA" and "your Roth IRA"
 *     are the words a user thinks in; "depository" is not.
 *
 *  2. `liquidDeposits` counted EVERY depository balance as spendable cash, and
 *     that figure feeds `liquidCash`, which the ladder uses for the
 *     emergency-fund rungs (goals/ladder.ts). Plaid's depository subtypes
 *     include `cd`, `hsa`, `ebt` and `gic`. So money locked in a five-year
 *     certificate of deposit, or restricted to medical spending, was being
 *     reported to the user as their emergency fund, and the creature reacted to
 *     a number that was not true.
 *
 * The subtype vocabulary below is transcribed from Plaid's own account-type
 * schema as vendored at `docs/context/plaid.md:986`, not from memory. Plaid may
 * add values; anything unrecognised falls through to a conservative default
 * rather than being guessed at.
 */

/** The coarse bucket a user thinks in, derived from type + subtype. */
export type AccountCategory =
  | 'cash'
  | 'retirement'
  | 'education'
  | 'health'
  | 'investment'
  | 'insurance'
  | 'credit'
  | 'loan'
  | 'other';

export type AccountClassification = {
  category: AccountCategory;
  /** Human-readable name for the wrapper, e.g. "Roth IRA", "Cash ISA". */
  label: string;
  /** Held inside a tax-advantaged wrapper. Display only; we give no tax advice. */
  taxAdvantaged: boolean;
  /**
   * Spendable today without a penalty, a maturity date or a qualifying expense.
   *
   * This is the flag with teeth: it decides what counts toward the
   * emergency-fund rungs. Deliberately conservative. Calling something liquid
   * that is not overstates a user's safety margin, which is the more damaging
   * of the two errors.
   */
  liquid: boolean;
};

/**
 * Depository subtypes that are NOT spendable cash.
 *
 * - `cd`: locked until maturity; early withdrawal forfeits interest.
 * - `gic`: the Canadian equivalent, same lock.
 * - `hsa`: withdrawals for anything but qualifying medical expenses are taxed
 *   and penalised, so it is not an emergency fund in any useful sense.
 * - `ebt`: a government benefit balance, restricted by law in what it can buy
 *   and not the user's money to redeploy.
 *
 * Everything else depository (checking, savings, money market, prepaid, paypal,
 * cash management, payroll, cash isa) is treated as spendable.
 */
const ILLIQUID_DEPOSITORY = new Set(['cd', 'gic', 'hsa', 'ebt']);

/** Retirement wrappers across every market Plaid reports. Locked by design. */
const RETIREMENT = new Set([
  '401a',
  '401k',
  '403B',
  '457b',
  'ira',
  'roth',
  'roth 401k',
  'roth 403B',
  'roth 457b',
  'roth pension',
  'roth profit sharing plan',
  'roth thrift savings plan',
  'sep ira',
  'simple ira',
  'sarsep',
  'keogh',
  'pension',
  'profit sharing plan',
  'qshr',
  'retirement',
  'thrift savings plan',
  'sipp',
  'rrsp',
  'rrif',
  'prif',
  'lif',
  'lira',
  'lrif',
  'lrsp',
  'rlif',
]);

const EDUCATION = new Set(['529', 'education savings account', 'resp']);
const HEALTH = new Set(['hsa', 'health reimbursement arrangement']);
const INSURANCE = new Set(['life insurance', 'other insurance', 'fixed annuity', 'variable annuity', 'other annuity']);

/**
 * Tax-advantaged wrappers that are nonetheless liquid.
 *
 * A Canadian TFSA and a UK Cash ISA are withdrawable at will; the tax benefit
 * is on the growth, not a lock on the principal. Grouping them with retirement
 * accounts because they share a tax treatment would understate real emergency
 * savings for every Canadian and British user.
 */
const LIQUID_TAX_ADVANTAGED = new Set(['tfsa', 'cash isa', 'isa']);

/** Display names for the subtypes whose raw value is an abbreviation or is
 *  simply not a phrase anyone says out loud. Anything absent is title-cased. */
const LABELS: Record<string, string> = {
  '401a': '401(a)',
  '401k': '401(k)',
  '403B': '403(b)',
  '457b': '457(b)',
  '529': '529 Plan',
  cd: 'Certificate of Deposit',
  ebt: 'EBT',
  fhsa: 'First Home Savings Account',
  gic: 'Guaranteed Investment Certificate',
  hsa: 'Health Savings Account',
  'health reimbursement arrangement': 'Health Reimbursement Arrangement',
  ira: 'IRA',
  isa: 'ISA',
  'cash isa': 'Cash ISA',
  lif: 'Life Income Fund',
  lira: 'Locked-In Retirement Account',
  lrif: 'Locked-In Retirement Income Fund',
  lrsp: 'Locked-In Retirement Savings Plan',
  prif: 'Prescribed Retirement Income Fund',
  qshr: 'Qualified Shared Responsibility',
  rdsp: 'Registered Disability Savings Plan',
  resp: 'RESP',
  rlif: 'Restricted Life Income Fund',
  roth: 'Roth IRA',
  'roth 401k': 'Roth 401(k)',
  'roth 403B': 'Roth 403(b)',
  'roth 457b': 'Roth 457(b)',
  rrif: 'RRIF',
  rrsp: 'RRSP',
  'sep ira': 'SEP IRA',
  'simple ira': 'SIMPLE IRA',
  sarsep: 'SARSEP',
  sipp: 'SIPP',
  tfsa: 'TFSA',
  'thrift savings plan': 'Thrift Savings Plan',
  'roth thrift savings plan': 'Roth Thrift Savings Plan',
  ugma: 'UGMA',
  utma: 'UTMA',
  'money market': 'Money Market',
  'cash management': 'Cash Management',
  'limited purpose checking': 'Limited Purpose Checking',
  'non-taxable brokerage account': 'Non-Taxable Brokerage',
  'non-custodial wallet': 'Non-Custodial Wallet',
  'crypto exchange': 'Crypto Exchange',
  'prediction market': 'Prediction Market',
  'line of credit': 'Line of Credit',
  'home equity': 'Home Equity',
  'stock plan': 'Stock Plan',
  'credit card': 'Credit Card',
};

function titleCase(value: string): string {
  return value
    .split(' ')
    .map((word) => (word.length === 0 ? word : word[0]!.toUpperCase() + word.slice(1)))
    .join(' ');
}

/**
 * Every lookup below is case-folded.
 *
 * Plaid's own vocabulary is not internally consistent: it writes `401k` and
 * `457b` in lower case but `403B` and `roth 403B` with a capital B. Comparing a
 * lower-cased incoming subtype against the literal strings silently failed to
 * match 403(b) accounts, which is precisely the class of bug this module exists
 * to remove. Folding both sides makes the inconsistency irrelevant.
 */
function folded(values: Iterable<string>): Set<string> {
  return new Set([...values].map((v) => v.toLowerCase()));
}

const RETIREMENT_F = folded(RETIREMENT);
const EDUCATION_F = folded(EDUCATION);
const HEALTH_F = folded(HEALTH);
const INSURANCE_F = folded(INSURANCE);
const LIQUID_TAX_ADVANTAGED_F = folded(LIQUID_TAX_ADVANTAGED);
const ILLIQUID_DEPOSITORY_F = folded(ILLIQUID_DEPOSITORY);
const LABELS_F = new Map(Object.entries(LABELS).map(([k, v]) => [k.toLowerCase(), v]));

/** The label we show for a subtype, falling back to a title-cased version of
 *  whatever Plaid sent so an unrecognised value still reads as a name rather
 *  than as a database token. */
export function subtypeLabel(type: string, subtype: string | null): string {
  if (subtype === null || subtype === '') return titleCase(type);
  return LABELS_F.get(subtype.toLowerCase()) ?? titleCase(subtype);
}

/**
 * Classify one account.
 *
 * `subtype` is null for accounts Plaid could not classify and for every
 * non-Plaid provider, so the type-only path has to produce something sane.
 */
export function classifyAccount(type: string, subtype: string | null): AccountClassification {
  const t = type.toLowerCase();
  const s = subtype?.toLowerCase() ?? null;
  const label = subtypeLabel(type, subtype);

  if (s !== null) {
    if (RETIREMENT_F.has(s)) return { category: 'retirement', label, taxAdvantaged: true, liquid: false };
    if (EDUCATION_F.has(s)) return { category: 'education', label, taxAdvantaged: true, liquid: false };
    // Checked after retirement and education so that an HSA lands in 'health'
    // rather than being swallowed by the depository branch below.
    if (HEALTH_F.has(s)) return { category: 'health', label, taxAdvantaged: true, liquid: false };
    if (INSURANCE_F.has(s)) return { category: 'insurance', label, taxAdvantaged: false, liquid: false };
    if (LIQUID_TAX_ADVANTAGED_F.has(s)) {
      // A Cash ISA is cash; a stocks-and-shares ISA is an investment wrapper.
      // Plaid distinguishes them by type, not by subtype.
      const category: AccountCategory = t === 'depository' ? 'cash' : 'investment';
      return { category, label, taxAdvantaged: true, liquid: t === 'depository' };
    }
  }

  if (t === 'depository') {
    const liquid = s === null || !ILLIQUID_DEPOSITORY_F.has(s);
    return { category: 'cash', label, taxAdvantaged: false, liquid };
  }

  if (t === 'credit') return { category: 'credit', label, taxAdvantaged: false, liquid: false };
  if (t === 'loan') return { category: 'loan', label, taxAdvantaged: false, liquid: false };
  if (t === 'investment' || t === 'brokerage') {
    return { category: 'investment', label, taxAdvantaged: false, liquid: false };
  }

  return { category: 'other', label, taxAdvantaged: false, liquid: false };
}

/**
 * Does this account's balance count as spendable emergency cash?
 *
 * The single question `liquidDeposits` should have been asking. Kept as its own
 * export so the ladder's definition of "liquid" is one greppable decision
 * rather than a condition repeated at each call site.
 */
export function countsAsLiquidCash(type: string, subtype: string | null): boolean {
  return classifyAccount(type, subtype).liquid;
}
