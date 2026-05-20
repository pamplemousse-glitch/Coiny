CREATE TABLE "pet_state" (
	"id" integer PRIMARY KEY NOT NULL,
	"health_score" integer DEFAULT 50 NOT NULL,
	"mood" integer DEFAULT 50 NOT NULL,
	"last_reaction_at" timestamp with time zone,
	"weekly_budget_by_category" jsonb DEFAULT '{"groceries":150,"food_and_drink":150,"restaurants":150}'::jsonb NOT NULL,
	"savings_goal" integer DEFAULT 1000 NOT NULL,
	"paycheck_min_amount" integer DEFAULT 500 NOT NULL,
	"large_purchase_threshold" integer DEFAULT 200 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "processed_events" (
	"id" text PRIMARY KEY NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reaction_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"event_type" text NOT NULL,
	"reaction" jsonb NOT NULL
);
