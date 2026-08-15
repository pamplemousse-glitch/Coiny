// Target-goal CRUD (docs/prd.md R-7.7, R-7.9) and the guardrail read surface
// (R-7.11, R-7.12). All routes live in the protected scope; every store call
// is userId-scoped, so one user can never read or mutate another's goals.
//
// Logging note: goal names, emoji and amounts are user financial data. Nothing
// in this module logs any of them (.claude/rules/security.md #2).

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { usdValueBand } from '../analytics/events.js';
import { guardrailViews } from '../goals/evaluation.js';
import { LAST_RUNG_ID, skipRung, unskipRung } from '../goals/ladder.js';
import { ladderView } from '../goals/refresh.js';
import { trackServerEvent } from '../store/analytics.js';
import { getLadderInputs, getLadderState, saveLadderState } from '../store/goals.js';
import {
  archiveGoal,
  createGoal,
  getGoal,
  getGoalPaces,
  listGoals,
  MAX_ACTIVE_GOALS,
  type StoredGoalPace,
  type TargetGoal,
  updateGoal,
} from '../store/target-goals.js';

const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

// R-7.9: the default contribution rule is `recurring`, not round-ups.
// Guaranteed rules outperform contingent ones (CFPB Qapital analysis); round-up
// is offered as a supplement, and the client copy owns the honest framing.
const ContributionRuleSchema = z
  .object({
    type: z.enum(['recurring', 'roundup', 'manual']),
    amountUsd: z.number().positive().finite().nullable().default(null),
    cadence: z.enum(['weekly', 'biweekly', 'monthly']).nullable().default(null),
    dayOfMonth: z.number().int().min(1).max(28).nullable().default(null),
  })
  .strict();

// R-7.7 field list, verbatim.
const GoalCreateSchema = z
  .object({
    name: z.string().min(1).max(80),
    emoji: z.string().min(1).max(16).nullable().default(null),
    kind: z.enum(['save', 'payoff', 'purchase']),
    targetAmountUsd: z.number().positive().finite(),
    targetDate: IsoDate.nullable().default(null),
    fundingAccountId: z.string().min(1).max(128).nullable().default(null),
    countsExistingBalance: z.boolean().default(true),
    contributionRule: ContributionRuleSchema.default({
      type: 'recurring',
      amountUsd: null,
      cadence: null,
      dayOfMonth: null,
    }),
    recurringAnnual: z.boolean().default(false),
  })
  .strict()
  // A sinking fund IS a save goal with a date (R-7.7): target/months-until-due
  // is the whole mechanic, so a recurring annual goal without a date is
  // meaningless and rejected here rather than silently accepted.
  .refine((g) => !g.recurringAnnual || g.targetDate !== null, {
    message: 'recurringAnnual requires a targetDate',
    path: ['targetDate'],
  });

const GoalPatchSchema = z
  .object({
    name: z.string().min(1).max(80).optional(),
    emoji: z.string().min(1).max(16).nullable().optional(),
    kind: z.enum(['save', 'payoff', 'purchase']).optional(),
    targetAmountUsd: z.number().positive().finite().optional(),
    targetDate: IsoDate.nullable().optional(),
    fundingAccountId: z.string().min(1).max(128).nullable().optional(),
    countsExistingBalance: z.boolean().optional(),
    contributionRule: ContributionRuleSchema.optional(),
    recurringAnnual: z.boolean().optional(),
  })
  .strict();

const IdParam = z.object({ id: z.coerce.number().int().positive() });

const ListQuery = z.object({ includeArchived: z.coerce.boolean().default(false) });

const RungParam = z.object({ rungId: z.coerce.number().int().min(0).max(LAST_RUNG_ID) });

// R-7.4: skip with a STATED reason. The reasons are a closed token vocabulary
// (the client renders the human copy) so the stored value and the analytics
// property are both machine tokens, never free text.
const SkipBody = z
  .object({
    status: z.enum(['skipped', 'not_applicable']),
    reason: z.enum(['handled_elsewhere', 'not_relevant', 'not_now']).nullable().default(null),
  })
  .strict()
  .refine((b) => b.status !== 'skipped' || b.reason !== null, {
    message: 'a skip needs a stated reason',
    path: ['reason'],
  });

function goalView(goal: TargetGoal, pace: StoredGoalPace | null) {
  return { ...goal, pace };
}

// Analytics field-name tokens for goal_edited, keyed by the PATCH schema's
// keys. Field NAMES only; the values a patch carried never reach analytics.
const GOAL_PATCH_FIELD_TOKENS = {
  name: 'name',
  emoji: 'emoji',
  kind: 'kind',
  targetAmountUsd: 'target_amount',
  targetDate: 'target_date',
  fundingAccountId: 'funding_account',
  countsExistingBalance: 'counts_existing_balance',
  contributionRule: 'contribution_rule',
  recurringAnnual: 'recurring_annual',
} as const;

export function registerGoalsApi(app: FastifyInstance): void {
  app.get('/api/goals', async (req: FastifyRequest, reply: FastifyReply) => {
    const query = ListQuery.safeParse(req.query);
    if (!query.success) return reply.status(400).send({ error: query.error.flatten() });

    const userId = req.user!.id;
    const [goals, paces] = await Promise.all([listGoals(userId, query.data.includeArchived), getGoalPaces(userId)]);
    return {
      goals: goals.map((g) => goalView(g, paces.get(g.id) ?? null)),
      maxActive: MAX_ACTIVE_GOALS,
    };
  });

  // Static route registered alongside the :id routes; Fastify prefers the
  // static match, so /api/goals/guardrails never parses as an id.
  app.get('/api/goals/guardrails', async (req: FastifyRequest) => {
    return { guardrails: await guardrailViews(req.user!.id) };
  });

  app.get('/api/goals/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = IdParam.safeParse(req.params);
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() });

    const userId = req.user!.id;
    const goal = await getGoal(userId, params.data.id);
    if (!goal) return reply.status(404).send({ error: 'not_found' });
    const paces = await getGoalPaces(userId);
    return goalView(goal, paces.get(goal.id) ?? null);
  });

  app.post('/api/goals', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = GoalCreateSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const userId = req.user!.id;
    const created = await createGoal(userId, parsed.data, new Date());
    if (!created) {
      // R-7.9, hard-enforced server-side: the fourth goal is refused with an
      // error specific enough for the UI to render the archive prompt, not a
      // generic 400.
      return reply.status(409).send({
        error: 'goal_limit_reached',
        limit: MAX_ACTIVE_GOALS,
        message: 'You already have three active goals. Archive one to start another.',
      });
    }

    // Server-observed (R-24.2): the create happens HERE, so the client never
    // reports it. Amount appears only as the bucketed band; name and emoji
    // never appear at all.
    await trackServerEvent(userId, 'goal_created', {
      kind: created.kind,
      target_band: usdValueBand(created.targetAmountUsd),
      has_target_date: created.targetDate !== null,
      // The create schema always supplies a rule; the fallback only satisfies
      // the row type, whose contributionRule is nullable.
      contribution_rule: created.contributionRule?.type ?? 'recurring',
    });

    return reply.status(201).send(goalView(created, null));
  });

  app.patch('/api/goals/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = IdParam.safeParse(req.params);
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() });
    const parsed = GoalPatchSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const userId = req.user!.id;
    const existing = await getGoal(userId, params.data.id);
    if (!existing) return reply.status(404).send({ error: 'not_found' });

    const next = { ...existing, ...parsed.data };
    if (next.recurringAnnual && next.targetDate === null) {
      return reply.status(400).send({ error: 'recurring_annual_requires_target_date' });
    }

    const updated = await updateGoal(userId, params.data.id, parsed.data);
    if (!updated) return reply.status(404).send({ error: 'not_found' });

    // Server-observed (R-24.2). Field names only, never the values they
    // carried. An empty patch ({} is a valid body) emits nothing: no fields
    // changed, so there is nothing to measure.
    const fieldsChanged = Object.keys(parsed.data)
      .filter((key): key is keyof typeof GOAL_PATCH_FIELD_TOKENS => key in GOAL_PATCH_FIELD_TOKENS)
      .map((key) => GOAL_PATCH_FIELD_TOKENS[key]);
    if (fieldsChanged.length > 0) {
      await trackServerEvent(userId, 'goal_edited', { kind: updated.kind, fields_changed: fieldsChanged });
    }

    const paces = await getGoalPaces(userId);
    return goalView(updated, paces.get(updated.id) ?? null);
  });

  // Archive, not destroy (R-7.9: "a fourth requires archiving one"). The row
  // and its history stay; the slot frees. Idempotent, so 204 either way.
  app.delete('/api/goals/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = IdParam.safeParse(req.params);
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() });

    const archived = await archiveGoal(req.user!.id, params.data.id, new Date());
    // Server-observed (R-24.2), emitted only on the real transition so the
    // idempotent 204 for an already-archived goal cannot double-count.
    if (archived) {
      await trackServerEvent(req.user!.id, 'goal_archived', { kind: archived.kind });
    }
    return reply.status(204).send();
  });

  // --- Rung skips (R-7.4) ----------------------------------------------------
  // A rung can be opted out of, never failed. `skipped` is the user's own call
  // and reversible below; `not_applicable` is structural. A completed rung
  // cannot be skipped: the completion stands (ladder invariant 1).

  app.post('/api/goals/ladder/rungs/:rungId/skip', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = RungParam.safeParse(req.params);
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() });
    const parsed = SkipBody.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const userId = req.user!.id;
    const state = await getLadderState(userId);
    // No ladder row means the pipeline has never run for this user; there is
    // nothing coherent to skip inside yet.
    if (!state) return reply.status(409).send({ error: 'ladder_not_ready' });

    const next = skipRung(state, params.data.rungId, parsed.data.status, parsed.data.reason);
    if (!next) return reply.status(409).send({ error: 'rung_not_skippable' });

    await saveLadderState(userId, next, new Date());
    // rung_skipped covers both opt-out statuses; skip_reason is always a token
    // from the closed SkipBody vocabulary, never user text.
    await trackServerEvent(userId, 'rung_skipped', {
      rung_index: params.data.rungId,
      skip_reason: parsed.data.reason ?? 'not_applicable',
    });
    if (next.currentRung !== state.currentRung) {
      await trackServerEvent(userId, 'rung_started', { rung_index: next.currentRung });
    }

    return ladderView(next, await getLadderInputs(userId));
  });

  app.delete('/api/goals/ladder/rungs/:rungId/skip', async (req: FastifyRequest, reply: FastifyReply) => {
    const params = RungParam.safeParse(req.params);
    if (!params.success) return reply.status(400).send({ error: params.error.flatten() });

    const userId = req.user!.id;
    const state = await getLadderState(userId);
    if (!state) return reply.status(409).send({ error: 'ladder_not_ready' });

    const next = unskipRung(state, params.data.rungId);
    if (!next) return reply.status(409).send({ error: 'rung_not_skipped' });

    await saveLadderState(userId, next, new Date());
    // No catalog event exists for reversing a skip and names are binding
    // (R-24.2), so none is invented; a currentRung change is still a
    // rung_started fact.
    if (next.currentRung !== state.currentRung) {
      await trackServerEvent(userId, 'rung_started', { rung_index: next.currentRung });
    }

    return ladderView(next, await getLadderInputs(userId));
  });
}
