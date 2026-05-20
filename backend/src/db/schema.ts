import { integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
import type { Reaction } from '../reactions/types.js';

// Singleton row (id = 1) holding the pet's mood + goals.
// Multi-user split lands in T2.2; until then a single row covers everything.
export const petState = pgTable('pet_state', {
  id: integer('id').primaryKey(),
  healthScore: integer('health_score').notNull().default(50),
  mood: integer('mood').notNull().default(50),
  lastReactionAt: timestamp('last_reaction_at', { withTimezone: true }),
  weeklyBudgetByCategory: jsonb('weekly_budget_by_category')
    .$type<Record<string, number>>()
    .notNull()
    .default({ groceries: 150, food_and_drink: 150, restaurants: 150 }),
  savingsGoal: integer('savings_goal').notNull().default(1000),
  paycheckMinAmount: integer('paycheck_min_amount').notNull().default(500),
  largePurchaseThreshold: integer('large_purchase_threshold').notNull().default(200),
});

export const reactionHistory = pgTable('reaction_history', {
  id: serial('id').primaryKey(),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  eventType: text('event_type').notNull(),
  reaction: jsonb('reaction').$type<Reaction>().notNull(),
});

// Idempotency table — one row per Teller webhook event id we've handled.
// Teller retries unacknowledged webhooks; presence here means "already processed."
export const processedEvents = pgTable('processed_events', {
  id: text('id').primaryKey(),
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
});
