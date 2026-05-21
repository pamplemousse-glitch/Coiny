import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { Reaction } from '../reactions/types.js';

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    appleSub: text('apple_sub').notNull(),
    email: text('email'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('users_apple_sub_idx').on(t.appleSub)],
);

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => [uniqueIndex('sessions_token_hash_idx').on(t.tokenHash), index('sessions_user_id_idx').on(t.userId)],
);

export const petState = pgTable('pet_state', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
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
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  eventType: text('event_type').notNull(),
  reaction: jsonb('reaction').$type<Reaction>().notNull(),
});

export const processedEvents = pgTable('processed_events', {
  id: text('id').primaryKey(),
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
});

export const plaidItems = pgTable('plaid_items', {
  itemId: text('item_id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token').notNull(),
  cursor: text('cursor'),
  initialSyncComplete: boolean('initial_sync_complete').notNull().default(false),
  disabled: boolean('disabled').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const transactions = pgTable('transactions', {
  transactionId: text('transaction_id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  merchantName: text('merchant_name'),
  amount: text('amount').notNull(),
  date: text('date').notNull(),
  category: text('category'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const deviceTokens = pgTable('device_tokens', {
  token: text('token').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const categoryOverrides = pgTable(
  'category_overrides',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    merchantName: text('merchant_name').notNull(),
    category: text('category').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.merchantName] })],
);
