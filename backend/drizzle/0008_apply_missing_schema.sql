CREATE TABLE IF NOT EXISTS "users" (
	"id" text PRIMARY KEY NOT NULL,
	"apple_sub" text NOT NULL,
	"email" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_apple_sub_idx" ON "users" ("apple_sub");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
	"token_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "sessions_token_hash_idx" ON "sessions" ("token_hash");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "sessions_user_id_idx" ON "sessions" ("user_id");
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='pet_state' AND column_name='user_id') THEN
    DROP TABLE IF EXISTS "pet_state";
    CREATE TABLE "pet_state" (
      "user_id" text PRIMARY KEY NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "health_score" integer DEFAULT 50 NOT NULL,
      "mood" integer DEFAULT 50 NOT NULL,
      "last_reaction_at" timestamp with time zone,
      "weekly_budget_by_category" jsonb DEFAULT '{"groceries":150,"food_and_drink":150,"restaurants":150}'::jsonb NOT NULL,
      "savings_goal" integer DEFAULT 1000 NOT NULL,
      "paycheck_min_amount" integer DEFAULT 500 NOT NULL,
      "large_purchase_threshold" integer DEFAULT 200 NOT NULL
    );
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='reaction_history' AND column_name='user_id') THEN
    ALTER TABLE "reaction_history" ADD COLUMN "user_id" text REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='plaid_items' AND column_name='user_id') THEN
    ALTER TABLE "plaid_items" ADD COLUMN "user_id" text REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='device_tokens' AND column_name='user_id') THEN
    ALTER TABLE "device_tokens" ADD COLUMN "user_id" text REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='transactions' AND column_name='user_id') THEN
    ALTER TABLE "transactions" ADD COLUMN "user_id" text REFERENCES "users"("id") ON DELETE CASCADE;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='category_overrides' AND column_name='user_id') THEN
    DROP TABLE IF EXISTS "category_overrides";
    CREATE TABLE "category_overrides" (
      "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
      "merchant_name" text NOT NULL,
      "category" text NOT NULL,
      "created_at" timestamp with time zone DEFAULT now() NOT NULL,
      PRIMARY KEY ("user_id", "merchant_name")
    );
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "coinbase_connections" (
	"user_id" text PRIMARY KEY NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"token_expires_at" timestamp with time zone,
	"mode" text DEFAULT 'dev_key' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "zerion_wallets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"address" text NOT NULL,
	"label" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "spinwheel_connections" (
	"user_id" text PRIMARY KEY NOT NULL,
	"spinwheel_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='coinbase_connections_user_id_users_id_fk') THEN
    ALTER TABLE "coinbase_connections" ADD CONSTRAINT "coinbase_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='zerion_wallets_user_id_users_id_fk') THEN
    ALTER TABLE "zerion_wallets" ADD CONSTRAINT "zerion_wallets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='spinwheel_connections_user_id_users_id_fk') THEN
    ALTER TABLE "spinwheel_connections" ADD CONSTRAINT "spinwheel_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "zerion_wallets_user_address_idx" ON "zerion_wallets" USING btree ("user_id","address");
