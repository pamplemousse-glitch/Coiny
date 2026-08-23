-- MetricKit crash and hang diagnostics (G3.10, the diagnostic half).
--
-- Separate from analytics_events on purpose. That table is fed by a strict
-- catalog (src/analytics/events.ts) whose whole job is to reject anything
-- free-form, and a call stack tree cannot pass it. Widening the catalog to fit
-- would dismantle the control for every other event, so the diagnostics get
-- their own table instead.
--
-- The call stack stored here is UNSYMBOLICATED: binary image name, binary UUID,
-- text-segment offset, address, sample count. No function names, no file paths.
-- The three free-form fields MetricKit exposes (terminationReason,
-- virtualMemoryRegionInfo, exceptionReason.composedMessage) are dropped on the
-- device and never reach this table.
--
-- Retention: 90 days, enforced by scheduler/purge.ts, matching ops_events.
-- These rows describe a build, not a person.
CREATE TABLE IF NOT EXISTS "crash_diagnostics" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"kind" text NOT NULL,
	"app_build" integer NOT NULL,
	"os_major" integer NOT NULL,
	"signature" text NOT NULL,
	"exception_type" integer,
	"exception_code" integer,
	"signal" integer,
	"call_stack" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crash_diagnostics" ADD CONSTRAINT "crash_diagnostics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crash_diagnostics_user_idx" ON "crash_diagnostics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crash_diagnostics_signature_idx" ON "crash_diagnostics" USING btree ("signature","app_build");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "crash_diagnostics_received_at_idx" ON "crash_diagnostics" USING btree ("received_at");
