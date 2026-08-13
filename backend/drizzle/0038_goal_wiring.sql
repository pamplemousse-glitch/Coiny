-- Goal-system wiring (docs/prd.md R-7.6): persisted ladder inputs so read paths
-- can report live rung progress without a Plaid fan-out, plus user-declared
-- target rates for rungs 5 and 6. No employer-match storage by founder decision:
-- the refresh path feeds 'unknown' and the rung stays indeterminate.
-- Written idempotently to match the convention established by 0033.
ALTER TABLE "ladder_state" ADD COLUMN IF NOT EXISTS "inputs" jsonb;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_declarations" (
	"user_id" text PRIMARY KEY NOT NULL,
	"sheltered_target_rate" numeric,
	"surplus_target_rate" numeric,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_declarations" ADD CONSTRAINT "user_declarations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
