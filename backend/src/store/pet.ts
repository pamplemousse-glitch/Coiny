import { desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { petState, reactionHistory } from '../db/schema.js';
import type { Reaction } from '../reactions/types.js';

export const PetGoalsSchema = z.object({
  weeklyBudgetByCategory: z.record(z.string(), z.number().positive()).optional(),
  savingsGoal: z.number().positive().optional(),
  paycheckMinAmount: z.number().positive().optional(),
  largePurchaseThreshold: z.number().positive().optional(),
});

export type PetGoals = Pick<
  typeof petState.$inferSelect,
  'weeklyBudgetByCategory' | 'savingsGoal' | 'paycheckMinAmount' | 'largePurchaseThreshold'
>;

export type ReactionRecord = {
  at: string;
  eventType: string;
  reaction: Reaction;
};

export type PetState = {
  healthScore: number;
  mood: number;
  lastReactionAt: string | null;
  reactionHistory: ReactionRecord[];
  goals: PetGoals;
};

const MAX_HISTORY = 50;
const SINGLETON_ID = 1;

async function readPetRow() {
  const rows = await db().select().from(petState).where(eq(petState.id, SINGLETON_ID));
  const row = rows[0];
  if (!row) throw new Error('pet_state singleton row missing — did migrations run?');
  return row;
}

export async function getState(): Promise<PetState> {
  const [row, history] = await Promise.all([
    readPetRow(),
    db()
      .select()
      .from(reactionHistory)
      .orderBy(desc(reactionHistory.at))
      .limit(MAX_HISTORY),
  ]);

  return {
    healthScore: row.healthScore,
    mood: row.mood,
    lastReactionAt: row.lastReactionAt?.toISOString() ?? null,
    reactionHistory: history.map((h) => ({
      at: h.at.toISOString(),
      eventType: h.eventType,
      reaction: h.reaction,
    })),
    goals: {
      weeklyBudgetByCategory: row.weeklyBudgetByCategory,
      savingsGoal: row.savingsGoal,
      paycheckMinAmount: row.paycheckMinAmount,
      largePurchaseThreshold: row.largePurchaseThreshold,
    },
  };
}

export async function getGoals(): Promise<PetGoals> {
  const row = await readPetRow();
  return {
    weeklyBudgetByCategory: row.weeklyBudgetByCategory,
    savingsGoal: row.savingsGoal,
    paycheckMinAmount: row.paycheckMinAmount,
    largePurchaseThreshold: row.largePurchaseThreshold,
  };
}

export async function updateGoals(patch: z.infer<typeof PetGoalsSchema>): Promise<void> {
  const updates: Partial<typeof petState.$inferInsert> = {};

  if (patch.weeklyBudgetByCategory !== undefined) {
    const current = (await readPetRow()).weeklyBudgetByCategory;
    updates.weeklyBudgetByCategory = { ...current, ...patch.weeklyBudgetByCategory };
  }
  if (patch.savingsGoal !== undefined) updates.savingsGoal = patch.savingsGoal;
  if (patch.paycheckMinAmount !== undefined) updates.paycheckMinAmount = patch.paycheckMinAmount;
  if (patch.largePurchaseThreshold !== undefined) updates.largePurchaseThreshold = patch.largePurchaseThreshold;

  if (Object.keys(updates).length === 0) return;
  await db().update(petState).set(updates).where(eq(petState.id, SINGLETON_ID));
}

export async function applyHealthDelta(delta: number): Promise<void> {
  // Clamp inside SQL so concurrent webhook deltas can't drive the value past [0, 100].
  // mood mirrors healthScore — each computed from its own pre-update column so
  // they can't desync if the rule ever drifts.
  await db()
    .update(petState)
    .set({
      healthScore: sql`LEAST(100, GREATEST(0, ${petState.healthScore} + ${delta}))`,
      mood: sql`LEAST(100, GREATEST(0, ${petState.mood} + ${delta}))`,
    })
    .where(eq(petState.id, SINGLETON_ID));
}

export async function recordReaction(eventType: string, reaction: Reaction): Promise<void> {
  const now = new Date();
  await db().insert(reactionHistory).values({ at: now, eventType, reaction });
  await db()
    .update(petState)
    .set({ lastReactionAt: now })
    .where(eq(petState.id, SINGLETON_ID));

  // Prune history beyond MAX_HISTORY to keep the table bounded.
  await db().execute(sql`
    DELETE FROM ${reactionHistory}
    WHERE id NOT IN (
      SELECT id FROM ${reactionHistory} ORDER BY at DESC LIMIT ${MAX_HISTORY}
    )
  `);
}
