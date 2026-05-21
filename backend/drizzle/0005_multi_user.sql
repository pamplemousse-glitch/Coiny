CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"apple_sub" text NOT NULL,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "users_apple_sub_idx" ON "users" ("apple_sub");
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "sessions_token_hash_idx" ON "sessions" ("token_hash");
--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" ("user_id");
--> statement-breakpoint
DROP TABLE "pet_state";
--> statement-breakpoint
CREATE TABLE "pet_state" (
	"user_id" text PRIMARY KEY NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"health_score" integer DEFAULT 50 NOT NULL,
	"mood" integer DEFAULT 50 NOT NULL,
	"last_reaction_at" timestamp with time zone,
	"weekly_budget_by_category" jsonb DEFAULT '{"groceries":150,"food_and_drink":150,"restaurants":150}'::jsonb NOT NULL,
	"savings_goal" integer DEFAULT 1000 NOT NULL,
	"paycheck_min_amount" integer DEFAULT 500 NOT NULL,
	"large_purchase_threshold" integer DEFAULT 200 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reaction_history" ADD COLUMN "user_id" text REFERENCES "users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "plaid_items" ADD COLUMN "user_id" text REFERENCES "users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "device_tokens" ADD COLUMN "user_id" text REFERENCES "users"("id") ON DELETE CASCADE;
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "user_id" text REFERENCES "users"("id") ON DELETE CASCADE;
--> statement-breakpoint
DROP TABLE "category_overrides";
--> statement-breakpoint
CREATE TABLE "category_overrides" (
	"user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"merchant_name" text NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	PRIMARY KEY ("user_id", "merchant_name")
);
