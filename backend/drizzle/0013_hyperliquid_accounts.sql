CREATE TABLE IF NOT EXISTS "hyperliquid_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"address" text NOT NULL,
	"label" text,
	"last_account_value_usd" numeric,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "hyperliquid_accounts" ADD CONSTRAINT "hyperliquid_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "hyperliquid_accounts_user_address_idx" ON "hyperliquid_accounts" USING btree ("user_id","address");
