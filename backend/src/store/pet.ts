import { z } from 'zod';
import type { Reaction } from '../reactions/types.js';

export const PetGoalsSchema = z.object({
  weeklyBudgetByCategory: z.record(z.string(), z.number().positive()).optional(),
  savingsGoal: z.number().positive().optional(),
  paycheckMinAmount: z.number().positive().optional(),
  largePurchaseThreshold: z.number().positive().optional(),
});

export type PetGoals = {
  weeklyBudgetByCategory: Record<string, number>;
  savingsGoal: number;
  paycheckMinAmount: number;
  largePurchaseThreshold: number;
};

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

const state: PetState = {
  healthScore: 50,
  mood: 50,
  lastReactionAt: null,
  reactionHistory: [],
  goals: {
    weeklyBudgetByCategory: { groceries: 150, food_and_drink: 150, restaurants: 150 },
    savingsGoal: 1000,
    paycheckMinAmount: 500,
    largePurchaseThreshold: 200,
  },
};

export function getState(): Readonly<PetState> {
  return state;
}

export function getGoals(): Readonly<PetGoals> {
  return state.goals;
}

export function updateGoals(patch: z.infer<typeof PetGoalsSchema>): void {
  if (patch.weeklyBudgetByCategory !== undefined) {
    Object.assign(state.goals.weeklyBudgetByCategory, patch.weeklyBudgetByCategory);
  }
  if (patch.savingsGoal !== undefined) state.goals.savingsGoal = patch.savingsGoal;
  if (patch.paycheckMinAmount !== undefined) state.goals.paycheckMinAmount = patch.paycheckMinAmount;
  if (patch.largePurchaseThreshold !== undefined) state.goals.largePurchaseThreshold = patch.largePurchaseThreshold;
}

export function applyHealthDelta(delta: number): void {
  state.healthScore = Math.max(0, Math.min(100, state.healthScore + delta));
  state.mood = state.healthScore;
}

export function recordReaction(eventType: string, reaction: Reaction): void {
  const record: ReactionRecord = { at: new Date().toISOString(), eventType, reaction };
  state.reactionHistory.unshift(record);
  if (state.reactionHistory.length > MAX_HISTORY) state.reactionHistory.pop();
  state.lastReactionAt = record.at;
}
