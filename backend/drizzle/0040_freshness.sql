-- Freshness for the net-worth read path (prd.md R-8.1 to R-8.4, R-16.1, R-16.4;
-- engineering-budgets.md sections 2 to 4). Hand-written, idempotent.
--
-- 1. plaid_account_balances: the per-account balance cache fed by every
--    /transactions/sync webhook. Plaid already sends `accounts` with balances on
--    each sync (paid for inside the Transactions item subscription); until now
--    the handler parsed them and dropped them at the DB boundary because no
--    column existed. This table is the DB-only read path's bank source.
--
-- 2. asset_class_cache: one row per (user, asset class) for the classes that
--    used to be fetched live inside GET /api/net-worth (investments, crypto,
--    defi, debts) plus bookkeeping for the bank class (failure counters and the
--    manual-refresh cap). `payload` carries the class detail (holdings,
--    positions, debt items) so the response's `accounts` sub-object can be
--    served from the DB too. Failure state is persisted so a failed refresh is
--    visible as `status=error` instead of a silent zero.
--
-- 3. truelayer_connections.last_synced_at: the one sync-backed table with no
--    freshness column at all (engineering-budgets.md section 2 schema gap);
--    without it the truelayer class can never carry an honest asOf.
CREATE TABLE IF NOT EXISTS "plaid_account_balances" (
	"account_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"item_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"subtype" text,
	"balance" numeric,
	"as_of" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "plaid_account_balances" ADD CONSTRAINT "plaid_account_balances_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plaid_account_balances_user_idx" ON "plaid_account_balances" ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "plaid_account_balances_item_idx" ON "plaid_account_balances" ("item_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "asset_class_cache" (
	"user_id" text NOT NULL,
	"asset_class" text NOT NULL,
	"value_usd" numeric,
	"as_of" timestamp with time zone,
	"payload" jsonb,
	"last_attempt_at" timestamp with time zone,
	"last_error_class" text,
	"consecutive_failures" integer DEFAULT 0 NOT NULL,
	"manual_refresh_date" date,
	"manual_refresh_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "asset_class_cache_user_id_asset_class_pk" PRIMARY KEY("user_id","asset_class")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "asset_class_cache" ADD CONSTRAINT "asset_class_cache_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
ALTER TABLE "truelayer_connections" ADD COLUMN IF NOT EXISTS "last_synced_at" timestamp with time zone;
