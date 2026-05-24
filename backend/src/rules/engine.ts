import type { Reaction } from '../reactions/types.js';
import type { PetGoals } from '../store/pet.js';
import type { Transaction } from '../types/transaction.js';
import { type RuleContext, rules } from './definitions.js';

export type RuleMatch = { name: string; reaction: Reaction };
export type { RuleContext };

const EMPTY_CONTEXT: RuleContext = { weeklySpendByCategory: {} };

export function evaluate(tx: Transaction, goals: PetGoals, context: RuleContext = EMPTY_CONTEXT): RuleMatch | null {
  for (const rule of rules) {
    if (rule.match(tx, goals, context)) {
      return { name: rule.name, reaction: rule.react(tx, goals) };
    }
  }
  return null;
}
