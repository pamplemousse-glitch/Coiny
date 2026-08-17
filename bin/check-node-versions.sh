#!/usr/bin/env bash
#
# Fails when CI's Node major and the Dockerfile's Node major disagree.
#
# The gap this closes: the Node version was declared in two places that nothing
# compared. Every workflow said `node-version: '26'` and `backend/Dockerfile`
# said `node:26-alpine`, which agreed by luck rather than by construction. Let
# them drift and the suite proves something about a runtime production does not
# use, and the whole pipeline stays green while it does. A green pipeline cannot
# report its own staleness, so something has to ask.
#
# The Dockerfile is the source of truth, deliberately: it is what actually runs
# in production. CI is what has to follow.
#
# Majors only. `node:26-alpine` floats within the major on every rebuild and
# `actions/setup-node` resolves `'26'` to the current 26.x, so comparing minors
# would fail constantly and mean nothing.
#
# Run locally with: bin/check-node-versions.sh

set -euo pipefail

cd "$(dirname "$0")/.."

DOCKERFILE="backend/Dockerfile"
WORKFLOW_DIR=".github/workflows"

fail=0

# Every FROM in the Dockerfile, so a multi-stage build cannot have one stage on
# a different major from the others (there are three: builder, deps, runtime).
#
# Deliberately not `mapfile`: that is bash 4+, and macOS ships bash 3.2 at
# /bin/bash. Using it would make this script pass on the Ubuntu runner and fail
# on the machine it is meant to be run from, which is the same
# works-in-one-place-only defect the script exists to catch.
docker_majors=$(grep -oE '^FROM node:[0-9]+' "$DOCKERFILE" | grep -oE '[0-9]+$' | sort -u)
docker_count=$(printf '%s\n' "$docker_majors" | grep -c '[0-9]' || true)

if [ "$docker_count" -eq 0 ]; then
  echo "check-node-versions: no 'FROM node:<major>' found in $DOCKERFILE" >&2
  exit 1
fi

if [ "$docker_count" -gt 1 ]; then
  echo "FAIL: $DOCKERFILE stages disagree with each other: $(echo "$docker_majors" | tr '\n' ' ')" >&2
  exit 1
fi

expected="$docker_majors"
echo "Source of truth: $DOCKERFILE -> node $expected"

# Every node-version in every workflow. Accepts '26', "26" and bare 26.
found_any=0
while IFS= read -r line; do
  file="${line%%:*}"
  rest="${line#*:}"
  version=$(printf '%s' "$rest" | grep -oE "node-version:[[:space:]]*['\"]?[0-9]+" | grep -oE '[0-9]+$')
  [ -z "$version" ] && continue
  found_any=1
  if [ "$version" != "$expected" ]; then
    echo "FAIL: $file declares node-version $version, $DOCKERFILE runs node $expected" >&2
    fail=1
  else
    echo "  ok: $file -> node $version"
  fi
done < <(grep -rn "node-version:" "$WORKFLOW_DIR" || true)

if [ "$found_any" -eq 0 ]; then
  echo "check-node-versions: no node-version keys found under $WORKFLOW_DIR" >&2
  echo "  That is not 'nothing to check', it means this script has stopped looking" >&2
  echo "  in the right place. Failing rather than passing vacuously." >&2
  exit 1
fi

if [ "$fail" -ne 0 ]; then
  echo "" >&2
  echo "Fix: change every disagreeing node-version to $expected, or change the" >&2
  echo "Dockerfile and every workflow together in one commit." >&2
  exit 1
fi

echo "Node majors agree across CI and the Dockerfile."
