CREATE TABLE "trading_card_holdings" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "game" text NOT NULL,
  "card_name" text NOT NULL,
  "set_name" text,
  "is_foil" boolean NOT NULL DEFAULT false,
  "quantity" integer NOT NULL DEFAULT 1,
  "label" text,
  "last_price_usd" numeric,
  "last_synced_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "coin_holdings" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "pcgs_no" integer NOT NULL,
  "grade_no" integer NOT NULL,
  "plus_grade" boolean NOT NULL DEFAULT false,
  "quantity" integer NOT NULL DEFAULT 1,
  "coin_name" text,
  "label" text,
  "last_price_guide_usd" numeric,
  "last_synced_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
