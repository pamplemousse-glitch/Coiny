#!/usr/bin/env bash
# Reports which Keychain entries exist. Never prints a value: the -w output is
# sent to /dev/null and only the presence of the entry is reported.
for s in \
  coiny-plaid-sandbox-client-id \
  coiny-plaid-sandbox-secret \
  coiny-coingecko-api-key \
  coiny-coinbase-sandbox-api-key-id \
  coiny-coinbase-sandbox-api-key-secret \
  coiny-zerion-sandbox-api-key \
  coiny-paypal-sandbox-client-id \
  coiny-paypal-sandbox-secret \
  coiny-spinwheel-sandbox-secret-key; do
  security find-generic-password -a "$USER" -s "$s" -w &>/dev/null \
    && echo "✓ $s" \
    || echo "✗ $s (NOT FOUND)"
done

# Production Plaid, checked separately because these are the only entries whose
# absence is expected until the trial keys are stored, and because they are
# looked up by service name alone (no -a account filter), matching how
# load-secrets.sh reads them.
for s in \
  coiny-plaid-production-client-id \
  coiny-plaid-production-secret; do
  security find-generic-password -s "$s" -w &>/dev/null \
    && echo "✓ $s" \
    || echo "✗ $s (NOT FOUND, expected until production Plaid is wired)"
done
