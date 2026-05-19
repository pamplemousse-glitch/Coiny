#!/usr/bin/env bash
# Source this before starting the backend:
#   source bin/load-secrets.sh && pnpm dev
#
# Reads from macOS Keychain so secrets never touch the filesystem.

set -e

export TELLER_APPLICATION_ID=$(security find-generic-password -a "$USER" -s "coiny-teller-application-id" -w)
export TELLER_SIGNING_SECRET=$(security find-generic-password -a "$USER" -s "coiny-teller-signing-secret" -w 2>/dev/null || echo "")
export TELLER_CERT_PATH="$HOME/Documents/coiny-secrets/teller-sandbox/certificate.pem"
export TELLER_KEY_PATH="$HOME/Documents/coiny-secrets/teller-sandbox/private_key.pem"
export TELLER_ENVIRONMENT=sandbox
