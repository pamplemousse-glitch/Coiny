#!/usr/bin/env bash
# branch-guard.sh — Block `git commit` on main/master.
#
# Registered as a PreToolUse hook on Bash in .claude/settings.json.
# Receives tool input as JSON on stdin. Emits a JSON permission decision
# on stdout. Exits 0 either way — the decision lives in the JSON.
#
# To bypass for an emergency: temporarily comment out the hook in
# .claude/settings.json, do the commit, restore the hook.

set -u

# Read tool input
INPUT="$(cat)"

# Extract the bash command Claude is about to run
CMD="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // ""')"

# Only intervene on `git commit` invocations. Allow `git commit-tree`,
# `git commitlint`, etc. by anchoring on a word boundary.
if ! printf '%s' "$CMD" | grep -qE '(^|[[:space:]])git[[:space:]]+commit([[:space:]]|$)'; then
    exit 0
fi

# Determine current branch. If not a git repo, allow (don't block unrelated work).
BRANCH="$(git -C "$PWD" symbolic-ref --short HEAD 2>/dev/null || true)"
if [ -z "$BRANCH" ]; then
    exit 0
fi

# Block on protected branches
case "$BRANCH" in
    main|master)
        REASON="Direct commits to '${BRANCH}' are blocked by branch-guard hook. Create a feature branch first: git checkout -b feat/<short-name>"
        printf '%s\n' "{
  \"hookSpecificOutput\": {
    \"hookEventName\": \"PreToolUse\",
    \"permissionDecision\": \"deny\",
    \"permissionDecisionReason\": \"${REASON}\"
  }
}"
        exit 0
        ;;
esac

exit 0
