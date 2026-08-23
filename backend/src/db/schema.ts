import {
  bigserial,
  boolean,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { LadderContext, RungState } from '../goals/ladder.js';

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    // At least one of appleSub/googleSub must be set. Enforced in application
    // code (findOrCreateUser) rather than via a DB check constraint.
    appleSub: text('apple_sub'),
    googleSub: text('google_sub'),
    // Sign in with Apple refresh token, AES-256-GCM encrypted (util/crypto).
    // Held for exactly one purpose: TN3194 requires account deletion to call
    // Apple's `/auth/revoke`, and that endpoint needs a token. Written
    // best-effort at sign-in when the client sends an authorization code, read
    // once at deletion, and destroyed with the row.
    appleRefreshToken: text('apple_refresh_token'),
    // No `email` and no `display_name`. Both columns existed, both were
    // written at sign-in, and in the whole history of the codebase neither was
    // ever read by anything in `src/` (audit 2.2.1). An identity field nobody
    // reads is not a feature with a control attached, it is breach-notification
    // surface with no offsetting benefit: it is exactly the "customer
    // information" that starts the FTC clock (1.11.3) and California's
    // (1.11.4). Dropped in 0054 rather than encrypted, disclosed, disposed of
    // and notified about. Do not reintroduce either without a named reader.
    // Reg P 1016.9(b)(1)(iii) delivers the privacy notice by requiring the
    // consumer to acknowledge it as a necessary step to obtaining the service.
    // The sign-in screen is that step; these two columns are the record of it.
    // Null means the user predates the consent surface, not that they refused.
    legalAcceptedAt: timestamp('legal_accepted_at', { withTimezone: true }),
    legalVersion: text('legal_version'),
    // The server half of the "Share usage data" toggle
    // (docs/legal/consent-copy.md §2). A client-only flag would stop the client
    // queue and leave every server-emitted event still writing.
    analyticsOptOut: boolean('analytics_opt_out').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('users_apple_sub_idx').on(t.appleSub), uniqueIndex('users_google_sub_idx').on(t.googleSub)],
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
  lastNetWorthUsd: numeric('last_net_worth_usd'),
});

// `reaction` holds an AES-256-GCM-encrypted JSON blob (envelope format from
// util/crypto.ts). Stores a free-text `reason` field plus the animation/sound/
// led/duration payload — none of which should land in DB backups in plaintext.
// Migration 0006 dropped the old jsonb column and re-added it as text.
export const reactionHistory = pgTable(
  'reaction_history',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
    eventType: text('event_type').notNull(),
    reaction: text('reaction').notNull(),
  },
  (t) => [index('reaction_history_user_idx').on(t.userId)],
);

export const processedEvents = pgTable('processed_events', {
  id: text('id').primaryKey(),
  processedAt: timestamp('processed_at', { withTimezone: true }).notNull().defaultNow(),
});

// Item connection health (docs/prd.md R-8.5). `status` records where the item
// sits in Plaid's lifecycle; `disabled` stays as the hard kill switch (revoked
// or unlinked items are both disabled AND revoked). 'repaired' from the PRD's
// transition list is an event, not a state: LOGIN_REPAIRED and a completed
// update-mode flow both transition the item back to 'healthy'.
export type PlaidItemStatus = 'healthy' | 'expiring' | 'reauth_required' | 'revoked';

export const plaidItems = pgTable(
  'plaid_items',
  {
    itemId: text('item_id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token').notNull(),
    cursor: text('cursor'),
    initialSyncComplete: boolean('initial_sync_complete').notNull().default(false),
    disabled: boolean('disabled').notNull().default(false),
    // Lifecycle state, driven by ITEM webhooks and the repair endpoints.
    status: text('status').$type<PlaidItemStatus>().notNull().default('healthy'),
    statusChangedAt: timestamp('status_changed_at', { withTimezone: true }),
    // Plaid error_code that caused the last unhealthy transition (e.g.
    // ITEM_LOGIN_REQUIRED). Programmatic code only, never message text.
    lastErrorCode: text('last_error_code'),
    // Set by ITEM/NEW_ACCOUNTS_AVAILABLE; cleared when the item is repaired or
    // relinked. Signals the client to run update mode with account selection.
    newAccountsAvailable: boolean('new_accounts_available').notNull().default(false),
    // Institution identity from /item/get, captured at link time (it never
    // changes for the life of an item) so the repair prompt can name the bank
    // (S-17). Nullable: Plaid returns null for items created without an
    // institution connection. Displayable user financial data: may appear in
    // API responses, never in a log line or an analytics property.
    institutionId: text('institution_id'),
    institutionName: text('institution_name'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('plaid_items_user_idx').on(t.userId)],
);

// Items whose /item/remove call failed, held only until it succeeds.
//
// The defect this exists for: both unlink paths swallowed an /item/remove
// failure and then destroyed the row, which is the only copy of the access
// token. In sandbox that costs nothing. In production it leaves an Item that
// Plaid bills monthly "even if no API calls are made for the Item", that
// cannot be cancelled without the token we just deleted, and that has
// permanently consumed one of ten trial connections (removing a Trial Item
// does not return the slot).
//
// A separate table rather than a flag on plaid_items, for two reasons:
//
//   1. plaid_items is read by twelve call sites (net worth, goal snapshots,
//      debts, the refresh sweep, item health, the connection gate). A retained
//      row needs an exclusion filter at every one of them, and the cost of
//      missing one is a bank the user unlinked still showing a balance.
//   2. DELETE /api/account cascades plaid_items away via the user FK, so a
//      flag on that table cannot survive the case it is most needed in.
//
// It carries NO user_id, deliberately. Nothing here is retained for our
// benefit or joined back to a person: it is an item id and the credential
// needed to complete the removal the user already asked for, and the row is
// deleted the moment that succeeds. See docs/legal/data-disposal-schedule.md,
// which names this as the one bounded exception to "nothing retains a revoked
// credential".
export const plaidRemovalQueue = pgTable('plaid_removal_queue', {
  itemId: text('item_id').primaryKey(),
  // AES-256-GCM, same envelope as plaid_items.access_token. Registered in
  // db/rotate-encryption-key.ts: a column that misses the rotation sweep
  // becomes unreadable at the next key change, which here means the leak the
  // table exists to close reopens silently.
  accessToken: text('access_token').notNull(),
  attempts: integer('attempts').notNull().default(0),
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
  // Plaid error_code only, never error_message: the message is vendor prose
  // that has carried institution names before now.
  lastErrorCode: text('last_error_code'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Encryption-at-rest decision for this table (PRD R-13.4, Appendix B item B8,
// docs/obligations.md section 1):
//
//   merchant_name is AES-256-GCM encrypted at write (util/crypto.ts envelope,
//   same as plaid_items.access_token). It is the identifying half of the
//   behavioural profile: merchant + date reads as "where this person was and
//   what they bought". No SQL query ever filtered, grouped or matched on it
//   (all merchant matching lives in Node: subscriptions/detect.ts,
//   goals/guardrails.ts), so encrypting it costs nothing in query capability.
//
//   amount is DELIBERATELY plaintext. getWeeklySpendByCategory runs
//   SUM/GROUP BY and sign predicates on it inside webhook processing (the
//   largest table, the hot path), and getRecentOutflows filters on its sign;
//   encrypting it moves those aggregates into Node on every sync. An amount
//   without a merchant is a magnitude, not a profile. Accepted residual risk,
//   recorded per B8: a database dump still reveals per-user amounts, dates
//   and coarse categories keyed to pseudonymous user ids (emails are
//   encrypted in `users`). Rows written before migration 0048 are plaintext
//   until scripts/backfill-encrypt-pii.ts runs; decryptString tolerates them.
export const transactions = pgTable(
  'transactions',
  {
    transactionId: text('transaction_id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    merchantName: text('merchant_name'), // AES-256-GCM encrypted (see above)
    amount: text('amount').notNull(), // plaintext ON PURPOSE (see above)
    date: text('date').notNull(),
    category: text('category'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  // The comment above calls this the largest table and the hot path, and every
  // caller filters by user_id (three of them additionally by date). Until 0049
  // the only index was the primary key on transaction_id, so those queries were
  // sequential scans. Measured on 1M rows: 148.8ms seq scan against 0.688ms
  // index scan, shared buffers 10201 against 184.
  (t) => [index('transactions_user_date_idx').on(t.userId, t.date)],
);

/** Investment buys, sells, dividends and contributions, from
 *  `/investments/transactions/get`.
 *
 *  Kept out of `transactions` on purpose. That table feeds the spending rules
 *  and the reaction engine, and a 401k rebalance is not spending; mixing them
 *  would make the creature react to a portfolio trade as if the user had bought
 *  something. This table exists so goal pacing can see contributions made
 *  INSIDE a brokerage, which it previously could not observe at all.
 *
 *  Deliberately narrow. `name` (e.g. "INCOME DIV DIVIDEND RECEIVED") is
 *  financial detail with no consumer here, so it is not stored at all, which
 *  is cheaper than storing it encrypted. `amount` is plaintext for the same
 *  reason it is on `transactions`: every query filters and sums on it.
 *
 *  Amounts are stored in COINY's convention, negative for outflow, so they can
 *  be summed alongside bank transactions without a per-row correction. Plaid's
 *  investment convention is the opposite; see plaid/types.ts. */
export const investmentTransactions = pgTable(
  'investment_transactions',
  {
    investmentTransactionId: text('investment_transaction_id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    securityId: text('security_id'),
    date: text('date').notNull(),
    amount: text('amount').notNull(),
    /** buy | sell | cancel | cash | fee | transfer */
    type: text('type').notNull(),
    /** contribution, deposit, dividend, withdrawal, transfer, and so on. */
    subtype: text('subtype').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  // The only read pattern: one user's rows for one account inside a date
  // window. Mirrors the index added to `transactions` in 0049 for the same
  // reason, before the table is big enough for it to hurt.
  (t) => [index('investment_transactions_user_account_date_idx').on(t.userId, t.accountId, t.date)],
);

export const deviceTokens = pgTable('device_tokens', {
  token: text('token').primaryKey(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(),
  // IANA timezone identifier captured at registration (R-9.3 quiet hours).
  // Nullable: tokens from older app builds have none, and the dispatcher
  // suppresses pushes rather than guessing a zone.
  timezone: text('timezone'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Denormalised copy of transaction merchant names (the user's manual
// recategorisations), covered by the same 0048 encryption decision as
// `transactions`. The PK column needs SQL equality (getOverride runs once per
// ingested transaction) and upsert dedupe, which random-IV ciphertext cannot
// provide, so merchant_name holds a deterministic HMAC-SHA256 blind index
// (util/crypto.ts blindIndex) and merchant_name_enc holds the AES-256-GCM
// ciphertext of the normalized name for display (listOverrides). Rows written
// before 0048 hold the plaintext normalized merchant in merchant_name and
// null in merchant_name_enc; store/overrides.ts reads both forms until
// scripts/backfill-encrypt-pii.ts rewrites them.
export const categoryOverrides = pgTable(
  'category_overrides',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    merchantName: text('merchant_name').notNull(), // blind index (legacy rows: plaintext)
    merchantNameEnc: text('merchant_name_enc'), // AES-256-GCM encrypted display copy
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
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  // Per-connection health (0062). See store/connection-health.ts: status is
  // DERIVED from these, never stored, because no vendor here sends a webhook
  // that would make a stored lifecycle a fact rather than a cache.
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
  lastErrorClass: text('last_error_class'),
  consecutiveFailures: integer('consecutive_failures').notNull().default(0),
  disabled: boolean('disabled').notNull().default(false),
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
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    // Per-connection health (0062). See store/connection-health.ts: status is
    // DERIVED from these, never stored, because no vendor here sends a webhook
    // that would make a stored lifecycle a fact rather than a cache.
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
    lastErrorClass: text('last_error_class'),
    consecutiveFailures: integer('consecutive_failures').notNull().default(0),
    disabled: boolean('disabled').notNull().default(false),
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
  lastCreditScore: integer('last_credit_score'),
  // Added by 0063, not 0062: 0062's census of which tables already had this
  // was produced by a regex that ran past the end of the table it was reading,
  // so this one was recorded as having a column it did not have.
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  // Per-connection health (0062). See store/connection-health.ts: status is
  // DERIVED from these, never stored, because no vendor here sends a webhook
  // that would make a stored lifecycle a fact rather than a cache.
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
  lastErrorClass: text('last_error_class'),
  consecutiveFailures: integer('consecutive_failures').notNull().default(0),
  disabled: boolean('disabled').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Chain wallets — many per user, one row per (user, chain, address).
// lastBalanceUsd is updated by POST /api/chain-wallets/sync using live chain data + Coinbase spot prices.
export const chainWallets = pgTable(
  'chain_wallets',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    chain: text('chain').notNull(),
    address: text('address').notNull(),
    label: text('label'),
    lastBalanceUsd: numeric('last_balance_usd'),
    // The staked portion OF lastBalanceUsd, not additional to it (0059). NULL
    // means unknown: nine of the eleven chain clients cannot read staking, and
    // a failed staking call must not read as "stakes nothing".
    lastStakedUsd: numeric('last_staked_usd'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    // Per-connection health (0062). See store/connection-health.ts: status is
    // DERIVED from these, never stored, because no vendor here sends a webhook
    // that would make a stored lifecycle a fact rather than a cache.
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
    lastErrorClass: text('last_error_class'),
    consecutiveFailures: integer('consecutive_failures').notNull().default(0),
    disabled: boolean('disabled').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('chain_wallets_user_chain_address_idx').on(t.userId, t.chain, t.address)],
);

// Hyperliquid perp accounts — many per user, one row per EVM address.
// lastAccountValueUsd is updated by POST /api/hyperliquid/sync (already USD-denominated).
export const hyperliquidAccounts = pgTable(
  'hyperliquid_accounts',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    address: text('address').notNull(),
    label: text('label'),
    lastAccountValueUsd: numeric('last_account_value_usd'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    // Per-connection health (0062). See store/connection-health.ts: status is
    // DERIVED from these, never stored, because no vendor here sends a webhook
    // that would make a stored lifecycle a fact rather than a cache.
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
    lastErrorClass: text('last_error_class'),
    consecutiveFailures: integer('consecutive_failures').notNull().default(0),
    disabled: boolean('disabled').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('hyperliquid_accounts_user_address_idx').on(t.userId, t.address)],
);

// Real estate assets — many per user, one row per (user, address).
// lastValueUsd is updated by POST /api/real-estate/sync using RentCast AVM.
export const realEstateAssets = pgTable(
  'real_estate_assets',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    address: text('address').notNull(),
    label: text('label'),
    lastValueUsd: numeric('last_value_usd'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    // DR-21's derived tier (0056): purchase price tracked by the FHFA house
    // price index, which needs no credential and no maintenance. A historical
    // fact, so it never goes stale. RentCast returns the same figure as
    // `lastSalePrice`, so this can later be filled without asking the user.
    purchasePriceUsd: numeric('purchase_price_usd'),
    purchaseDate: date('purchase_date'),
    // Which method produced lastValueUsd: 'avm' | 'derived' | null. Stored, not
    // inferred: an AVM is an opinion about THIS house, a derived figure is what
    // a typical US home bought at that price on that date would be worth now,
    // and R-8.1 requires that a number never be presented as something it is not.
    valuationSource: text('valuation_source').$type<'avm' | 'derived'>(),
    // RentCast's own confidence interval (0060). Null means the vendor sent
    // none; it is never inferred from the estimate.
    priceRangeLowUsd: numeric('price_range_low_usd'),
    priceRangeHighUsd: numeric('price_range_high_usd'),
    // The last recorded sale, which RentCast returns alongside the estimate.
    // This is DR-21's derived-valuation input arriving for free.
    lastSalePriceUsd: numeric('last_sale_price_usd'),
    lastSaleDate: date('last_sale_date'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('real_estate_assets_user_address_idx').on(t.userId, t.address)],
);

// Vehicle assets — many per user, one row per (user, vin).
// lastValueUsd is updated by POST /api/vehicles/sync using MarketCheck.
export const vehicleAssets = pgTable(
  'vehicle_assets',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    vin: text('vin').notNull(),
    label: text('label'),
    lastValueUsd: numeric('last_value_usd'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    // NHTSA vPIC decode, cached at add time (0055). A VIN decodes to the same
    // answer forever, so this is one free call per vehicle, not per read.
    // All nullable: vPIC is enrichment, never a gate on recording a car.
    make: text('make'),
    model: text('model'),
    modelYear: integer('model_year'),
    trim: text('trim'),
    bodyClass: text('body_class'),
    vinDecodeErrorCode: text('vin_decode_error_code'),
    // null = never decoded, false = vPIC found no make/year, so the sync skips
    // it rather than spending one of MarketCheck's 500 free monthly calls.
    vinUsable: boolean('vin_usable'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('vehicle_assets_user_vin_idx').on(t.userId, t.vin)],
);

// Metal holdings — many per user, one row per holding (user can have multiple gold entries at different weights).
// lastValueUsd is updated by POST /api/metals/sync: price per oz × weight_oz.
export const metalHoldings = pgTable('metal_holdings', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  metal: text('metal').notNull(),
  weightOz: numeric('weight_oz').notNull(),
  label: text('label'),
  lastValueUsd: numeric('last_value_usd'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  // When the vendor says the quote was struck (0058). The freshness system
  // reads this in preference to lastSyncedAt, which is only our fetch time.
  // Null falls back to lastSyncedAt: pre-0058 rows behave exactly as before.
  priceAsOf: timestamp('price_as_of', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// YNAB connections — one per user. Migrated to OAuth 2.0 PKCE; apiKey kept nullable for legacy PAT users.
// accessToken / refreshToken are AES-256-GCM encrypted. tokenExpiresAt drives auto-refresh (5-min buffer).
export const ynabConnections = pgTable('ynab_connections', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  apiKey: text('api_key'), // legacy personal access token (nullable after OAuth migration)
  accessToken: text('access_token'), // AES-256-GCM encrypted OAuth access token
  refreshToken: text('refresh_token'), // AES-256-GCM encrypted OAuth refresh token
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
  lastNetWorthUsd: numeric('last_net_worth_usd'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  // Per-connection health (0062). See store/connection-health.ts: status is
  // DERIVED from these, never stored, because no vendor here sends a webhook
  // that would make a stored lifecycle a fact rather than a cache.
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
  lastErrorClass: text('last_error_class'),
  consecutiveFailures: integer('consecutive_failures').notNull().default(0),
  disabled: boolean('disabled').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Kraken CEX connections — one per user; apiKey and privateKey are AES-256-GCM encrypted.
export const krakenConnections = pgTable('kraken_connections', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  apiKey: text('api_key').notNull(), // encrypted
  privateKey: text('private_key').notNull(), // encrypted
  lastTotalUsd: numeric('last_total_usd'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  // Per-connection health (0062). See store/connection-health.ts: status is
  // DERIVED from these, never stored, because no vendor here sends a webhook
  // that would make a stored lifecycle a fact rather than a cache.
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
  lastErrorClass: text('last_error_class'),
  consecutiveFailures: integer('consecutive_failures').notNull().default(0),
  disabled: boolean('disabled').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Discogs connections — one per user; accessToken and accessTokenSecret are AES-256-GCM encrypted.
export const discogsConnections = pgTable('discogs_connections', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  username: text('username').notNull(),
  accessToken: text('access_token').notNull(), // encrypted
  accessTokenSecret: text('access_token_secret').notNull(), // encrypted
  lastCollectionUsd: numeric('last_collection_usd'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  // Per-connection health (0062). See store/connection-health.ts: status is
  // DERIVED from these, never stored, because no vendor here sends a webhook
  // that would make a stored lifecycle a fact rather than a cache.
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
  lastErrorClass: text('last_error_class'),
  consecutiveFailures: integer('consecutive_failures').notNull().default(0),
  disabled: boolean('disabled').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Kalshi prediction market connections — one per user; privateKeyBase64 is AES-256-GCM encrypted.
export const kalshiConnections = pgTable('kalshi_connections', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  keyId: text('key_id').notNull(),
  privateKeyBase64: text('private_key_base64').notNull(), // encrypted
  lastPortfolioUsd: numeric('last_portfolio_usd'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  // Per-connection health (0062). See store/connection-health.ts: status is
  // DERIVED from these, never stored, because no vendor here sends a webhook
  // that would make a stored lifecycle a fact rather than a cache.
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
  lastErrorClass: text('last_error_class'),
  consecutiveFailures: integer('consecutive_failures').notNull().default(0),
  disabled: boolean('disabled').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Temporary storage for the Discogs OAuth request token secret while awaiting user authorization.
export const discogsPending = pgTable('discogs_pending', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  oauthToken: text('oauth_token').notNull(),
  oauthTokenSecret: text('oauth_token_secret').notNull(), // encrypted
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Plaid recurring streams — upserted on RECURRING_TRANSACTIONS_UPDATE webhook.
// merchant_name and description are AES-256-GCM encrypted at write (0048):
// they are the same merchant PII as transactions.merchant_name, and no SQL
// query filters or groups on either (reads are per-user selects filtered in
// Node). Amount columns stay numeric, same rationale as `transactions`.
export const plaidRecurringStreams = pgTable('plaid_recurring_streams', {
  streamId: text('stream_id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  direction: text('direction').notNull(), // 'inflow' | 'outflow'
  merchantName: text('merchant_name'), // AES-256-GCM encrypted
  description: text('description').notNull(), // AES-256-GCM encrypted
  frequency: text('frequency').notNull(),
  averageAmount: numeric('average_amount'),
  lastAmount: numeric('last_amount'),
  lastDate: text('last_date'),
  isActive: boolean('is_active').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Plaid liability cache — upserted on LIABILITIES/DEFAULT_UPDATE webhook.
// Net-worth reads from here instead of making a live Plaid call on every request.
export const plaidLiabilityCache = pgTable('plaid_liability_cache', {
  accountId: text('account_id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountType: text('account_type').notNull(), // 'credit' | 'mortgage' | 'student'
  minPayment: numeric('min_payment'),
  nextDueDate: text('next_due_date'),
  lastStatementBalance: numeric('last_statement_balance'),
  isOverdue: boolean('is_overdue'),
  primaryApr: numeric('primary_apr'),
  expectedPayoffDate: text('expected_payoff_date'),
  repaymentPlanType: text('repayment_plan_type'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
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

// Alpaca brokerage — one per user; stores encrypted user-supplied API key + secret.
// env: 'paper' | 'live' controls which Alpaca base URL to use.
// lastEquityUsd is total account equity (cash + long positions - short exposure).
export const alpacaConnections = pgTable('alpaca_connections', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  apiKeyId: text('api_key_id').notNull(),
  apiSecretKey: text('api_secret_key').notNull(),
  env: text('env').notNull().default('paper'), // 'paper' | 'live'
  lastEquityUsd: numeric('last_equity_usd'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  // Per-connection health (0062). See store/connection-health.ts: status is
  // DERIVED from these, never stored, because no vendor here sends a webhook
  // that would make a stored lifecycle a fact rather than a cache.
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
  lastErrorClass: text('last_error_class'),
  consecutiveFailures: integer('consecutive_failures').notNull().default(0),
  disabled: boolean('disabled').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// NFT wallets — many per user, one row per Ethereum wallet address.
// lastValueUsd is updated by POST /api/nft/sync using Alchemy NFT API v3 floor prices + ETH-USD spot price.
export const nftWallets = pgTable(
  'nft_wallets',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    address: text('address').notNull(),
    label: text('label'),
    lastValueUsd: numeric('last_value_usd'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    // Per-connection health (0062). See store/connection-health.ts: status is
    // DERIVED from these, never stored, because no vendor here sends a webhook
    // that would make a stored lifecycle a fact rather than a cache.
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
    lastErrorClass: text('last_error_class'),
    consecutiveFailures: integer('consecutive_failures').notNull().default(0),
    disabled: boolean('disabled').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('nft_wallets_user_address_idx').on(t.userId, t.address)],
);

// Manual assets — self-reported value for assets with no automated pricing API.
// Categories: art, life_insurance, luxury_handbags, watches, wine, annuities,
// pension, mineral_rights, intellectual_property, fractional_collectibles,
// crowdfunded_equity, timeshare, aircraft, other.
export const manualAssets = pgTable('manual_assets', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: text('category').notNull(),
  selfReportedValueUsd: numeric('self_reported_value_usd').notNull(),
  notes: text('notes'),
  lastUpdatedAt: timestamp('last_updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Declared assets: the onboarding "what do you have / roughly how much" sheet
// (prd.md R-5.3). One row per declared line, at most one line per asset class
// per user. Values are the log-slider's bucketed magnitudes (two significant
// digits), always stored as positive numbers; whether a class subtracts from
// net worth (credit_cards, student_loans) is a property of the class, not the
// sign of the stored value. bucketedValueUsd null means "has it, skipped the
// amount". declaredAt is when the line was first declared; refreshedAt moves
// every time the user re-confirms or edits the value, and is what the R-5.4
// nudge ("your car estimate is 2 months old") is computed from. Declared
// values are never auto-refreshed and never excluded for age (R-8.2): the
// user is the source, so there is no fresher upstream to prefer.
export const declaredAssets = pgTable(
  'declared_assets',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    assetClass: text('asset_class').notNull(),
    bucketedValueUsd: numeric('bucketed_value_usd'),
    confidence: text('confidence').notNull().default('declared'),
    declaredAt: timestamp('declared_at', { withTimezone: true }).notNull(),
    refreshedAt: timestamp('refreshed_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('declared_assets_user_class_idx').on(t.userId, t.assetClass)],
);

// TrueLayer Open Banking connections — one per user; covers UK + EU banks.
// accessToken / refreshToken are AES-256-GCM encrypted.
// lastBalanceGbp caches the most-recently synced total (column name kept for compat);
// the stored value is true USD after FX conversion via Frankfurter.
export const truelayerConnections = pgTable('truelayer_connections', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  accessToken: text('access_token').notNull(), // AES-256-GCM encrypted
  refreshToken: text('refresh_token').notNull(), // AES-256-GCM encrypted
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  lastBalanceGbp: numeric('last_balance_gbp'), // value is USD post-conversion
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  // Per-connection health (0062). See store/connection-health.ts: status is
  // DERIVED from these, never stored, because no vendor here sends a webhook
  // that would make a stored lifecycle a fact rather than a cache.
  lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
  lastErrorClass: text('last_error_class'),
  consecutiveFailures: integer('consecutive_failures').notNull().default(0),
  disabled: boolean('disabled').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Polymarket prediction market accounts — many per user, one row per Polygon wallet address.
// lastValueUsd is updated by POST /api/polymarket/sync using live currentValue from Data API.
export const polymarketAccounts = pgTable(
  'polymarket_accounts',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    walletAddress: text('wallet_address').notNull(),
    label: text('label'),
    lastValueUsd: numeric('last_value_usd'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    // Per-connection health (0062). See store/connection-health.ts: status is
    // DERIVED from these, never stored, because no vendor here sends a webhook
    // that would make a stored lifecycle a fact rather than a cache.
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
    lastErrorClass: text('last_error_class'),
    consecutiveFailures: integer('consecutive_failures').notNull().default(0),
    disabled: boolean('disabled').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('polymarket_accounts_user_address_idx').on(t.userId, t.walletAddress)],
);

// Sneaker holdings — valued via KicksDB (StockX + GOAT pricing).
// SKU identifies the model (e.g. "DZ5485-612"). Size is optional — if set,
// sync will fetch the specific size's lowest ask; otherwise uses the product min_price.
export const tradingCardHoldings = pgTable('trading_card_holdings', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  game: text('game').notNull(), // e.g. 'pokemon', 'magic', 'yugioh'
  // Product image URL from the pricing vendor (0057). Belongs to the product,
  // not the holding, so it is written on sync and never refetched.
  imageUrl: text('image_url'),

  cardName: text('card_name').notNull(),
  setName: text('set_name'),
  isFoil: boolean('is_foil').notNull().default(false),
  quantity: integer('quantity').notNull().default(1),
  label: text('label'),
  lastPriceUsd: numeric('last_price_usd'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const coinHoldings = pgTable('coin_holdings', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  pcgsNo: integer('pcgs_no').notNull(),
  // Product image URL from the pricing vendor (0057). Belongs to the product,
  // not the holding, so it is written on sync and never refetched.
  imageUrl: text('image_url'),

  gradeNo: integer('grade_no').notNull(),
  plusGrade: boolean('plus_grade').notNull().default(false),
  quantity: integer('quantity').notNull().default(1),
  coinName: text('coin_name'),
  label: text('label'),
  lastPriceGuideUsd: numeric('last_price_guide_usd'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const sneakerHoldings = pgTable('sneaker_holdings', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  sku: text('sku').notNull(),
  // Product image URL from the pricing vendor (0057). Belongs to the product,
  // not the holding, so it is written on sync and never refetched.
  imageUrl: text('image_url'),

  description: text('description'),
  size: text('size'),
  quantity: integer('quantity').notNull().default(1),
  lastPriceUsd: numeric('last_price_usd'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Pokémon card holdings — valued via PokemonPriceTracker (TCGPlayer-sourced).
// variant matches a printing type (e.g. "Holofoil", "Reverse Holofoil", "Normal").
// lastPriceUsd is the market price for one card; valueUsd = lastPriceUsd × quantity.
export const pokemonCardHoldings = pgTable('pokemon_card_holdings', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  cardName: text('card_name').notNull(),
  setName: text('set_name'),
  variant: text('variant'),
  // Product image URL from the pricing vendor (0057). Belongs to the product,
  // not the holding, so it is written on sync and never refetched.
  imageUrl: text('image_url'),

  quantity: integer('quantity').notNull().default(1),
  label: text('label'),
  lastPriceUsd: numeric('last_price_usd'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Energy positions — commodity holdings valued via EIA Open Data spot prices.
// commodity: 'wti_crude' | 'brent_crude' | 'natural_gas'
// quantityUnit: 'barrel' | 'mmbtu'
export const energyPositions = pgTable('energy_positions', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  commodity: text('commodity').notNull(),
  quantityUnit: text('quantity_unit').notNull(),
  quantity: numeric('quantity').notNull(),
  label: text('label'),
  lastSpotPriceUsd: numeric('last_spot_price_usd'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Farmland parcels — valued via USDA NASS Quick Stats land value surveys.
// stateCode: 2-letter US state abbreviation (e.g. 'IA', 'KS', 'TX')
export const farmlandParcels = pgTable('farmland_parcels', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  stateCode: text('state_code').notNull(),
  acres: numeric('acres').notNull(),
  label: text('label'),
  lastPricePerAcreUsd: numeric('last_price_per_acre_usd'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Push notification ledger. Exists so the notification budget in
// reactions/dispatch.ts is enforceable across restarts and instances rather
// than best-effort in memory. One row per push actually sent.
//
// Deliberately stores only the event type, never the reaction reason, which
// contains merchant names and amounts (see .claude/rules/security.md #2).
export const notificationLog = pgTable(
  'notification_log',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    eventType: text('event_type').notNull(),
    sentAt: timestamp('sent_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('notification_log_user_sent_idx').on(t.userId, t.sentAt)],
);

// Per-account Plaid balance cache (prd.md R-16.4). Fed by every
// /transactions/sync webhook (the `accounts` array Plaid sends with each sync)
// and by the explicit refresh path. The DB-only net-worth read serves bank
// balances from here; `as_of` is the honest freshness timestamp per account.
export const plaidAccountBalances = pgTable(
  'plaid_account_balances',
  {
    accountId: text('account_id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    itemId: text('item_id').notNull(),
    name: text('name').notNull(),
    type: text('type').notNull(),
    subtype: text('subtype'),
    balance: numeric('balance'),
    asOf: timestamp('as_of', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('plaid_account_balances_user_idx').on(t.userId), index('plaid_account_balances_item_idx').on(t.itemId)],
);

// Per-(user, class) cache for the asset classes that used to be fetched live
// inside GET /api/net-worth (prd.md R-16.1): investments, crypto (Coinbase),
// defi (Zerion), debts (Spinwheel), plus bookkeeping for `bank` (whose values
// live in plaid_account_balances). A successful refresh writes value/asOf/
// payload and resets the failure counters; a failed refresh keeps the last
// good value and records the failure so the read path can answer `error`
// instead of a silent zero (prd.md R-8.1). `payload` carries class detail
// (holdings, positions, debt items) for the response's `accounts` sub-object.
export const assetClassCache = pgTable(
  'asset_class_cache',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    assetClass: text('asset_class').notNull(),
    valueUsd: numeric('value_usd'),
    asOf: timestamp('as_of', { withTimezone: true }),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
    lastErrorClass: text('last_error_class'),
    consecutiveFailures: integer('consecutive_failures').notNull().default(0),
    // The user-drivable Plaid balance pull is billed per call; capped 4/day
    // (engineering-budgets.md section 2). Tracked on the `bank` row.
    manualRefreshDate: date('manual_refresh_date'),
    manualRefreshCount: integer('manual_refresh_count').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.userId, t.assetClass] })],
);

// ---------------------------------------------------------------------------
// Goal system (docs/prd-app-v2.md §3). The four goal columns on `pet_state`
// (weeklyBudgetByCategory, savingsGoal, paycheckMinAmount, largePurchaseThreshold)
// are superseded by these tables. Keep them read-only for one release so the
// shipped iOS build keeps working, then drop.
// ---------------------------------------------------------------------------

// Daily net worth snapshot. The single highest-priority gap in the schema: every
// on-pace calculation, projection and trend depends on a time series, and only a
// scalar (`pet_state.last_net_worth_usd`) existed before this.
//
// `byClass` holds the per-asset-class breakdown so a later change to the class
// list does not require a migration, and so "you vs the market" can decompose a
// change into contributions versus price movement.
export const netWorthDaily = pgTable(
  'net_worth_daily',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    date: date('date').notNull(),
    totalUsd: numeric('total_usd').notNull(),
    byClass: jsonb('by_class').$type<Record<string, number>>().notNull().default({}),
    currency: text('currency').notNull().default('USD'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.date] })],
);

// Layer 0: the derived financial substrate every goal reads from. Recomputed on a
// schedule rather than per request, and versioned so a change to the computation
// can be detected and backfilled instead of silently altering history.
export const derivedState = pgTable('derived_state', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  takeHomeMonthly: numeric('take_home_monthly'),
  incomeVolatility: numeric('income_volatility'),
  essentialMonthly: numeric('essential_monthly'),
  discretionaryMonthly: numeric('discretionary_monthly'),
  liquidCash: numeric('liquid_cash'),
  runwayMonths: numeric('runway_months'),
  savingsRate: numeric('savings_rate'),
  computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
  computeVersion: integer('compute_version').notNull().default(1),
});

// Layer 1: the foundation ladder. `rungs` is keyed by rung number ("0".."7") with
// `{ status, completedAt, skippedReason }`. Status is one of:
//   pending | active | completed | not_applicable | skipped
//
// Rungs never un-complete: a user who clears rung 3 and later takes on new
// high-APR debt keeps the completion (and the creature's stage), while the rung
// reopens as an active task. Progress is permanent, problems are current.
export const ladderState = pgTable('ladder_state', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  currentRung: integer('current_rung').notNull().default(0),
  // Typed against the domain model so a status string that is not a valid
  // RungStatus cannot be written. `ladder.ts` imports nothing from here, so this
  // direction of dependency is safe.
  rungs: jsonb('rungs').$type<Record<string, RungState>>().notNull().default({}),
  // The LadderContext the last refresh evaluated. Persisted so read paths
  // (GET /api/pets) can report the active rung's live progress, target and gap
  // without re-running the Plaid fan-out, and so a declaration change can
  // re-evaluate the ladder against the freshest known financial inputs.
  inputs: jsonb('inputs').$type<LadderContext>(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// User-declared ladder targets. Only the two adjustable rates live here.
// Employer match deliberately has NO storage or intake anywhere: whether rung 2
// stays declared, becomes not-applicable, or is removed is an open product
// decision, and the refresh path feeds `employerMatch: 'unknown'`, which the
// engine treats as indeterminate, never as satisfied.
export const userDeclarations = pgTable('user_declarations', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  // Rung 5 target rate override, 0 to 1. Null means use DEFAULT_SHELTERED_RATE.
  shelteredTargetRate: numeric('sheltered_target_rate'),
  // Rung 6 savings-rate target override, 0 to 1. Null means SURPLUS_SAVINGS_RATE.
  surplusTargetRate: numeric('surplus_target_rate'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// Layer 2: user-defined target goals. Capped at 3 active per user, enforced in the
// store layer rather than by constraint so the cap can be raised per plan tier.
export const goals = pgTable(
  'goals',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    emoji: text('emoji'),
    kind: text('kind').notNull(), // save | payoff | purchase
    targetAmountUsd: numeric('target_amount_usd').notNull(),
    targetDate: date('target_date'),
    fundingAccountId: text('funding_account_id'),
    countsExistingBalance: boolean('counts_existing_balance').notNull().default(true),
    // { type: 'recurring'|'roundup'|'manual', amount, cadence, dayOfMonth }
    contributionRule: jsonb('contribution_rule').$type<Record<string, unknown>>(),
    recurringAnnual: boolean('recurring_annual').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    achievedAt: timestamp('achieved_at', { withTimezone: true }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (t) => [index('goals_user_idx').on(t.userId)],
);

// Layer 3: habit guardrails, one row per guardrail per period. Streaks are derived
// from consecutive `passed` outcomes rather than stored, so a corrected outcome
// cannot leave a streak counter wrong.
//
// `repairUsed` records a forgiving-streak repair. Missing a period costs the
// streak, never the creature.
export const goalPeriods = pgTable(
  'goal_periods',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    guardrailKey: text('guardrail_key').notNull(),
    periodStart: date('period_start').notNull(),
    periodEnd: date('period_end').notNull(),
    outcome: text('outcome').notNull(), // passed | missed | pending | not_applicable
    targetValue: numeric('target_value'),
    actualValue: numeric('actual_value'),
    repairUsed: boolean('repair_used').notNull().default(false),
    evaluatedAt: timestamp('evaluated_at', { withTimezone: true }),
  },
  (t) => [uniqueIndex('goal_periods_user_key_start_idx').on(t.userId, t.guardrailKey, t.periodStart)],
);

// ---------------------------------------------------------------------------
// Subscription entitlements (docs/prd.md §25). The server is the authority on
// whether a user has paid; the iOS client reports Apple's signed transaction
// JWS and the App Store Server Notifications V2 webhook keeps this in sync
// with renewals, billing retries, grace periods and refunds.
// ---------------------------------------------------------------------------

// One row per user. `appAccountToken` is minted server-side (crypto.randomUUID)
// on first read and passed to StoreKit as Product.PurchaseOption.appAccountToken,
// so server notifications can be matched back to a user even when the purchase
// completed while the app was backgrounded and the client never phoned home.
//
// `tier`/`status` record the last known Apple-side state; whether the user is
// currently entitled is always computed by resolveEntitlement() against the
// clock, never trusted from a stored boolean.
export const entitlements = pgTable(
  'entitlements',
  {
    userId: text('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    appAccountToken: text('app_account_token').notNull(),
    tier: text('tier').notNull().default('free'), // free | individual | household
    status: text('status').notNull().default('none'), // none | active | grace | billing_retry | expired | revoked
    productId: text('product_id'),
    // Apple's stable subscription identifier. Bound to exactly one Coiny user;
    // a second user presenting the same subscription is rejected (409).
    originalTransactionId: text('original_transaction_id'),
    environment: text('environment'), // Sandbox | Production, as reported by Apple
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    graceExpiresAt: timestamp('grace_expires_at', { withTimezone: true }),
    autoRenew: boolean('auto_renew').notNull().default(false),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('entitlements_app_account_token_idx').on(t.appAccountToken),
    uniqueIndex('entitlements_original_transaction_idx').on(t.originalTransactionId),
  ],
);

// Household membership. The owner is the purchaser of the household tier; a
// member inherits `household` entitlement while the owner's subscription
// resolves to household. Capped at 5 people INCLUDING the owner (so at most 4
// rows per owner), enforced in the store layer. A user can belong to at most
// one household. The invite/consent flow is deliberately unbuilt: shipping the
// tier requires the lawyer-reviewed two-party consent flow (obligations §2).
export const householdMembers = pgTable(
  'household_members',
  {
    id: serial('id').primaryKey(),
    ownerUserId: text('owner_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    memberUserId: text('member_user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex('household_members_member_idx').on(t.memberUserId),
    index('household_members_owner_idx').on(t.ownerUserId),
  ],
);

// Idempotency ledger for App Store Server Notifications V2. Apple retries
// delivery, so each notificationUUID is processed at most once.
export const appStoreNotifications = pgTable('app_store_notifications', {
  notificationUuid: text('notification_uuid').primaryKey(),
  notificationType: text('notification_type').notNull(),
  subtype: text('subtype'),
  originalTransactionId: text('original_transaction_id'),
  receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
});

// The creature's progression. Stage is driven by the ladder and NEVER regresses.
// Vitality and rest are computed, not stored, because they are derived from the
// current period's guardrails and should never be stale.
export const petProgression = pgTable('pet_progression', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  stage: integer('stage').notNull().default(0),
  stageEnteredAt: timestamp('stage_entered_at', { withTimezone: true }).notNull().defaultNow(),
  unlockedArtifacts: jsonb('unlocked_artifacts').$type<string[]>().notNull().default([]),
});

// First-party analytics events (docs/prd.md R-24.1, engineering-budgets §8).
// Append-only; retention cohorts cannot be backfilled, so nothing ever updates
// a row. Properties hold ONLY the whitelisted categorical/bucketed values from
// src/analytics/events.ts: no amounts, no merchant names, no PII (R-22.6).
// Rows cascade on user deletion so account deletion wipes the trail.
// Operational events: what broke, when, and how often. Not analytics.
//
// The distinction is the reason this table exists rather than reusing
// `analytics_events`, and it is worth stating precisely because the two look
// similar from a distance.
//
//   `analytics_events` is data ABOUT A PERSON. It is scoped by `user_id`, it is
//   consent-gated (`trackServerEvent` writes zero rows for a user who turned
//   usage sharing off), and it answers product questions.
//
//   This is data about a VENDOR OR A TASK. It has no `user_id` at all, it is
//   not consent-gated, and it answers "is the number on someone's screen
//   currently trustworthy".
//
// Those properties are load-bearing in both directions. A vendor being down is
// not a fact about any individual, so gating it on an individual's analytics
// preference would be incoherent: one user opting out would blind us to an
// outage affecting everyone. And precisely because it must not be gated, it
// must carry nothing personal, which is why there is no user column to be
// tempted by. `docs/connection-resilience-survey.md` section A2 makes the
// related point that a counter cannot be alerted on and a history can.
//
// `detail` is counts, codes and identifiers of NON-PERSONAL things (an asset
// class, a task name, a vendor hostname). Never a balance, never an address,
// never an institution. The redaction policy in plugins/logger.ts is the
// standard; this table has the stricter one, because rows here outlive a log
// line.
export const opsEvents = pgTable(
  'ops_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    at: timestamp('at', { withTimezone: true }).notNull().defaultNow(),
    /** 'warn' is degraded but serving; 'error' is a failure someone should look
     *  at. Deliberately two values: a level nobody acts on differently is a
     *  level nobody reads. */
    severity: text('severity').$type<'warn' | 'error'>().notNull(),
    /** What kind of thing happened, from a closed set in store/ops.ts, so the
     *  health rollup can group without parsing prose. */
    kind: text('kind').notNull(),
    /** Vendor hostname where known (the retry budget's key), else null. Public
     *  information: every one of these is named in the privacy policy. */
    vendor: text('vendor'),
    /** Programmatic error class only, never a vendor's message. Same rule as
     *  the `err` serializer in plugins/logger.ts. */
    errorClass: text('error_class'),
    detail: jsonb('detail').$type<Record<string, unknown>>().notNull().default({}),
  },
  (t) => [index('ops_events_at_idx').on(t.at), index('ops_events_vendor_at_idx').on(t.vendor, t.at)],
);

export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    event: text('event').notNull(),
    properties: jsonb('properties').$type<Record<string, unknown>>().notNull().default({}),
    // Device clock at emission; informational only. Retention math uses server_ts.
    clientTs: timestamp('client_ts', { withTimezone: true }),
    serverTs: timestamp('server_ts', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('analytics_events_user_idx').on(t.userId),
    index('analytics_events_event_server_ts_idx').on(t.event, t.serverTs),
  ],
);

// Nightly-computed pace per target goal (docs/prd.md R-7.8), one row per goal,
// upserted by the goal-system refresh so read paths serve pace without a Plaid
// fan-out (the same pattern as ladder_state.inputs). Every column except the
// timestamps is nullable ON PURPOSE: null means "we do not know" (no target
// date, unknown balance, under 30 days of contribution history) and must never
// be rendered as zero or as "Off pace". Migration 0042.
export const goalPace = pgTable(
  'goal_pace',
  {
    goalId: integer('goal_id')
      .primaryKey()
      .references(() => goals.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    currentAmountUsd: numeric('current_amount_usd'),
    monthsRemaining: numeric('months_remaining'),
    requiredRunRateUsd: numeric('required_run_rate_usd'),
    actualRunRateUsd: numeric('actual_run_rate_usd'),
    contributionHistoryDays: integer('contribution_history_days'),
    pace: numeric('pace'),
    // ahead | on_pace | behind | off_pace, null while pace is unknowable.
    paceBand: text('pace_band'),
    // { type: 'add_monthly', amountUsd } | { type: 'push_date', weeks }
    gapAction: jsonb('gap_action').$type<
      { type: 'add_monthly'; amountUsd: number } | { type: 'push_date'; weeks: number }
    >(),
    computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('goal_pace_user_idx').on(t.userId)],
);

// ---------------------------------------------------------------------------
// Debt layer (docs/prd.md R-7.13, R-7.14). Migration 0044.
//
// Plaid Liabilities and Spinwheel both report debt; without dedupe a user who
// connects both sees every shared card twice. `debt_source_accounts` holds the
// normalized per-source rows, `debt_accounts` holds one row per real-world
// debt, and `debt_merge_decisions` records the user's manual "same account" /
// "not the same" verdicts so they survive every automatic rebuild.
// ---------------------------------------------------------------------------

// Normalized per-source debt rows. Replaced wholesale per (user, source) on
// each sync, then `rebuildDebtAccounts` re-derives the merged records. Kept
// separate from the merged table so a manual unmerge can be honoured without
// re-fetching either provider.
export const debtSourceAccounts = pgTable(
  'debt_source_accounts',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    source: text('source').notNull(), // 'plaid' | 'spinwheel'
    sourceAccountId: text('source_account_id').notNull(),
    issuer: text('issuer'),
    normalizedIssuer: text('normalized_issuer'),
    last4: text('last4'),
    openDate: text('open_date'), // YYYY-MM-DD
    type: text('type').notNull(), // credit_card | student_loan | mortgage | auto_loan | personal_loan | loan | other
    balance: numeric('balance'),
    apr: numeric('apr'), // percent, 18 means 18%
    minPayment: numeric('min_payment'),
    creditLimit: numeric('credit_limit'),
    dueDate: text('due_date'), // YYYY-MM-DD
    accountStatus: text('account_status'), // 'open' | 'closed' | 'delinquent'
    syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('debt_source_accounts_user_source_account_idx').on(t.userId, t.source, t.sourceAccountId)],
);

// One row per real-world debt (R-7.13). Derived from debt_source_accounts by
// the match key (normalized_issuer, last4 or open_date, credit_limit) plus the
// user's merge decisions. Source precedence is asymmetric on purpose: Plaid
// wins on balance (more current), Spinwheel wins on APR and credit limit
// (bureau data more complete).
//
// `aprOverride`, `nickname`, `statementCloseDay` and the promo fields are
// user-owned and preserved across rebuilds; everything else is recomputed.
export const debtAccounts = pgTable(
  'debt_accounts',
  {
    debtId: text('debt_id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    issuer: text('issuer').notNull(),
    nickname: text('nickname'),
    type: text('type').notNull(),
    sourceIds: jsonb('source_ids').$type<string[]>().notNull().default([]), // 'plaid:<account_id>' | 'spinwheel:<debt_id>'
    balance: numeric('balance'),
    apr: numeric('apr'), // percent; resolved as aprOverride ?? spinwheel ?? plaid; null means unknown, never zero
    aprOverride: numeric('apr_override'), // user-declared rate for accounts no source reports a rate for
    minPayment: numeric('min_payment'),
    creditLimit: numeric('credit_limit'),
    dueDay: integer('due_day'), // 1-31
    statementCloseDay: integer('statement_close_day'), // 1-31; the one manual input (R-7.17)
    isPromotional: boolean('is_promotional').notNull().default(false),
    promoEndDate: text('promo_end_date'), // YYYY-MM-DD
    promoApr: numeric('promo_apr'), // percent
    status: text('status').notNull().default('open'), // 'open' | 'delinquent' | 'closed'
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('debt_accounts_user_idx').on(t.userId)],
);

// Manual merge affordance. Keys are source keys ('plaid:<id>' etc.), stored
// with sourceKeyA < sourceKeyB so each pair has one canonical row. 'same'
// forces a merge fuzzy matching missed; 'different' vetoes a merge it got
// wrong. Decisions outlive rebuilds and re-syncs.
export const debtMergeDecisions = pgTable(
  'debt_merge_decisions',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sourceKeyA: text('source_key_a').notNull(),
    sourceKeyB: text('source_key_b').notNull(),
    decision: text('decision').notNull(), // 'same' | 'different'
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('debt_merge_decisions_user_pair_idx').on(t.userId, t.sourceKeyA, t.sourceKeyB)],
);

// Payoff strategy selection (R-7.14). Default is Blend; the pure strategies
// are one tap away and the dollar cost of the choice is always computed, so
// only the selection and the extra payment need storage.
export const debtPlanSettings = pgTable('debt_plan_settings', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  strategy: text('strategy').notNull().default('blend'), // 'blend' | 'avalanche' | 'snowball'
  extraMonthly: numeric('extra_monthly'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
