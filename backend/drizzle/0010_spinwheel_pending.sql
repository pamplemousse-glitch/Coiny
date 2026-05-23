CREATE TABLE IF NOT EXISTS "spinwheel_pending" (
  "user_id" text PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "spinwheel_user_id" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);
