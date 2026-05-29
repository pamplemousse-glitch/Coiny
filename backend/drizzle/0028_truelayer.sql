CREATE TABLE "truelayer_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL UNIQUE,
	"access_token" text NOT NULL,
	"refresh_token" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_balance_gbp" numeric,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "truelayer_connections" ADD CONSTRAINT "truelayer_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
