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

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    appleSub: text('apple_sub').notNull(),
    email: text('email'),
    displayName: text('display_name'),
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

// `reaction` holds an AES-256-GCM-encrypted JSON blob (envelope format from
// util/crypto.ts). Stores a free-text `reason` field plus the animation/sound/
// led/duration payload — none of which should land in DB backups in plaintext.
// Migration 0006 dropped the old jsonb column and re-added it as text.
export const reactionHistory = pgTable('reaction_history', {
  id: serial('id').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
  eventType: text('event_type').notNull(),
  reaction: text('reaction').notNull(),
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

// Coinbase connections — one per user; mode='dev_key' uses server-side API key,
// mode='oauth' stores per-user OAuth tokens.
export const coinbaseConnections = pgTable('coinbase_connections', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
  mode: text('mode').notNull().default('dev_key'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Zerion wallets — many per user, one row per wallet address.
export const zerionWallets = pgTable(
  'zerion_wallets',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    address: text('address').notNull(),
    label: text('label'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('zerion_wallets_user_address_idx').on(t.userId, t.address)],
);

// Spinwheel connections — one per user; spinwheelUserId links to the Spinwheel platform.
export const spinwheelConnections = pgTable('spinwheel_connections', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  spinwheelUserId: text('spinwheel_user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Temporary storage for the Spinwheel userId returned by the SMS OTP send step.
// Needed because the verify call requires the spinwheelUserId in the URL path.
// Cleared on successful verify or replaced on new OTP request.
export const spinwheelPending = pgTable('spinwheel_pending', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  spinwheelUserId: text('spinwheel_user_id').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
