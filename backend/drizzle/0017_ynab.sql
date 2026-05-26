CREATE TABLE "ynab_connections" (
  "user_id" text PRIMARY KEY NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "api_key" text NOT NULL,
  "last_net_worth_usd" numeric,
  "last_synced_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
