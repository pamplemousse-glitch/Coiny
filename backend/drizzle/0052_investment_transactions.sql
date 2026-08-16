-- Investment buys, sells, dividends and contributions, from
-- /investments/transactions/get.
--
-- Kept out of `transactions` deliberately. That table feeds the spending rules
-- and the reaction engine, and a 401k rebalance is not spending; mixing them
-- would make the creature react to a portfolio trade as though the user had
-- bought something. This table exists so goal pacing can observe contributions
-- made INSIDE a brokerage, which it previously could not see at all: pace was
-- inferred purely from cash leaving a checking account.
--
-- Narrow on purpose. Plaid's `name` (e.g. "INCOME DIV DIVIDEND RECEIVED") is
-- financial detail with no consumer here, so it is not stored at all, which is
-- both cheaper and safer than storing it encrypted. `amount` is plaintext for
-- the same reason it is on `transactions`: every query filters and sums on it.
--
-- Amounts are stored in COINY's sign convention, negative for outflow, so they
-- can be summed alongside bank transactions with no per-row correction. Plaid's
-- investment convention is the opposite (positive when cash is debited), and
-- the store negates on the way in.
--
-- Idempotent, per the convention 0033 established.
CREATE TABLE IF NOT EXISTS "investment_transactions" (
	"investment_transaction_id" text PRIMARY KEY NOT NULL,
	"user_id" text,
	"account_id" text NOT NULL,
	"security_id" text,
	"date" text NOT NULL,
	"amount" text NOT NULL,
	"type" text NOT NULL,
	"subtype" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "investment_transactions" ADD CONSTRAINT "investment_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
-- The only read pattern: one user's rows for one account inside a date window.
-- Added now rather than after the table is large enough to hurt, which is the
-- lesson 0049 recorded for `transactions`.
CREATE INDEX IF NOT EXISTS "investment_transactions_user_account_date_idx" ON "investment_transactions" USING btree ("user_id","account_id","date");
