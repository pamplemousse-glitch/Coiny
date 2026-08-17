-- Items whose /item/remove call failed, held only until it succeeds.
--
-- Both unlink paths (DELETE /api/plaid/item and DELETE /api/account) swallowed
-- an /item/remove failure and then destroyed the plaid_items row, which holds
-- the only copy of the access token. Harmless against sandbox. Against
-- production it leaves an Item that Plaid bills monthly, that cannot be
-- cancelled without the token that was just deleted, and that has permanently
-- consumed one of ten Trial connections.
--
-- Deliberately NOT a column on plaid_items: that table is read by twelve call
-- sites which would each need an exclusion filter, and DELETE /api/account
-- cascades its rows away via the user foreign key, so a flag there cannot
-- survive the case it is most needed in.
--
-- No user_id column, and no foreign key. The row is an item id plus the
-- credential needed to finish the removal the user already asked for, held
-- with no linkage back to a person and deleted the moment the removal
-- succeeds. See docs/legal/data-disposal-schedule.md.
--
-- Idempotent, per the convention 0033 established.
CREATE TABLE IF NOT EXISTS "plaid_removal_queue" (
	"item_id" text PRIMARY KEY NOT NULL,
	"access_token" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"last_error_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
