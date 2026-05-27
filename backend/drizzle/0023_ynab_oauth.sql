ALTER TABLE "ynab_connections" ALTER COLUMN "api_key" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "ynab_connections" ADD COLUMN "access_token" text;
--> statement-breakpoint
ALTER TABLE "ynab_connections" ADD COLUMN "refresh_token" text;
--> statement-breakpoint
ALTER TABLE "ynab_connections" ADD COLUMN "token_expires_at" timestamp with time zone;
