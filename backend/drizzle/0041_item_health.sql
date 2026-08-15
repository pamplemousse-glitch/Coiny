-- Plaid item connection health (docs/prd.md R-8.5, R-8.6): a lifecycle status
-- column so broken bank connections are detectable and repairable instead of
-- silently stale. status is one of: healthy | expiring | reauth_required | revoked.
-- Written idempotently to match the convention established by 0033.
ALTER TABLE "plaid_items" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'healthy' NOT NULL;
--> statement-breakpoint
ALTER TABLE "plaid_items" ADD COLUMN IF NOT EXISTS "status_changed_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "plaid_items" ADD COLUMN IF NOT EXISTS "last_error_code" text;
--> statement-breakpoint
ALTER TABLE "plaid_items" ADD COLUMN IF NOT EXISTS "new_accounts_available" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
-- Items revoked before this migration were recorded only as disabled = true.
-- Backfill their status so the client does not offer repair on a dead item.
UPDATE "plaid_items" SET "status" = 'revoked' WHERE "disabled" = true AND "status" = 'healthy';
