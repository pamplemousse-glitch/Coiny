#!/usr/bin/env bash
# Source this before starting the backend:
#   source bin/load-secrets.sh && pnpm dev
#
# Reads from macOS Keychain so secrets never touch the filesystem.

set -e

export PLAID_CLIENT_ID=$(security find-generic-password -a "$USER" -s "coiny-plaid-client-id" -w)
export PLAID_SECRET=$(security find-generic-password -a "$USER" -s "coiny-plaid-sandbox-secret" -w)
export PLAID_ENV=sandbox
export PLAID_WEBHOOK_URL="${PLAID_WEBHOOK_URL:-http://localhost:3000/webhooks/plaid}"
