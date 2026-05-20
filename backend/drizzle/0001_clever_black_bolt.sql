CREATE TABLE "plaid_items" (
	"item_id" text PRIMARY KEY NOT NULL,
	"access_token" text NOT NULL,
	"cursor" text,
	"initial_sync_complete" boolean DEFAULT false NOT NULL,
	"disabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
