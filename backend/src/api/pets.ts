import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ladderView, reevaluateWithDeclarations } from '../goals/refresh.js';
import { getDeclarations, updateDeclarations } from '../store/declarations.js';
import { getDerivedState, getLadderInputs, getLadderInputsAsOf, getLadderState, getPetStage } from '../store/goals.js';
import { getGoals, getState, PetGoalsSchema, updateGoals } from '../store/pet.js';

// Declared ladder targets. Rates are fractions of take-home (0 to 1, exclusive
// of 0 so a target can never be trivially satisfied); explicit null clears the
// override back to the engine default.
const DeclarationsSchema = z
  .object({
    shelteredTargetRate: z.number().gt(0).lte(1).nullable().optional(),
    surplusTargetRate: z.number().gt(0).lte(1).nullable().optional(),
  })
  .strict();

export function registerPetsApi(app: FastifyInstance): void {
  // Legacy scalars (healthScore, mood, reactionHistory, goals) are preserved
  // verbatim: a shipped iOS build and the Android client both consume them.
  // The goal-system fields are additive and null until the first refresh
  // (which GET /api/net-worth triggers) has run for this user.
  app.get('/api/pets', async (req: FastifyRequest) => {
    const userId = req.user!.id;
    const [legacy, ladder, inputs, inputsAsOf, derived, stage, declarations] = await Promise.all([
      getState(userId),
      getLadderState(userId),
      getLadderInputs(userId),
      getLadderInputsAsOf(userId),
      getDerivedState(userId),
      getPetStage(userId),
      getDeclarations(userId),
    ]);

    return {
      ...legacy,
      stage,
      derived,
      declarations,
      ladder: ladderView(ladder, inputs),
      // R-8.2: Home shows real money in its rung detail line and had nothing
      // anywhere on the screen saying when that was true. This is the age of
      // the money, not the age of the recomputation, and null means UNKNOWN
      // rather than fresh (see store/goals.ts).
      dataAsOf: inputsAsOf ? inputsAsOf.toISOString() : null,
    };
  });

  app.put('/api/pets/goals', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = PetGoalsSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }
    await updateGoals(req.user!.id, parsed.data);
    return getGoals(req.user!.id);
  });

  // Adjust the user-declared ladder targets (rung 5 and rung 6 rates) and
  // immediately re-judge the ladder against the last refreshed inputs, so the
  // response already reflects the moved slider.
  app.put('/api/pets/declarations', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = DeclarationsSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: parsed.error.flatten() });
    }

    const userId = req.user!.id;
    const now = new Date();
    const declarations = await updateDeclarations(userId, parsed.data, now);
    const ladder = await reevaluateWithDeclarations(userId, now);
    const inputs = await getLadderInputs(userId);

    return { declarations, ladder: ladderView(ladder, inputs) };
  });
}
