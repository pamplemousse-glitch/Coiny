-- Per-connection health, for the 13 connection tables that had none.
--
-- Survey gap 1: only plaid_items carries status, statusChangedAt, lastErrorCode
-- and disabled. Gap 2: everything else is tracked per asset CLASS, in
-- asset_class_cache, which is the right data at the wrong grain. A user with
-- three Zerion wallets, one of which has died, gets a class that reads degraded
-- with no way to say WHICH wallet needs attention, and "prompt the user to fix
-- it" is unbuildable on top of that because there is nothing specific to prompt
-- about.
--
-- The observation that shaped this migration: ELEVEN of these thirteen tables
-- already record last_synced_at, which is the time of the last SUCCESS. Not one
-- of them records anything about failure. So the asymmetry is not that health
-- is untracked, it is that only the happy half was ever written down, and a
-- value with a timestamp and no failure history cannot be distinguished from a
-- value that stopped being refreshed a month ago.
--
-- NO status COLUMN, deliberately, and this is where it departs from copying
-- plaid_items wholesale. A stored lifecycle earns its place when something
-- EXTERNAL drives the transitions: Plaid has ITEM webhooks, so `healthy ->
-- expiring -> reauth_required -> revoked` is a fact arriving from outside that
-- has to be persisted when it arrives. No other vendor here sends one. For
-- them the state is a pure function of the columns below (see
-- deriveConnectionStatus in src/store/connection-health.ts), and a derived
-- value that is stored is a value that can disagree with its own inputs.
--
-- Idempotent, per the convention 0033 established.
ALTER TABLE "coinbase_connections" ADD COLUMN IF NOT EXISTS "last_attempt_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "coinbase_connections" ADD COLUMN IF NOT EXISTS "last_error_class" text;
--> statement-breakpoint
ALTER TABLE "coinbase_connections" ADD COLUMN IF NOT EXISTS "consecutive_failures" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "coinbase_connections" ADD COLUMN IF NOT EXISTS "disabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "zerion_wallets" ADD COLUMN IF NOT EXISTS "last_attempt_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "zerion_wallets" ADD COLUMN IF NOT EXISTS "last_error_class" text;
--> statement-breakpoint
ALTER TABLE "zerion_wallets" ADD COLUMN IF NOT EXISTS "consecutive_failures" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "zerion_wallets" ADD COLUMN IF NOT EXISTS "disabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "spinwheel_connections" ADD COLUMN IF NOT EXISTS "last_attempt_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "spinwheel_connections" ADD COLUMN IF NOT EXISTS "last_error_class" text;
--> statement-breakpoint
ALTER TABLE "spinwheel_connections" ADD COLUMN IF NOT EXISTS "consecutive_failures" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "spinwheel_connections" ADD COLUMN IF NOT EXISTS "disabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "chain_wallets" ADD COLUMN IF NOT EXISTS "last_attempt_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "chain_wallets" ADD COLUMN IF NOT EXISTS "last_error_class" text;
--> statement-breakpoint
ALTER TABLE "chain_wallets" ADD COLUMN IF NOT EXISTS "consecutive_failures" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "chain_wallets" ADD COLUMN IF NOT EXISTS "disabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "hyperliquid_accounts" ADD COLUMN IF NOT EXISTS "last_attempt_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "hyperliquid_accounts" ADD COLUMN IF NOT EXISTS "last_error_class" text;
--> statement-breakpoint
ALTER TABLE "hyperliquid_accounts" ADD COLUMN IF NOT EXISTS "consecutive_failures" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "hyperliquid_accounts" ADD COLUMN IF NOT EXISTS "disabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "ynab_connections" ADD COLUMN IF NOT EXISTS "last_attempt_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "ynab_connections" ADD COLUMN IF NOT EXISTS "last_error_class" text;
--> statement-breakpoint
ALTER TABLE "ynab_connections" ADD COLUMN IF NOT EXISTS "consecutive_failures" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "ynab_connections" ADD COLUMN IF NOT EXISTS "disabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "kraken_connections" ADD COLUMN IF NOT EXISTS "last_attempt_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "kraken_connections" ADD COLUMN IF NOT EXISTS "last_error_class" text;
--> statement-breakpoint
ALTER TABLE "kraken_connections" ADD COLUMN IF NOT EXISTS "consecutive_failures" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "kraken_connections" ADD COLUMN IF NOT EXISTS "disabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "discogs_connections" ADD COLUMN IF NOT EXISTS "last_attempt_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "discogs_connections" ADD COLUMN IF NOT EXISTS "last_error_class" text;
--> statement-breakpoint
ALTER TABLE "discogs_connections" ADD COLUMN IF NOT EXISTS "consecutive_failures" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "discogs_connections" ADD COLUMN IF NOT EXISTS "disabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "kalshi_connections" ADD COLUMN IF NOT EXISTS "last_attempt_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "kalshi_connections" ADD COLUMN IF NOT EXISTS "last_error_class" text;
--> statement-breakpoint
ALTER TABLE "kalshi_connections" ADD COLUMN IF NOT EXISTS "consecutive_failures" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "kalshi_connections" ADD COLUMN IF NOT EXISTS "disabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "alpaca_connections" ADD COLUMN IF NOT EXISTS "last_attempt_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "alpaca_connections" ADD COLUMN IF NOT EXISTS "last_error_class" text;
--> statement-breakpoint
ALTER TABLE "alpaca_connections" ADD COLUMN IF NOT EXISTS "consecutive_failures" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "alpaca_connections" ADD COLUMN IF NOT EXISTS "disabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "nft_wallets" ADD COLUMN IF NOT EXISTS "last_attempt_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "nft_wallets" ADD COLUMN IF NOT EXISTS "last_error_class" text;
--> statement-breakpoint
ALTER TABLE "nft_wallets" ADD COLUMN IF NOT EXISTS "consecutive_failures" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "nft_wallets" ADD COLUMN IF NOT EXISTS "disabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "truelayer_connections" ADD COLUMN IF NOT EXISTS "last_attempt_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "truelayer_connections" ADD COLUMN IF NOT EXISTS "last_error_class" text;
--> statement-breakpoint
ALTER TABLE "truelayer_connections" ADD COLUMN IF NOT EXISTS "consecutive_failures" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "truelayer_connections" ADD COLUMN IF NOT EXISTS "disabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "polymarket_accounts" ADD COLUMN IF NOT EXISTS "last_attempt_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "polymarket_accounts" ADD COLUMN IF NOT EXISTS "last_error_class" text;
--> statement-breakpoint
ALTER TABLE "polymarket_accounts" ADD COLUMN IF NOT EXISTS "consecutive_failures" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "polymarket_accounts" ADD COLUMN IF NOT EXISTS "disabled" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
-- The two that never recorded even the happy half.
--> statement-breakpoint
ALTER TABLE "coinbase_connections" ADD COLUMN IF NOT EXISTS "last_synced_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "zerion_wallets" ADD COLUMN IF NOT EXISTS "last_synced_at" timestamp with time zone;
