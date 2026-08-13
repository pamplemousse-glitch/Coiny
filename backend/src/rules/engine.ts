// The transaction rule engine (docs/prd.md R-7.25).
//
// Collect-all, not first-match. A transaction that is both a paycheck and a
// contribution used to report one and silently drop the other, which was both
// a product bug (the creature ignored a real event) and a measurement bug (the
// dropped event never reached analytics, so the funnel could not see it).
//
// This module only COLLECTS. Deciding which single reaction the creature
// performs is the reaction contract's job (reactions/contract.ts for the
// precedence, reactions/perform.ts for the caps and the analytics trail).

import type { Reaction } from '../reactions/types.js';
import type { PetGoals } from '../store/pet.js';
import type { Transaction } from '../types/transaction.js';
import { type RuleContext, rules } from './definitions.js';

export type RuleMatch = { name: string; reaction: Reaction };
export type { RuleContext };

const EMPTY_CONTEXT: RuleContext = { weeklySpendByCategory: {} };

/** Every rule that matches, in definition order. Order carries no meaning:
 *  precedence is the contract's, applied by the caller. */
export function evaluateAll(tx: Transaction, goals: PetGoals, context: RuleContext = EMPTY_CONTEXT): RuleMatch[] {
  const matches: RuleMatch[] = [];
  for (const rule of rules) {
    if (rule.match(tx, goals, context)) {
      matches.push({ name: rule.name, reaction: rule.react(tx, goals) });
    }
  }
  return matches;
}
