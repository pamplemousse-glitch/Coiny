-- Debt layer (docs/prd.md R-7.13, R-7.14): per-source rows, the merged
-- one-row-per-real-world-debt table, manual merge decisions, and the payoff
-- strategy selection. Written idempotently per the 0033/0034 convention.
CREATE TABLE IF NOT EXISTS "debt_source_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source" text NOT NULL,
	"source_account_id" text NOT NULL,
	"issuer" text,
	"normalized_issuer" text,
	"last4" text,
	"open_date" text,
	"type" text NOT NULL,
	"balance" numeric,
	"apr" numeric,
	"min_payment" numeric,
	"credit_limit" numeric,
	"due_date" text,
	"account_status" text,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "debt_source_accounts" ADD CONSTRAINT "debt_source_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "debt_source_accounts_user_source_account_idx" ON "debt_source_accounts" USING btree ("user_id","source","source_account_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "debt_accounts" (
	"debt_id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"issuer" text NOT NULL,
	"nickname" text,
	"type" text NOT NULL,
	"source_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"balance" numeric,
	"apr" numeric,
	"apr_override" numeric,
	"min_payment" numeric,
	"credit_limit" numeric,
	"due_day" integer,
	"statement_close_day" integer,
	"is_promotional" boolean DEFAULT false NOT NULL,
	"promo_end_date" text,
	"promo_apr" numeric,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "debt_accounts" ADD CONSTRAINT "debt_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "debt_accounts_user_idx" ON "debt_accounts" USING btree ("user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "debt_merge_decisions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"source_key_a" text NOT NULL,
	"source_key_b" text NOT NULL,
	"decision" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "debt_merge_decisions" ADD CONSTRAINT "debt_merge_decisions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "debt_merge_decisions_user_pair_idx" ON "debt_merge_decisions" USING btree ("user_id","source_key_a","source_key_b");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "debt_plan_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"strategy" text DEFAULT 'blend' NOT NULL,
	"extra_monthly" numeric,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "debt_plan_settings" ADD CONSTRAINT "debt_plan_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
