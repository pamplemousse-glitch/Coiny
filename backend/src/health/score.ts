// Health-score deltas per event, read from the reaction contract so the
// creature's movement, its push policy and its health effect can never drift
// apart (docs/prd.md R-7.24). Applied to the legacy healthScore/mood pair
// until the R-7.19 three-variable model (stage/vitality/rest) replaces it.
//
// Notable zeros, by design:
//   - large_purchase: neutral plus a question, never a penalty (R-7.24)
//   - streak_broken: a broken streak resets the counter and NOTHING else
//     (R-7.12)
//   - every structural and exogenous event: not the user's doing

import { contractFor } from '../reactions/contract.js';

export function deltaForEvent(eventType: string): number {
  return contractFor(eventType).healthDelta;
}
