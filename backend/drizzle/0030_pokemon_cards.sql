CREATE TABLE "pokemon_card_holdings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"card_name" text NOT NULL,
	"set_name" text,
	"variant" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"label" text,
	"last_price_usd" numeric,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pokemon_card_holdings" ADD CONSTRAINT "pokemon_card_holdings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
