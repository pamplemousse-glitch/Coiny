-- First-party analytics event store (docs/prd.md R-24.1, engineering-budgets §8).
-- One append-only table in the existing Postgres; no third-party vendor by
-- decision R-22.6 (no new dependency, no DPA, and tester volume is plain-SQL
-- sized). Properties are bucketed enums and categorical tokens only, never
-- amounts, merchant names, or any PII: the whitelist lives in
-- src/analytics/events.ts and is enforced at the API and the server emitter.
-- Written idempotently to match the convention established by 0033.
CREATE TABLE IF NOT EXISTS "analytics_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"event" text NOT NULL,
	"properties" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"client_ts" timestamp with time zone,
	"server_ts" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_events_user_idx" ON "analytics_events" USING btree ("user_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "analytics_events_event_server_ts_idx" ON "analytics_events" USING btree ("event","server_ts");
