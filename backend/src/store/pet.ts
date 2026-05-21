import { desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client.js';
import { petState, reactionHistory } from '../db/schema.js';
import { computeMoodWithDecay } from '../health/decay.js';
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

async function readPetRow(userId: string) {
  const rows = await db().select().from(petState).where(eq(petState.userId, userId));
  const row = rows[0];
  if (!row) throw new Error(`pet_state row missing for user ${userId}`);
  return row;
}

export async function getState(userId: string): Promise<PetState> {
  const [row, history] = await Promise.all([
    readPetRow(userId),
    db()
      .select()
      .from(reactionHistory)
      .where(eq(reactionHistory.userId, userId))
      .orderBy(desc(reactionHistory.at))
      .limit(MAX_HISTORY),
  ]);

  return {
    healthScore: row.healthScore,
    mood: computeMoodWithDecay(row.mood, row.lastReactionAt),
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

export async function getGoals(userId: string): Promise<PetGoals> {
  const row = await readPetRow(userId);
  return {
    weeklyBudgetByCategory: row.weeklyBudgetByCategory,
    savingsGoal: row.savingsGoal,
    paycheckMinAmount: row.paycheckMinAmount,
    largePurchaseThreshold: row.largePurchaseThreshold,
  };
}

export async function updateGoals(userId: string, patch: z.infer<typeof PetGoalsSchema>): Promise<void> {
  const updates: Partial<typeof petState.$inferInsert> = {};

  if (patch.weeklyBudgetByCategory !== undefined) {
    const current = (await readPetRow(userId)).weeklyBudgetByCategory;
    updates.weeklyBudgetByCategory = { ...current, ...patch.weeklyBudgetByCategory };
  }
  if (patch.savingsGoal !== undefined) updates.savingsGoal = patch.savingsGoal;
  if (patch.paycheckMinAmount !== undefined) updates.paycheckMinAmount = patch.paycheckMinAmount;
  if (patch.largePurchaseThreshold !== undefined) updates.largePurchaseThreshold = patch.largePurchaseThreshold;

  if (Object.keys(updates).length === 0) return;
  await db().update(petState).set(updates).where(eq(petState.userId, userId));
}

export async function applyHealthDelta(userId: string, delta: number): Promise<void> {
  await db()
    .update(petState)
    .set({
      healthScore: sql`LEAST(100, GREATEST(0, ${petState.healthScore} + ${delta}))`,
      mood: sql`LEAST(100, GREATEST(0, ${petState.mood} + ${delta}))`,
    })
    .where(eq(petState.userId, userId));
}

export async function recordReaction(userId: string, eventType: string, reaction: Reaction): Promise<void> {
  const now = new Date();
  await db().insert(reactionHistory).values({ userId, at: now, eventType, reaction });
  await db().update(petState).set({ lastReactionAt: now }).where(eq(petState.userId, userId));

  await db().execute(sql`
    DELETE FROM ${reactionHistory}
    WHERE id NOT IN (
      SELECT id FROM ${reactionHistory}
      WHERE ${reactionHistory.userId} = ${userId}
      ORDER BY at DESC LIMIT ${MAX_HISTORY}
    ) AND ${reactionHistory.userId} = ${userId}
  `);
}
