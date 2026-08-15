-- Target-goal CRUD and pace (docs/prd.md R-7.7 to R-7.12). The goals and
-- goal_periods tables already exist (0035); this adds the nightly-computed pace
-- row per goal. Written idempotently to match the convention established by
-- 0033 after the stale-journal incident.
CREATE TABLE IF NOT EXISTS "goal_pace" (
	"goal_id" integer PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"current_amount_usd" numeric,
	"months_remaining" numeric,
	"required_run_rate_usd" numeric,
	"actual_run_rate_usd" numeric,
	"contribution_history_days" integer,
	"pace" numeric,
	"pace_band" text,
	"gap_action" jsonb,
	"computed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goal_pace" ADD CONSTRAINT "goal_pace_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "goal_pace" ADD CONSTRAINT "goal_pace_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "goal_pace_user_idx" ON "goal_pace" USING btree ("user_id");
