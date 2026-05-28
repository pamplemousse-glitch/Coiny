CREATE TABLE "kalshi_connections" (
	"user_id" text PRIMARY KEY NOT NULL,
	"key_id" text NOT NULL,
	"private_key_base64" text NOT NULL,
	"last_portfolio_usd" numeric,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kalshi_connections" ADD CONSTRAINT "kalshi_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
