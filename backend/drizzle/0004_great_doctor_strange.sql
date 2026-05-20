CREATE TABLE "transactions" (
	"transaction_id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"merchant_name" text,
	"amount" text NOT NULL,
	"date" text NOT NULL,
	"category" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
