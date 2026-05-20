import { boolean, integer, jsonb, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
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

// Idempotency table — one row per processed event id. With Plaid this is keyed
// on `transaction_id` (Plaid webhook deliveries don't have unique ids; the txn
// id is the stable dedup key).
export const processedEvents = pgTable('processed_events', {
  id: text('id').primaryKey(),
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
});

// One row per linked Plaid Item (= one bank login). Phase 1 single-user has
// at most one row. `cursor` is the /transactions/sync pagination anchor —
// null until the first sync runs. `initial_sync_complete` gates rule
// evaluation: the first sync (90 days of history) ingests but doesn't react.
// `disabled` set on USER_PERMISSION_REVOKED — we stop syncing after that.
export const plaidItems = pgTable('plaid_items', {
  itemId: text('item_id').primaryKey(),
  accessToken: text('access_token').notNull(),
  cursor: text('cursor'),
  initialSyncComplete: boolean('initial_sync_complete').notNull().default(false),
  disabled: boolean('disabled').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// User-defined category overrides. Looked up by lowercased merchant name;
// overrides Plaid's personal_finance_category mapping when present.
// Phase 1 single-user — multi-user split adds user_id column in T2.2.
export const categoryOverrides = pgTable('category_overrides', {
  merchantName: text('merchant_name').primaryKey(), // already lowercased on insert
  category: text('category').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
