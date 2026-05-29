import {
  boolean,
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

export const plaidItems = pgTable(
  'plaid_items',
  {
    itemId: text('item_id').primaryKey(),
    userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
    accessToken: text('access_token').notNull(),
    cursor: text('cursor'),
    initialSyncComplete: boolean('initial_sync_complete').notNull().default(false),
    disabled: boolean('disabled').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('plaid_items_user_idx').on(t.userId)],
);

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
  lastCreditScore: integer('last_credit_score'),
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
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
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
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// SnapTrade connections — one per user; snaptradeUserSecret is AES-256-GCM encrypted.
// snapUserId is a copy of the Coiny user ID registered with SnapTrade.
export const snaptradeConnections = pgTable('snaptrade_connections', {
  userId: text('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  snapUserId: text('snap_user_id').notNull(),
  snapUserSecret: text('snap_user_secret').notNull(),
  lastBrokerageTotal: numeric('last_brokerage_total'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
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
export const plaidRecurringStreams = pgTable('plaid_recurring_streams', {
  streamId: text('stream_id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  accountId: text('account_id').notNull(),
  direction: text('direction').notNull(), // 'inflow' | 'outflow'
  merchantName: text('merchant_name'),
  description: text('description').notNull(),
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
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('polymarket_accounts_user_address_idx').on(t.userId, t.walletAddress)],
);

// Sneaker holdings — valued via KicksDB (StockX + GOAT pricing).
// SKU identifies the model (e.g. "DZ5485-612"). Size is optional — if set,
// sync will fetch the specific size's lowest ask; otherwise uses the product min_price.
export const sneakerHoldings = pgTable('sneaker_holdings', {
  id: serial('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  sku: text('sku').notNull(),
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
  quantity: integer('quantity').notNull().default(1),
  label: text('label'),
  lastPriceUsd: numeric('last_price_usd'),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

// Steam accounts — CS2 skin portfolio via Steam community inventory API.
// No API key required; inventory endpoint is public for public profiles.
// lastPortfolioUsd is the sum of all CS2 item market prices in USD.
export const steamAccounts = pgTable(
  'steam_accounts',
  {
    id: serial('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    steamId64: text('steam_id64').notNull(),
    label: text('label'),
    lastPortfolioUsd: numeric('last_portfolio_usd'),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex('steam_accounts_user_steam_idx').on(t.userId, t.steamId64)],
);
