-- Subscription entitlements (docs/prd.md §25, R-25.2 to R-25.4). Server-side
-- authority for the free/individual/household tiers: the iOS client reports
-- Apple's signed transaction JWS and the App Store Server Notifications V2
-- webhook keeps state in sync with renewals, billing retry, grace periods and
-- refunds. Written idempotently to match the convention established by 0033.
CREATE TABLE IF NOT EXISTS "entitlements" (
	"user_id" text PRIMARY KEY NOT NULL,
	"app_account_token" text NOT NULL,
	"tier" text DEFAULT 'free' NOT NULL,
	"status" text DEFAULT 'none' NOT NULL,
	"product_id" text,
	"original_transaction_id" text,
	"environment" text,
	"expires_at" timestamp with time zone,
	"grace_expires_at" timestamp with time zone,
	"auto_renew" boolean DEFAULT false NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "entitlements" ADD CONSTRAINT "entitlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "entitlements_app_account_token_idx" ON "entitlements" USING btree ("app_account_token");
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "entitlements_original_transaction_idx" ON "entitlements" USING btree ("original_transaction_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "household_members" (
	"id" serial PRIMARY KEY NOT NULL,
	"owner_user_id" text NOT NULL,
	"member_user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "household_members" ADD CONSTRAINT "household_members_owner_user_id_users_id_fk" FOREIGN KEY ("owner_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "household_members" ADD CONSTRAINT "household_members_member_user_id_users_id_fk" FOREIGN KEY ("member_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "household_members_member_idx" ON "household_members" USING btree ("member_user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "household_members_owner_idx" ON "household_members" USING btree ("owner_user_id");
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "app_store_notifications" (
	"notification_uuid" text PRIMARY KEY NOT NULL,
	"notification_type" text NOT NULL,
	"subtype" text,
	"original_transaction_id" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
