-- Idempotent: this migration already applied during the deploy that
-- introduced PR #174, but the prior 0011..0032 journal entries had stale
-- 2025 timestamps that drizzle's migrator skipped. Fixing the journal will
-- re-trigger 0033 alongside the catch-up batch, so each statement here
-- must be safe to re-apply.
ALTER TABLE "users" ALTER COLUMN "apple_sub" DROP NOT NULL;
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "google_sub" text;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "users_google_sub_idx" ON "users" USING btree ("google_sub");
