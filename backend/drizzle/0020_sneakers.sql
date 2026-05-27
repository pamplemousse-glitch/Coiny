CREATE TABLE "sneaker_holdings" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "sku" text NOT NULL,
  "description" text,
  "size" text,
  "quantity" integer NOT NULL DEFAULT 1,
  "last_price_usd" numeric,
  "last_synced_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
