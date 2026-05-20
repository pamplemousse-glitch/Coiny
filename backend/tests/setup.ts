// Vitest global setup — guarantees test env so the lazy DB initializer
// picks the PGlite path instead of trying to open a Postgres connection.
process.env['NODE_ENV'] = 'test';
process.env['LOG_LEVEL'] ??= 'silent';
process.env['TELLER_APPLICATION_ID'] ??= 'app_test';
process.env['TELLER_CERT_PATH'] ??= '/dev/null';
process.env['TELLER_KEY_PATH'] ??= '/dev/null';
