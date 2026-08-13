// Payoff strategy math (docs/prd.md R-7.14, R-7.15). Pure functions: no
// database, no clock reads, so every number here is reproducible in a test.
//
// Simulation model, stated exactly because amortisation is easy to get subtly
// wrong:
//   - Monthly steps. Each month, every open debt accrues interest at its
//     effective monthly rate (APR/12), THEN payments apply. This matches the
//     closed form in R-7.15: months = -log(1 - rB/P) / log(1 + r).
//   - Each debt pays its own minimum every month (frozen at plan start,
//     clamped to what remains). When a debt is paid off, its minimum rolls
//     into the extra pool: total monthly outlay stays constant.
//   - The whole extra pool goes to the first debt in the strategy order; any
//     remainder after a payoff cascades to the next.
//   - Strategy order is computed at start and recomputed after every payoff
//     (the R-7.14 recompute rule), not every month.
//
// Blend rule (R-7.14, verbatim semantics): order by APR descending; if any
// debt can be cleared within 3 months when the FULL extra payment is
// hypothetically concentrated on it (its own minimum plus the entire current
// extra pool), promote it to first regardless of APR; otherwise pure
// avalanche; recompute after every payoff.
//
// Null APR means unknown, never zero. Sorting unknown-rate debt as 0% would
// rank it last and quietly recommend paying it off never, so unknown rates
// are replaced by a conservative assumption and flagged `aprAssumed`.

export type StrategyName = 'blend' | 'avalanche' | 'snowball';

export type PlanDebtInput = {
  id: string;
  type: string;
  balance: number;
  /** Percent, 18 means 18%. Null means unknown, NOT zero. */
  apr: number | null;
  minPayment: number | null;
  isPromotional: boolean;
  /** Percent. Only honoured while `promoEndDate` is in the future. */
  promoApr: number | null;
  promoEndDate: string | null; // YYYY-MM-DD
};

export type PerDebtResult = {
  id: string;
  /** 1-based position in the payoff order actually realised. */
  order: number;
  payoffMonth: number | null;
  payoffDate: string | null; // YYYY-MM-DD
  interestPaid: number;
  aprAssumed: boolean;
};

export type PlanFinding = {
  id: string;
  kind: 'never_pays_off';
  /** Interest accruing per month at the current balance. */
  monthlyInterest: number;
  /** The payment that clears the debt in 36 months, the R-7.16 number. */
  clearingPayment36: number;
};

export type PlanResult = {
  strategy: StrategyName;
  extraMonthly: number;
  /** The strategy's initial targeting order: which debt the extra payment
   *  concentrates on first. Distinct from `perDebt`, which is the realized
   *  payoff chronology (a small debt's own minimum can clear it before the
   *  targeted one). */
  targetOrder: string[];
  /** Months until every debt is cleared, null when any debt never clears. */
  months: number | null;
  debtFreeDate: string | null; // YYYY-MM-DD
  totalInterest: number;
  totalPaid: number;
  perDebt: PerDebtResult[];
  findings: PlanFinding[];
};

export type PlanComparison = {
  blend: PlanResult;
  avalanche: PlanResult;
  snowball: PlanResult;
  minimumsOnly: PlanResult;
};

/** Unknown-rate assumptions, chosen high on purpose: an unreported credit
 *  card APR is almost never low, and underestimating it hides real cost. */
export const ASSUMED_CREDIT_CARD_APR = 24.99;
export const ASSUMED_OTHER_APR = 12;

/** A minimum payment no source reports: the industry-typical floor. */
export const FALLBACK_MIN_PAYMENT_RATE = 0.02;
export const FALLBACK_MIN_PAYMENT_FLOOR = 25;

/** Simulation horizon. A debt still open after 50 years is reported as a
 *  finding, not silently truncated. */
const MAX_MONTHS = 600;

const CENTS = 0.005;

export function assumedApr(debt: Pick<PlanDebtInput, 'type' | 'apr'>): { apr: number; assumed: boolean } {
  if (debt.apr !== null) return { apr: debt.apr, assumed: false };
  return { apr: debt.type === 'credit_card' ? ASSUMED_CREDIT_CARD_APR : ASSUMED_OTHER_APR, assumed: true };
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Add whole months in UTC with end-of-month clamping (Jan 31 + 1 month is
 *  Feb 28/29, not Mar 2/3). */
export function addMonths(start: Date, months: number): Date {
  const y = start.getUTCFullYear();
  const m = start.getUTCMonth();
  const day = start.getUTCDate();
  const firstOfTarget = new Date(Date.UTC(y, m + months, 1));
  const daysInTarget = new Date(
    Date.UTC(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return new Date(Date.UTC(firstOfTarget.getUTCFullYear(), firstOfTarget.getUTCMonth(), Math.min(day, daysInTarget)));
}

/** Effective annual rate (percent) for a given month's date: the promo rate
 *  while the promo window is open, the underlying (or assumed) rate after. */
export function effectiveAprPercent(debt: PlanDebtInput, monthDate: Date): number {
  if (debt.isPromotional && debt.promoApr !== null && debt.promoEndDate !== null) {
    if (isoDate(monthDate) < debt.promoEndDate) return debt.promoApr;
  }
  return assumedApr(debt).apr;
}

export function minPaymentFor(debt: PlanDebtInput): number {
  if (debt.minPayment !== null && debt.minPayment > 0) return debt.minPayment;
  return Math.max(FALLBACK_MIN_PAYMENT_FLOOR, FALLBACK_MIN_PAYMENT_RATE * debt.balance);
}

/** The payment that clears `balance` in `months` at annual rate `aprPercent`
 *  (standard annuity formula; balance/months at 0%). */
export function clearingPayment(balance: number, aprPercent: number, months: number): number {
  if (balance <= 0) return 0;
  const r = aprPercent / 100 / 12;
  if (r === 0) return balance / months;
  return (balance * r) / (1 - (1 + r) ** -months);
}

type SimDebt = {
  input: PlanDebtInput;
  balance: number;
  frozenMin: number;
  interestPaid: number;
  payoffMonth: number | null;
  aprAssumed: boolean;
};

function byId(a: SimDebt, b: SimDebt): number {
  return a.input.id.localeCompare(b.input.id);
}

function avalancheOrder(debts: SimDebt[], monthDate: Date): SimDebt[] {
  return [...debts].sort((a, b) => {
    const ra = effectiveAprPercent(a.input, monthDate);
    const rb = effectiveAprPercent(b.input, monthDate);
    if (rb !== ra) return rb - ra;
    if (a.balance !== b.balance) return a.balance - b.balance;
    return byId(a, b);
  });
}

function snowballOrder(debts: SimDebt[], monthDate: Date): SimDebt[] {
  return [...debts].sort((a, b) => {
    if (a.balance !== b.balance) return a.balance - b.balance;
    const ra = effectiveAprPercent(a.input, monthDate);
    const rb = effectiveAprPercent(b.input, monthDate);
    if (rb !== ra) return rb - ra;
    return byId(a, b);
  });
}

/** Months to clear one debt when the FULL extra pool is concentrated on it
 *  (its own frozen minimum plus the whole pool), or null if not within
 *  `horizon` months. The word "full" is load-bearing: the hypothetical gives
 *  the candidate everything, not a share. */
function monthsToClearConcentrated(debt: SimDebt, extraPool: number, monthDate: Date, horizon: number): number | null {
  let balance = debt.balance;
  const payment = debt.frozenMin + extraPool;
  if (payment <= 0) return null;
  for (let m = 1; m <= horizon; m++) {
    const rate = effectiveAprPercent(debt.input, addMonths(monthDate, m - 1)) / 100 / 12;
    balance += balance * rate;
    balance -= payment;
    if (balance <= CENTS) return m;
  }
  return null;
}

function blendOrder(debts: SimDebt[], extraPool: number, monthDate: Date): SimDebt[] {
  const base = avalancheOrder(debts, monthDate);
  type Candidate = { debt: SimDebt; months: number };
  let best: Candidate | null = null;
  for (const debt of debts) {
    const months = monthsToClearConcentrated(debt, extraPool, monthDate, 3);
    if (months === null) continue;
    if (
      best === null ||
      months < best.months ||
      (months === best.months &&
        effectiveAprPercent(debt.input, monthDate) > effectiveAprPercent(best.debt.input, monthDate)) ||
      (months === best.months &&
        effectiveAprPercent(debt.input, monthDate) === effectiveAprPercent(best.debt.input, monthDate) &&
        debt.balance < best.debt.balance)
    ) {
      best = { debt, months };
    }
  }
  if (best === null) return base;
  const promoted = best.debt;
  return [promoted, ...base.filter((d) => d !== promoted)];
}

function orderFor(strategy: StrategyName, debts: SimDebt[], extraPool: number, monthDate: Date): SimDebt[] {
  if (strategy === 'avalanche') return avalancheOrder(debts, monthDate);
  if (strategy === 'snowball') return snowballOrder(debts, monthDate);
  return blendOrder(debts, extraPool, monthDate);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Simulate a payoff plan. `start` is injected, never read from the clock. */
export function simulatePlan(
  debts: PlanDebtInput[],
  extraMonthly: number,
  strategy: StrategyName,
  start: Date,
): PlanResult {
  const sims: SimDebt[] = debts
    .filter((d) => d.balance > CENTS)
    .map((d) => ({
      input: d,
      balance: d.balance,
      frozenMin: minPaymentFor(d),
      interestPaid: 0,
      payoffMonth: null,
      aprAssumed: assumedApr(d).assumed,
    }));

  const realizedOrder: string[] = [];
  let order = orderFor(
    strategy,
    sims.filter((d) => d.payoffMonth === null),
    extraMonthly,
    start,
  );
  const targetOrder = order.map((d) => d.input.id);

  let month = 0;
  while (sims.some((d) => d.payoffMonth === null) && month < MAX_MONTHS) {
    month += 1;
    const monthDate = addMonths(start, month);
    const active = sims.filter((d) => d.payoffMonth === null);

    // 1. Accrue.
    for (const debt of active) {
      const rate = effectiveAprPercent(debt.input, addMonths(start, month - 1)) / 100 / 12;
      const interest = debt.balance * rate;
      debt.balance += interest;
      debt.interestPaid += interest;
    }

    // 2. Minimums on every open debt; freed minimums feed the pool.
    let pool = extraMonthly;
    for (const debt of sims) {
      if (debt.payoffMonth !== null) {
        pool += debt.frozenMin;
        continue;
      }
      const payment = Math.min(debt.frozenMin, debt.balance);
      debt.balance -= payment;
      // A minimum that overshoots the remaining balance frees the difference.
      pool += debt.frozenMin - payment;
    }

    // 3. Extra pool cascades down the strategy order.
    let reorder = false;
    for (const debt of order) {
      if (pool <= 0) break;
      if (debt.payoffMonth !== null || debt.balance <= CENTS) continue;
      const payment = Math.min(pool, debt.balance);
      debt.balance -= payment;
      pool -= payment;
    }

    // 4. Mark payoffs, recompute order after any (R-7.14).
    for (const debt of active) {
      if (debt.balance <= CENTS && debt.payoffMonth === null) {
        debt.balance = 0;
        debt.payoffMonth = month;
        realizedOrder.push(debt.input.id);
        reorder = true;
      }
    }
    if (reorder) {
      const remaining = sims.filter((d) => d.payoffMonth === null);
      const nextPool = extraMonthly + sims.filter((d) => d.payoffMonth !== null).reduce((s, d) => s + d.frozenMin, 0);
      order = orderFor(strategy, remaining, nextPool, monthDate);
    }
  }

  const findings: PlanFinding[] = [];
  for (const debt of sims) {
    if (debt.payoffMonth !== null) continue;
    realizedOrder.push(debt.input.id);
    // Report against the STARTING balance: after 50 simulated years of
    // negative amortisation the terminal balance is a meaningless huge number,
    // and the user's question is about the card as it stands today.
    const aprPercent = assumedApr(debt.input).apr;
    findings.push({
      id: debt.input.id,
      kind: 'never_pays_off',
      monthlyInterest: round2((debt.input.balance * aprPercent) / 100 / 12),
      clearingPayment36: round2(clearingPayment(debt.input.balance, aprPercent, 36)),
    });
  }

  const months =
    findings.length === 0 && sims.length > 0 ? Math.max(...sims.map((d) => d.payoffMonth as number)) : null;
  const totalInterest = round2(sims.reduce((s, d) => s + d.interestPaid, 0));
  const principalPaid = sims.reduce((s, d) => s + (d.input.balance - d.balance), 0);

  return {
    strategy,
    extraMonthly,
    targetOrder,
    months: sims.length === 0 ? 0 : months,
    debtFreeDate: months !== null ? isoDate(addMonths(start, months)) : sims.length === 0 ? isoDate(start) : null,
    totalInterest,
    totalPaid: round2(principalPaid + sims.reduce((s, d) => s + d.interestPaid, 0)),
    perDebt: sims
      .map((d) => ({
        id: d.input.id,
        order: realizedOrder.indexOf(d.input.id) + 1,
        payoffMonth: d.payoffMonth,
        payoffDate: d.payoffMonth !== null ? isoDate(addMonths(start, d.payoffMonth)) : null,
        interestPaid: round2(d.interestPaid),
        aprAssumed: d.aprAssumed,
      }))
      .sort((a, b) => a.order - b.order),
    findings,
  };
}

/** All three strategies plus minimums-only, so the dollar cost of the choice
 *  is always computable ("Blend costs you $X more than pure avalanche"). */
export function comparePlans(debts: PlanDebtInput[], extraMonthly: number, start: Date): PlanComparison {
  return {
    blend: simulatePlan(debts, extraMonthly, 'blend', start),
    avalanche: simulatePlan(debts, extraMonthly, 'avalanche', start),
    snowball: simulatePlan(debts, extraMonthly, 'snowball', start),
    minimumsOnly: simulatePlan(debts, 0, 'avalanche', start),
  };
}
