CREATE TABLE "alpaca_connections" (
	"user_id" text PRIMARY KEY NOT NULL,
	"api_key_id" text NOT NULL,
	"api_secret_key" text NOT NULL,
	"env" text DEFAULT 'paper' NOT NULL,
	"last_equity_usd" numeric,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "alpaca_connections" ADD CONSTRAINT "alpaca_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
