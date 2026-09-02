-- Deletion tombstones (G1.27, audit rows 2.9.4 and 5.9.6).
--
-- The privacy notice says backups are never used to restore a deleted account.
-- Nothing made that true: the cascade removes the user row and leaves no trace,
-- so a restore from any copy resurrects every account deleted since that copy
-- was taken, and no list existed to re-delete them from. Bounded today by
-- Neon's six-hour window; unbounded the day the 30-day dump exists, which is
-- why the two ship together.
--
-- Deliberately NOT a foreign key. The row it names is gone by construction, so
-- a reference would be unsatisfiable and a cascade would destroy the one record
-- that has to outlive the user.
--
-- Append-only, and holds an id and a date and nothing else. A tombstone is a
-- record that a specific person was here and left, so it carries the minimum
-- that makes a post-restore re-deletion possible, and `deleted_at` exists so
-- the tombstone can itself be dropped once no backup old enough to resurrect
-- that user survives (store/deleted-users.ts, pruneExpiredTombstones).
CREATE TABLE IF NOT EXISTS "deleted_user_ids" (
  "user_id" text PRIMARY KEY,
  "deleted_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint

-- The post-restore sweep reads by date ("everything deleted since this copy was
-- taken"), never by id.
CREATE INDEX IF NOT EXISTS "deleted_user_ids_deleted_at_idx"
  ON "deleted_user_ids" ("deleted_at");
