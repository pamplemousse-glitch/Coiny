-- Institution identity per Plaid item (docs/prd.md S-17): the repair prompt
-- must say "Chase needs you to sign in again", not "Your bank". Captured once
-- at link time from /item/get (it does not change for the life of an item) and
-- lazily backfilled for items linked before this column existed. Both fields
-- are nullable: Plaid returns null for items created without an institution
-- connection (e.g. Same Day Micro-deposits). Written idempotently to match the
-- convention established by 0033.
ALTER TABLE "plaid_items" ADD COLUMN IF NOT EXISTS "institution_id" text;
--> statement-breakpoint
ALTER TABLE "plaid_items" ADD COLUMN IF NOT EXISTS "institution_name" text;
