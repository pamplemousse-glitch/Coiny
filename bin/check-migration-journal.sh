#!/usr/bin/env bash
#
# check-migration-journal.sh — compare this branch's Drizzle journal to main's.
#
# ---------------------------------------------------------------------------
# The failure this exists for
# ---------------------------------------------------------------------------
#
# Drizzle decides what to apply by comparing each journal entry's `when`
# against the newest timestamp already recorded in __drizzle_migrations. An
# entry at or below that watermark is SILENTLY SKIPPED: no error, no warning,
# just a table that never appears in production. It has already cost this
# project two production incidents (0005_multi_user and
# 0007_external_integrations; 0008_apply_missing_schema exists to repair them).
#
# `backend/tests/migration-journal.test.ts` already guards this WITHIN a
# branch, and it is thorough. It cannot catch the case this script exists for,
# because it only ever sees one journal:
#
#   Two branches are open. Branch A adds 0065. Branch B, cut from main before
#   A merged, adds 0066. Each journal is internally monotonic, so the test
#   passes on both. Merge B first and 0065 arrives afterwards carrying an
#   EARLIER timestamp than 0066 — at or below the watermark, and skipped.
#
# The corruption exists only in the relationship between the branches, so the
# check has to be against main rather than against the file in hand. That makes
# it CI's job, not a unit test's.
#
# This was written after a near miss: a branch cut from main added 0066 while
# 0065 was still in flight in an open PR. It was caught by hand. This is so the
# next one is not.
#
# ---------------------------------------------------------------------------
# What it enforces, against origin/main
# ---------------------------------------------------------------------------
#
#   1. A new entry's `when` is strictly greater than every `when` on main.
#   2. A new entry's `idx` is strictly greater than every `idx` on main, so two
#      branches cannot both claim the same number.
#   3. An entry that already exists on main is unchanged. Editing the `when` of
#      an applied migration moves the watermark under databases that have
#      already run it, which changes what they consider pending.
#
# Dependency-free and runs before install, like bin/check-node-versions.sh.

set -uo pipefail

JOURNAL="backend/drizzle/meta/_journal.json"
BASE_REF="${1:-origin/main}"

if [ ! -f "$JOURNAL" ]; then
  echo "check-migration-journal: $JOURNAL not found; run from the repo root" >&2
  exit 1
fi

# Shallow clones do not have main. Fetch it rather than silently passing: a
# check that skips when it cannot see the baseline is worse than no check,
# because it reports success.
if ! git rev-parse --verify --quiet "$BASE_REF" >/dev/null; then
  git fetch --quiet --depth=1 origin main 2>/dev/null || true
fi

if ! git rev-parse --verify --quiet "$BASE_REF" >/dev/null; then
  echo "check-migration-journal: cannot resolve $BASE_REF, skipping" >&2
  echo "  (expected on a first push of a new repository, not in CI on a PR)" >&2
  exit 0
fi

BASE_JOURNAL="$(git show "$BASE_REF:$JOURNAL" 2>/dev/null || true)"
if [ -z "$BASE_JOURNAL" ]; then
  echo "check-migration-journal: no journal on $BASE_REF yet, nothing to compare" >&2
  exit 0
fi

BRANCH_JOURNAL="$(cat "$JOURNAL")"

BASE_JOURNAL="$BASE_JOURNAL" BRANCH_JOURNAL="$BRANCH_JOURNAL" BASE_REF="$BASE_REF" python3 <<'PY'
import json, os, sys

base = json.loads(os.environ["BASE_JOURNAL"])["entries"]
head = json.loads(os.environ["BRANCH_JOURNAL"])["entries"]
base_ref = os.environ["BASE_REF"]

by_tag = {e["tag"]: e for e in base}
problems = []

if base:
    max_when = max(e["when"] for e in base)
    max_idx = max(e["idx"] for e in base)
else:
    max_when = max_idx = -1

for e in head:
    tag, when, idx = e["tag"], e["when"], e["idx"]
    prior = by_tag.get(tag)

    if prior is not None:
        # Rule 3: an entry already on main must not be edited.
        if prior["when"] != when:
            problems.append(
                f"{tag}: `when` changed from {prior['when']} to {when}. "
                f"This migration is already on {base_ref} and may already have run. "
                f"Editing its timestamp changes what existing databases consider pending."
            )
        if prior["idx"] != idx:
            problems.append(f"{tag}: `idx` changed from {prior['idx']} to {idx}.")
        continue

    # Rules 1 and 2, for entries this branch adds.
    if when <= max_when:
        problems.append(
            f"{tag}: `when` is {when}, at or below the newest on {base_ref} ({max_when}).\n"
            f"      Drizzle would SILENTLY SKIP it. This usually means the branch was cut\n"
            f"      before another migration merged. Rebase on {base_ref} and re-stamp\n"
            f"      `when` to the current time."
        )
    if idx <= max_idx:
        problems.append(
            f"{tag}: `idx` is {idx}, at or below the highest on {base_ref} ({max_idx}).\n"
            f"      Two branches cannot both claim that number. Rebase and renumber."
        )

if problems:
    print("Migration journal conflicts with " + base_ref + ":\n", file=sys.stderr)
    for p in problems:
        print(f"  - {p}", file=sys.stderr)
    print(
        "\nWhy this matters: an out-of-order entry is not an error at deploy time.\n"
        "The migrator skips it in silence and the table simply never appears.\n",
        file=sys.stderr,
    )
    sys.exit(1)

added = [e["tag"] for e in head if e["tag"] not in by_tag]
if added:
    print(f"check-migration-journal: {len(added)} new migration(s) ordered correctly after {base_ref}: " + ", ".join(added))
else:
    print(f"check-migration-journal: no new migrations relative to {base_ref}")
PY
