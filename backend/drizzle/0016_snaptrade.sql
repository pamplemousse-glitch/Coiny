CREATE TABLE "snaptrade_connections" (
  "user_id" text PRIMARY KEY NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "snap_user_id" text NOT NULL,
  "snap_user_secret" text NOT NULL,
  "last_brokerage_total" numeric,
  "last_synced_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);
