// Vitest global setup
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL ??= 'silent';
process.env.PLAID_CLIENT_ID ??= 'test_client_id';
process.env.PLAID_SECRET ??= 'test_secret';
process.env.PLAID_ENV ??= 'sandbox';
// 64-char hex key for AES-256-GCM tests (does not need to be secret in tests)
process.env.DATA_ENCRYPTION_KEY ??= '0'.repeat(64);
process.env.APPLE_BUNDLE_ID ??= 'app.coiny.test';
