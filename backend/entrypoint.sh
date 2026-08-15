#!/bin/sh
set -e

# Run whatever we were given, if we were given anything.
#
# Fly's release_command overrides CMD, not ENTRYPOINT, so it arrives here as
# arguments. Without this, the release machine ignored them and booted the full
# server instead: the scheduler ticked, queried a table the pending migration
# had not created yet, and the deploy aborted on an error that looked like a
# migration failure but was the migration never running at all.
if [ "$#" -gt 0 ]; then
  exec "$@"
fi

exec node /app/backend/dist/server.js
