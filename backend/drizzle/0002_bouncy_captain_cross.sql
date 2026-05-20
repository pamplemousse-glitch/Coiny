CREATE TABLE "category_overrides" (
	"merchant_name" text PRIMARY KEY NOT NULL,
	"category" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
