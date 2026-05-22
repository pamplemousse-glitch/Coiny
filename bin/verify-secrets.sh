#!/usr/bin/env bash
for s in \
  coiny-plaid-sandbox-client-id \
  coiny-plaid-sandbox-secret \
  coiny-coingecko-api-key \
  coiny-coinbase-sandbox-api-key-id \
  coiny-coinbase-sandbox-api-key-secret \
  coiny-zerion-sandbox-api-key \
  coiny-paypal-sandbox-client-id \
  coiny-paypal-sandbox-secret \
  coiny-spinwheel-secret-key \
  coiny-spinwheel-sandbox-secret-key; do
  security find-generic-password -a "$USER" -s "$s" -w &>/dev/null \
    && echo "✓ $s" \
    || echo "✗ $s (NOT FOUND)"
done
