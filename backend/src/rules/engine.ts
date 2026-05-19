import type { TellerTransaction } from '../teller/types.js';
import type { Reaction } from '../reactions/types.js';
import { rules } from './definitions.js';

export type RuleMatch = { name: string; reaction: Reaction };

export function evaluate(tx: TellerTransaction): RuleMatch | null {
  for (const rule of rules) {
    if (rule.match(tx)) {
      return { name: rule.name, reaction: rule.react(tx) };
    }
  }
  return null;
}
