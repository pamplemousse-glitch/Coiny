// The single choke point between "events happened" and "the creature moved"
// (docs/prd.md R-7.24, R-7.25).
//
// Producers (the transaction rule engine, the ladder, the guardrail evaluator,
// the goal system, the link flow, the liabilities webhook) COLLECT candidates
// and hand them here. This module:
//
//   1. refuses anything that is not `direct` class (structural and exogenous
//      events never animate; defense in depth behind producers that already
//      return null for them),
//   2. orders the rest by the contract's explicit precedence,
//   3. applies the caps (overspend once per week, the per-day budget),
//   4. performs exactly ONE reaction: health delta, history row, dispatch,
//   5. records the whole decision in analytics, so a suppressed match is a
//      measured fact instead of a silently dropped one (the R-7.25 funnel fix).

import { trackServerEvent } from '../store/analytics.js';
import { applyHealthDelta, countReactionsSince, lastReactionAtForEvent, recordReaction } from '../store/pet.js';
import { contractFor, DAILY_REACTION_BUDGET, OVERSPEND_COOLDOWN_DAYS, orderCandidates } from './contract.js';
import { dispatchReaction } from './dispatch.js';
import type { Reaction } from './types.js';

export type ReactionCandidate = { name: string; reaction: Reaction };

export type SuppressionReason = 'precedence' | 'weekly_cap' | 'daily_budget' | 'non_direct';

export type PerformResult = {
  performed: ReactionCandidate | null;
  suppressed: Array<{ name: string; reason: SuppressionReason }>;
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Choose and perform one reaction from the collected candidates.
 *  Everything not performed is suppressed with a recorded reason. */
export async function performReactions(
  userId: string,
  candidates: ReactionCandidate[],
  now: Date = new Date(),
): Promise<PerformResult> {
  if (candidates.length === 0) return { performed: null, suppressed: [] };

  const suppressed: Array<{ name: string; reason: SuppressionReason }> = [];
  const direct: ReactionCandidate[] = [];
  for (const candidate of candidates) {
    if (contractFor(candidate.name).class === 'direct') direct.push(candidate);
    else suppressed.push({ name: candidate.name, reason: 'non_direct' });
  }

  // Budget window: UTC day, matching the guardrail period convention.
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  let performed: ReactionCandidate | null = null;
  for (const candidate of orderCandidates(direct)) {
    if (performed) {
      suppressed.push({ name: candidate.name, reason: 'precedence' });
      continue;
    }
    const spec = contractFor(candidate.name);

    // R-7.24: overspend_vs_plan performs at most once per rolling week. The
    // fact still lands in analytics; the creature just does not repeat itself.
    if (candidate.name === 'overspend_vs_plan') {
      const last = await lastReactionAtForEvent(userId, 'overspend_vs_plan');
      if (last !== null && now.getTime() - last.getTime() < OVERSPEND_COOLDOWN_DAYS * MS_PER_DAY) {
        suppressed.push({ name: candidate.name, reason: 'weekly_cap' });
        continue;
      }
    }

    // R-7.25: the per-day budget. Celebrations and the actionable warning are
    // exempt; routine reactions stop for the day once the budget is spent.
    if (!spec.budgetExempt) {
      const todayCount = await countReactionsSince(userId, dayStart);
      if (todayCount >= DAILY_REACTION_BUDGET) {
        suppressed.push({ name: candidate.name, reason: 'daily_budget' });
        continue;
      }
    }

    performed = candidate;
  }

  if (performed) {
    const spec = contractFor(performed.name);
    if (spec.healthDelta !== 0) await applyHealthDelta(userId, spec.healthDelta);
    await recordReaction(userId, performed.name, performed.reaction);
    dispatchReaction(userId, performed.reaction, performed.name);
    // origin=market must stay zero forever (R-2.3): exogenous events are
    // filtered above, so a market origin here would mean the filter broke.
    await trackServerEvent(userId, 'reaction_performed', {
      type: performed.name,
      origin: spec.class === 'exogenous' ? 'market' : 'behavior',
      suppressed_count: suppressed.length,
    });
  }

  for (const drop of suppressed) {
    await trackServerEvent(userId, 'reaction_suppressed', { type: drop.name, reason: drop.reason });
  }

  return { performed, suppressed };
}
