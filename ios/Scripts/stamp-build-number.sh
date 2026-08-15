#!/bin/bash
#
# Stamp CFBundleVersion from git, at build time.
#
# WHY THIS EXISTS
#
# CFBundleVersion was the literal "1" in project.yml. App Store Connect rejects
# a second upload that carries a build number it has already seen for the same
# CFBundleShortVersionString, so the first TestFlight upload would have
# succeeded and every one after it would have failed. A hand-edited number
# fails the same way the moment somebody forgets, which is the first time they
# are in a hurry.
#
# THE SCHEME
#
#   CFBundleShortVersionString  MARKETING_VERSION, set in ios/project.yml.
#                               Changed by a human, once per release, and the
#                               release commit is tagged ios-v<version>.
#   CFBundleVersion             The number of commits reachable from HEAD.
#                               Never typed, strictly increasing, and it names
#                               exactly one commit.
#
# Commit count is monotonic because history only grows: every commit added to a
# branch increases it, and a squash-merge to main adds one. It is not globally
# unique across branches, which does not matter, because uploads come from main
# or from a release tag. Two archives of the SAME commit get the SAME build
# number and the second upload is refused; that is correct, since they are the
# same build. Commit first, then re-archive.
#
# The script also refuses to build when HEAD carries an ios-v tag that
# disagrees with MARKETING_VERSION, which is the one way the tag and the
# shipped marketing version can silently diverge.
#
# Run as a post-build phase, so it rewrites the Info.plist inside the built
# product before code signing. It never edits anything in the source tree.

set -euo pipefail

if [ -z "${TARGET_BUILD_DIR:-}" ] || [ -z "${INFOPLIST_PATH:-}" ]; then
  echo "warning: stamp-build-number.sh ran outside Xcode; nothing to stamp"
  exit 0
fi

PLIST="${TARGET_BUILD_DIR}/${INFOPLIST_PATH}"
if [ ! -f "$PLIST" ]; then
  echo "warning: no Info.plist at ${PLIST}; leaving the build number alone"
  exit 0
fi

SRC_ROOT_DIR="${SRCROOT:-$(pwd)}"

if ! git -C "$SRC_ROOT_DIR" rev-parse --git-dir >/dev/null 2>&1; then
  # Building from a source export with no history. Leave whatever project.yml
  # declared rather than inventing a number that could collide.
  echo "warning: not a git checkout; CFBundleVersion left at its declared value"
  exit 0
fi

BUILD_NUMBER=$(git -C "$SRC_ROOT_DIR" rev-list --count HEAD)

MARKETING="${MARKETING_VERSION:-}"
TAG=$(git -C "$SRC_ROOT_DIR" tag --points-at HEAD --list 'ios-v*' | head -1)
if [ -n "$TAG" ] && [ -n "$MARKETING" ] && [ "$TAG" != "ios-v${MARKETING}" ]; then
  echo "error: HEAD is tagged ${TAG} but MARKETING_VERSION is ${MARKETING}."
  echo "error: bump MARKETING_VERSION in ios/project.yml or move the tag."
  exit 1
fi

/usr/libexec/PlistBuddy -c "Set :CFBundleVersion ${BUILD_NUMBER}" "$PLIST"
echo "CFBundleVersion = ${BUILD_NUMBER} (commits reachable from HEAD)"
