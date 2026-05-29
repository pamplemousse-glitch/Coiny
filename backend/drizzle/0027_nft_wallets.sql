CREATE TABLE "nft_wallets" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "address" text NOT NULL,
  "label" text,
  "last_value_usd" numeric,
  "last_synced_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE UNIQUE INDEX "nft_wallets_user_address_idx" ON "nft_wallets" ("user_id", "address");
