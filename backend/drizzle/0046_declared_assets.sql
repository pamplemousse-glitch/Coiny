-- Declared assets (docs/prd.md R-5.3): server persistence for the onboarding
-- "what do you have / roughly how much" sheet, one row per declared line,
-- at most one line per asset class per user. Deliberately NOT manual_assets:
-- that table's categories are wrong for onboarding and its values are
-- nonnegative-by-contract asset values, while declared lines include debt
-- classes (credit_cards, student_loans) whose magnitude subtracts from the
-- total. Written idempotently to match the convention established by 0033.
CREATE TABLE IF NOT EXISTS "declared_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"asset_class" text NOT NULL,
	"bucketed_value_usd" numeric,
	"confidence" text DEFAULT 'declared' NOT NULL,
	"declared_at" timestamp with time zone NOT NULL,
	"refreshed_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "declared_assets" ADD CONSTRAINT "declared_assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "declared_assets_user_class_idx" ON "declared_assets" USING btree ("user_id","asset_class");
