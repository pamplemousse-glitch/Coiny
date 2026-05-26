CREATE TABLE "chain_wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"chain" text NOT NULL,
	"address" text NOT NULL,
	"label" text,
	"last_balance_usd" numeric,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "chain_wallets" ADD CONSTRAINT "chain_wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "chain_wallets_user_chain_address_idx" ON "chain_wallets" USING btree ("user_id","chain","address");
