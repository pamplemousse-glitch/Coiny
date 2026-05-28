CREATE TABLE "discogs_connections" (
	"user_id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"access_token" text NOT NULL,
	"access_token_secret" text NOT NULL,
	"last_collection_usd" numeric,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "discogs_pending" (
	"user_id" text PRIMARY KEY NOT NULL,
	"oauth_token" text NOT NULL,
	"oauth_token_secret" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "discogs_connections" ADD CONSTRAINT "discogs_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "discogs_pending" ADD CONSTRAINT "discogs_pending_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
