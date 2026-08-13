// Category sets shared by the spending summary and the goal system.
//
// These live in one place deliberately. If the savings rate shown on the Activity
// tab and the savings rate the ladder evaluates were computed from different
// category sets, the creature would react to a number the user cannot see, which
// is the fastest way to make it feel arbitrary.
//
// Values are the normalised categories produced by `src/plaid/adapter.ts`, not raw
// Plaid PFC strings.

/** Genuine income. A positive amount alone is NOT sufficient: refunds, transfers
 *  between the user's own accounts, and credit card payments all arrive as
 *  credits and none of them are income. */
export const INCOME_CATEGORIES = new Set(['paycheck', 'income']);

/** Movements that do not consume money. Excluded from spend so that paying a card
 *  or moving cash to savings does not register as spending on top of the original
 *  purchase. */
export const NON_SPEND_CATEGORIES = new Set(['transfer']);

/** Outflows a person cannot quickly stop paying. This is the denominator for
 *  runway and for the emergency fund target, so it must be genuinely essential:
 *  including discretionary categories here inflates the target and makes the
 *  ladder feel unreachable. */
export const ESSENTIAL_CATEGORIES = new Set([
  'rent',
  'mortgage',
  'utilities',
  'insurance',
  'loan_payment',
  'groceries',
  'transportation',
  'transit',
  'gas_stations',
  'medical',
]);

export function isIncome(category: string | null): boolean {
  return category !== null && INCOME_CATEGORIES.has(category);
}

export function isNonSpend(category: string | null): boolean {
  return category !== null && NON_SPEND_CATEGORIES.has(category);
}

export function isEssential(category: string | null): boolean {
  return category !== null && ESSENTIAL_CATEGORIES.has(category);
}
