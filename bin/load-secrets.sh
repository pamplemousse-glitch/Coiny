#!/usr/bin/env bash
# Source this before starting the backend:
#   source bin/load-secrets.sh && pnpm dev
#
# Reads from macOS Keychain so secrets never touch the filesystem.

set -e

# Which Plaid environment this shell targets.
#
# Sandbox unless you opt in, and the opt-in is explicit and per-invocation:
#
#     COINY_PLAID_ENV=production source bin/load-secrets.sh
#
# The default is not a preference, it is the safety property. Sandbox holds
# fake banks and the fixed user_good / pass_good login, so a shell that forgets
# to opt in can only ever reach synthetic data. Production reads real balances
# from a real person's bank. Nothing infers the environment from anything else:
# a mistake here has to be a deliberate keystroke, not an omission.
#
# An unrecognised value is an error rather than a fallback. Falling back would
# mean a typo silently picks an environment, which is the failure this whole
# arrangement exists to prevent.
PLAID_TARGET="${COINY_PLAID_ENV:-sandbox}"
case "$PLAID_TARGET" in
  sandbox)
    export PLAID_CLIENT_ID=$(security find-generic-password -a "$USER" -s "coiny-plaid-sandbox-client-id" -w)
    export PLAID_SECRET=$(security find-generic-password -a "$USER" -s "coiny-plaid-sandbox-secret" -w)
    export PLAID_ENV=sandbox
    ;;
  production)
    # Looked up by service name only, with no -a account filter, the same way
    # the newer entries below are. The sandbox pair above predates that habit.
    export PLAID_CLIENT_ID=$(security find-generic-password -s "coiny-plaid-production-client-id" -w)
    export PLAID_SECRET=$(security find-generic-password -s "coiny-plaid-production-secret" -w)
    export PLAID_ENV=production
    # An empty credential would otherwise reach config.ts and fail at boot with
    # a message about the schema rather than about the Keychain.
    if [ -z "$PLAID_CLIENT_ID" ] || [ -z "$PLAID_SECRET" ]; then
      echo "load-secrets: production Plaid keys not found in Keychain." >&2
      echo "  expected services: coiny-plaid-production-client-id, coiny-plaid-production-secret" >&2
      return 1 2>/dev/null || exit 1
    fi
    echo "load-secrets: PLAID_ENV=production. Real bank data." >&2
    echo "  Each link permanently consumes one of ten trial connections and unlinking does not return it." >&2
    ;;
  *)
    echo "load-secrets: COINY_PLAID_ENV must be 'sandbox' or 'production', got '$PLAID_TARGET'" >&2
    return 1 2>/dev/null || exit 1
    ;;
esac
# Field encryption key. Optional here on purpose: with no key the server now
# refuses to boot unless ALLOW_PLAINTEXT_FIELDS=true is set deliberately, which
# is the point (audit 1.3.5). Generate one with `openssl rand -hex 32` and store
# it as "coiny-data-encryption-key".
export DATA_ENCRYPTION_KEY=$(security find-generic-password -a coiny -s coiny-data-encryption-key -w 2>/dev/null || true)
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
export POKEMONPRICETRACKER_API_KEY=$(security find-generic-password -s coiny-pokemonpricetracker-api-key -w 2>/dev/null || true)
export EIA_API_KEY=$(security find-generic-password -a coiny -s coiny-eia-api-key -w 2>/dev/null || true)
export USDA_NASS_API_KEY=$(security find-generic-password -a coiny -s coiny-usda-api-key -w 2>/dev/null || true)
export TCGAPI_KEY=$(security find-generic-password -a coiny -s coiny-tcgapi-api-key -w 2>/dev/null || true)
export PCGS_API_KEY=$(security find-generic-password -a coiny -s coiny-pcgs-api-key -w 2>/dev/null || true)
