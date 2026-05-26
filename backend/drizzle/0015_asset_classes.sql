CREATE TABLE "real_estate_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"address" text NOT NULL,
	"label" text,
	"last_value_usd" numeric,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "real_estate_assets" ADD CONSTRAINT "real_estate_assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "real_estate_assets_user_address_idx" ON "real_estate_assets" USING btree ("user_id","address");
--> statement-breakpoint
CREATE TABLE "vehicle_assets" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"vin" text NOT NULL,
	"label" text,
	"last_value_usd" numeric,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vehicle_assets" ADD CONSTRAINT "vehicle_assets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_assets_user_vin_idx" ON "vehicle_assets" USING btree ("user_id","vin");
--> statement-breakpoint
CREATE TABLE "metal_holdings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"metal" text NOT NULL,
	"weight_oz" numeric NOT NULL,
	"label" text,
	"last_value_usd" numeric,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "metal_holdings" ADD CONSTRAINT "metal_holdings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
