-- Push notification ledger, backing the notification budget in
-- reactions/dispatch.ts. Written idempotently to match the convention
-- established by 0033 after the stale-journal incident.
CREATE TABLE IF NOT EXISTS "notification_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"event_type" text NOT NULL,
	"sent_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "notification_log_user_sent_idx" ON "notification_log" USING btree ("user_id","sent_at");
