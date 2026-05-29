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
export SPINWHEEL_SECRET_KEY=$(security find-generic-password -a "$USER" -s "coiny-spinwheel-sandbox-secret-key" -w)
export SNAPTRADE_CLIENT_ID=$(security find-generic-password -a coiny -s coiny-snaptrade-client-id -w)
export SNAPTRADE_CONSUMER_KEY=$(security find-generic-password -a coiny -s coiny-snaptrade-consumer-key -w)
export KICKSDB_API_KEY=$(security find-generic-password -a coiny -s coiny-kicksdb-api-key -w 2>/dev/null || true)
export DISCOGS_CONSUMER_KEY=$(security find-generic-password -a coiny -s coiny-discogs-consumer-key -w 2>/dev/null || true)
export DISCOGS_CONSUMER_SECRET=$(security find-generic-password -a coiny -s coiny-discogs-consumer-secret -w 2>/dev/null || true)
export GOLDAPI_API_KEY=$(security find-generic-password -a coiny -s coiny-goldapi-api-key -w 2>/dev/null || true)
export BLOCKFROST_PROJECT_ID=$(security find-generic-password -a coiny -s coiny-blockfrost-project-id -w 2>/dev/null || true)
export HELIUS_API_KEY=$(security find-generic-password -a coiny -s coiny-helius-api-key -w 2>/dev/null || true)
export ALCHEMY_API_KEY=$(security find-generic-password -a coiny -s coiny-alchemy-api-key -w 2>/dev/null || true)
export KALSHI_KEY_ID=$(security find-generic-password -a coiny -s coiny-kalshi-demo-key-id -w 2>/dev/null || true)
export KALSHI_PRIVATE_KEY=$(security find-generic-password -a coiny -s coiny-kalshi-demo-private-key -w 2>/dev/null || true)
export KALSHI_ENV=demo
