CREATE TABLE "energy_positions" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "commodity" text NOT NULL,
  "quantity_unit" text NOT NULL,
  "quantity" numeric NOT NULL,
  "label" text,
  "last_spot_price_usd" numeric,
  "last_synced_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "farmland_parcels" (
  "id" serial PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "state_code" text NOT NULL,
  "acres" numeric NOT NULL,
  "label" text,
  "last_price_per_acre_usd" numeric,
  "last_synced_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
