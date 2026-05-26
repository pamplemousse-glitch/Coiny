CREATE TABLE "kraken_connections" (
	"user_id" text PRIMARY KEY NOT NULL,
	"api_key" text NOT NULL,
	"private_key" text NOT NULL,
	"last_total_usd" numeric,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "kraken_connections" ADD CONSTRAINT "kraken_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
