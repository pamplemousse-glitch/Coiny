#!/bin/sh
set -e

# Decode mTLS cert + key from Fly secrets (base64) to ephemeral files.
# The config schema requires TELLER_CERT_PATH and TELLER_KEY_PATH, so we
# set them here after writing the files.
SECRETS_DIR=/run/secrets
mkdir -p "$SECRETS_DIR"

if [ -n "$TELLER_CERT_B64" ]; then
  printf '%s' "$TELLER_CERT_B64" | base64 -d > "$SECRETS_DIR/teller.crt"
  export TELLER_CERT_PATH="$SECRETS_DIR/teller.crt"
fi

if [ -n "$TELLER_KEY_B64" ]; then
  printf '%s' "$TELLER_KEY_B64" | base64 -d > "$SECRETS_DIR/teller.key"
  export TELLER_KEY_PATH="$SECRETS_DIR/teller.key"
fi

exec node /app/backend/dist/server.js
