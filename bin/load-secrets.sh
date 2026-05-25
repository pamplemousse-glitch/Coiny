#!/usr/bin/env bash
# Source this before starting the backend:
#   source bin/load-secrets.sh && pnpm dev
#
# Reads from macOS Keychain so secrets never touch the filesystem.

set -e

export PLAID_CLIENT_ID=$(security find-generic-password -a "$USER" -s "coiny-plaid-sandbox-client-id" -w)
export PLAID_SECRET=$(security find-generic-password -a "$USER" -s "coiny-plaid-sandbox-secret" -w)
export PLAID_ENV=sandbox
export PLAID_WEBHOOK_URL="${PLAID_WEBHOOK_URL:-http://localhost:3000/webhooks/plaid}"
export COINBASE_API_KEY_ID=$(security find-generic-password -a "$USER" -s "coiny-coinbase-sandbox-api-key-id" -w)
export COINBASE_API_KEY_SECRET=$(security find-generic-password -a "$USER" -s "coiny-coinbase-sandbox-api-key-secret" -w)
export ZERION_API_KEY=$(security find-generic-password -a "$USER" -s "coiny-zerion-sandbox-api-key" -w)
export PAYPAL_CLIENT_ID=$(security find-generic-password -a "$USER" -s "coiny-paypal-sandbox-client-id" -w)
export PAYPAL_SECRET=$(security find-generic-password -a "$USER" -s "coiny-paypal-sandbox-secret" -w)
export PAYPAL_ENV=sandbox
export SPINWHEEL_SECRET_KEY=$(security find-generic-password -a "$USER" -s "coiny-spinwheel-sandbox-secret-key" -w)
