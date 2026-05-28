CREATE TABLE "plaid_recurring_streams" (
  "stream_id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "account_id" text NOT NULL,
  "direction" text NOT NULL,
  "merchant_name" text,
  "description" text NOT NULL,
  "frequency" text NOT NULL,
  "average_amount" numeric,
  "last_amount" numeric,
  "last_date" text,
  "is_active" boolean DEFAULT true NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plaid_liability_cache" (
  "account_id" text PRIMARY KEY NOT NULL,
  "user_id" text NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "account_type" text NOT NULL,
  "min_payment" numeric,
  "next_due_date" text,
  "last_statement_balance" numeric,
  "is_overdue" boolean,
  "primary_apr" numeric,
  "expected_payoff_date" text,
  "repayment_plan_type" text,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);
