import type { Reaction } from '../reactions/types.js';
import type { PetGoals } from '../store/pet.js';
import type { Transaction } from '../types/transaction.js';
import { rules } from './definitions.js';

export type RuleMatch = { name: string; reaction: Reaction };

export function evaluate(tx: Transaction, goals: PetGoals): RuleMatch | null {
  for (const rule of rules) {
    if (rule.match(tx, goals)) {
      return { name: rule.name, reaction: rule.react(tx, goals) };
    }
  }
  return null;
}
