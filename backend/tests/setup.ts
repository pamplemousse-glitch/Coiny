// Vitest global setup
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL ??= 'silent';
process.env.PLAID_CLIENT_ID ??= 'test_client_id';
process.env.PLAID_SECRET ??= 'test_secret';
process.env.PLAID_ENV ??= 'sandbox';
// 64-char hex key for AES-256-GCM tests (does not need to be secret in tests)
process.env.DATA_ENCRYPTION_KEY ??= '0'.repeat(64);
process.env.APPLE_BUNDLE_ID ??= 'app.coiny.test';
// Rate-limit window of 10 minutes in tests so deterministic bursts (101 reqs
// can take many seconds in PGlite) don't roll past the window.
process.env.RATE_LIMIT_WINDOW ??= '10 minute';
process.env.TRUELAYER_CLIENT_ID ??= 'test_tl_client';
process.env.TRUELAYER_CLIENT_SECRET ??= 'test_tl_secret';
process.env.TRUELAYER_ENV ??= 'sandbox';
