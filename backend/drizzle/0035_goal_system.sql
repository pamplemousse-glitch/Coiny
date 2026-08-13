-- Goal system tables (docs/prd-app-v2.md §3.7). Written idempotently to match the
-- convention established by 0033 after the stale-journal incident.
CREATE TABLE IF NOT EXISTS "net_worth_daily" (
	"user_id" text NOT NULL,
	"date" date NOT NULL,
	"total_usd" numeric NOT NULL,
	"by_class" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "net_worth_daily_user_id_date_pk" PRIMARY KEY("user_id","date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "derived_state" (
	"user_id" text PRIMARY KEY NOT NULL,
	"take_home_monthly" numeric,
	"income_volatility" numeric,
	"essential_monthly" numeric,
	"discretionary_monthly" numeric,
	"liquid_cash" numeric,
	"runway_months" numeric,
	"savings_rate" numeric,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"compute_version" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ladder_state" (
	"user_id" text PRIMARY KEY NOT NULL,
	"current_rung" integer DEFAULT 0 NOT NULL,
	"rungs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "goals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"emoji" text,
	"kind" text NOT NULL,
	"target_amount_usd" numeric NOT NULL,
	"target_date" date,
	"funding_account_id" text,
	"counts_existing_balance" boolean DEFAULT true NOT NULL,
	"contribution_rule" jsonb,
	"recurring_annual" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"achieved_at" timestamp with time zone,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "goal_periods" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"guardrail_key" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"outcome" text NOT NULL,
	"target_value" numeric,
	"actual_value" numeric,
	"repair_used" boolean DEFAULT false NOT NULL,
	"evaluated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "pet_progression" (
	"user_id" text PRIMARY KEY NOT NULL,
	"stage" integer DEFAULT 0 NOT NULL,
	"stage_entered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unlocked_artifacts" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "net_worth_daily" ADD CONSTRAINT "net_worth_daily_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "derived_state" ADD CONSTRAINT "derived_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ladder_state" ADD CONSTRAINT "ladder_state_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goal_periods" ADD CONSTRAINT "goal_periods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "pet_progression" ADD CONSTRAINT "pet_progression_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "goals_user_idx" ON "goals" USING btree ("user_id");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "goal_periods_user_key_start_idx" ON "goal_periods" USING btree ("user_id","guardrail_key","period_start");
