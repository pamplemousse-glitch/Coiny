CREATE TABLE "truelayer_connections" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "access_token" text NOT NULL,
  "refresh_token" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "last_balance_gbp" numeric,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "truelayer_connections_user_id_unique" UNIQUE("user_id")
);
