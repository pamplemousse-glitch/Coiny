// Vitest global setup — sets NODE_ENV=test so the lazy DB initializer picks
// PGlite, and pins Plaid creds to dummy values so config.ts validation passes.
process.env['NODE_ENV'] = 'test';
process.env['LOG_LEVEL'] ??= 'silent';
process.env['PLAID_CLIENT_ID'] ??= 'test_client_id';
process.env['PLAID_SECRET'] ??= 'test_secret';
process.env['PLAID_ENV'] ??= 'sandbox';
