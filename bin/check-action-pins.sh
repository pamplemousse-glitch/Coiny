#!/usr/bin/env bash
#
# Verifies that every pinned GitHub Action's `# vX.Y.Z` comment matches the tag
# its SHA actually is.
#
# Why this exists: the SHA is what runs, but the comment is the only thing a
# human reads. When they disagree, the comment wins in every mind that looks at
# the file, and the repo's real state becomes invisible.
#
# This is not hypothetical. Dependabot updates the SHA and can leave the comment
# untouched, and both `android-ci.yml` pins drifted that way: one claimed v4.4.1
# while running v6.3.0, the other claimed v5.0.0 while running v5.7.0. A careful
# reviewer with web access read the comment and concluded the repo was two
# majors behind when it was current. Two characters of stale text produced a
# wrong conclusion about the codebase.
#
# Needs `gh` authenticated. Run locally, or weekly from toolchain-drift.yml.
# Not on every PR: it makes a network call per pin and would spend rate limit
# to re-answer a question that changes only when Dependabot moves something.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

fail=0
checked=0

# Resolve a tag to the commit it points at, dereferencing annotated tags.
# Lightweight tags point straight at a commit; annotated ones point at a tag
# object that has to be followed. Conflating the two is the easy mistake here.
tag_commit() {
  local repo=$1 tag=$2 sha type
  read -r sha type < <(gh api "/repos/$repo/git/ref/tags/$tag" --jq '"\(.object.sha) \(.object.type)"' 2>/dev/null)
  [ -z "${sha:-}" ] && return 1
  if [ "$type" = "tag" ]; then
    gh api "/repos/$repo/git/tags/$sha" --jq '.object.sha' 2>/dev/null
  else
    echo "$sha"
  fi
}

while IFS= read -r line; do
  ref=$(echo "$line" | grep -oE "[a-zA-Z0-9_.-]+/[a-zA-Z0-9_./-]+@[a-f0-9]{40}")
  claimed=$(echo "$line" | grep -oE "#\s*v[0-9]+\.[0-9]+\.[0-9]+" | grep -oE "v[0-9.]+")
  [ -z "$ref" ] || [ -z "$claimed" ] && continue
  action="${ref%%@*}"; sha="${ref##*@}"
  repo=$(echo "$action" | cut -d/ -f1,2)
  checked=$((checked + 1))

  actual=$(tag_commit "$repo" "$claimed")
  if [ -z "${actual:-}" ]; then
    echo "  ?  $repo: tag $claimed not found upstream"
    continue
  fi
  if [ "$actual" = "$sha" ]; then
    echo "  ok $repo $claimed"
  else
    echo "FAIL $repo: comment says $claimed, but that tag is ${actual:0:12} and the pin is ${sha:0:12}" >&2
    fail=1
  fi
done < <(grep -rhE "uses: [a-zA-Z0-9_.-]+/[a-zA-Z0-9_./-]+@[a-f0-9]{40}" .github/workflows/)

echo "checked $checked pinned actions"
if [ "$fail" -ne 0 ]; then
  echo "" >&2
  echo "A pin comment disagrees with its SHA. Fix the COMMENT to match what the" >&2
  echo "SHA actually is, or bump the SHA deliberately. Never 'fix' it by guessing." >&2
  exit 1
fi
