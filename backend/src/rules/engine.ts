import type { TellerTransaction } from '../teller/types.js';
import type { Reaction } from '../reactions/types.js';
import { rules } from './definitions.js';

export function evaluate(tx: TellerTransaction): Reaction | null {
  for (const rule of rules) {
    if (rule.match(tx)) {
      return rule.react(tx);
    }
  }
  return null;
}
