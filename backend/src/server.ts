import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { registerAccountApi } from './api/account.js';
import { registerAuthApi } from './api/auth.js';
import { registerCoinbaseApi } from './api/coinbase.js';
import { registerDebugApi } from './api/debug.js';
import { registerDevicesApi } from './api/devices.js';
import { registerOverridesApi } from './api/overrides.js';
import { registerPetsApi } from './api/pets.js';
import { registerPlaidLinkApi } from './api/plaid-link.js';
import { registerSpendingApi } from './api/spending.js';
import { registerSpinwheelApi } from './api/spinwheel.js';
import { registerSubscriptionsApi } from './api/subscriptions.js';
import { registerZerionApi } from './api/zerion.js';
import { config } from './config.js';
import { initDb } from './db/client.js';
import { runMigrations } from './db/migrate.js';
import { registerAuthPlugin } from './plugins/auth.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { loggerOptions } from './plugins/logger.js';
import { registerPlaidWebhook } from './webhook/plaid.js';

async function buildApp() {
  await initDb();
  await runMigrations();

  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      ...loggerOptions,
    },
  });

  registerErrorHandler(app);

  // Per-user rate limiting (with IP fallback for unauthenticated requests).
  //
  // We key on the SHA-256 of the bearer token rather than req.user.id because
  // the rate-limit hook fires at onRequest, before the auth preValidation has
  // populated req.user. SHA-256(bearer) maps 1:1 to user (it's the same hash
  // stored in sessions.token_hash), so it's equivalent to per-user keying
  // without requiring a DB lookup in the hot path.
  //
  // Invalid/missing-token requests fall through to req.ip, which gives DOS
  // protection on /health and the public /api/auth/* endpoints.
  await app.register(rateLimit, {
    max: config.RATE_LIMIT_MAX,
    timeWindow: config.RATE_LIMIT_WINDOW,
    keyGenerator: (req) => {
      const header = req.headers.authorization;
      if (header?.toLowerCase().startsWith('bearer ')) {
        const rawToken = header.slice(7).trim();
        if (rawToken) {
          return `s:${createHash('sha256').update(rawToken).digest('hex')}`;
        }
      }
      return req.ip;
    },
  });

  // Unauthenticated routes
  app.get('/health', async () => ({ ok: true }));
  registerPlaidWebhook(app);

  // Public auth endpoint (no session required)
  app.register(async (scope) => {
    registerAuthApi(scope);
  });

  // All other routes require a valid session token. The global rate-limiter
  // above keys on the bearer-token hash, so each authenticated user gets a
  // distinct bucket regardless of their network address.
  app.register(async (scope) => {
    await registerAuthPlugin(scope);

    registerPlaidLinkApi(scope);
    if (config.PLAID_ENV === 'sandbox') registerDebugApi(scope);
    registerAccountApi(scope);
    registerPetsApi(scope);
    registerSpendingApi(scope);
    registerOverridesApi(scope);
    registerDevicesApi(scope);
    registerSubscriptionsApi(scope);
    registerCoinbaseApi(scope);
    registerZerionApi(scope);
    registerSpinwheelApi(scope);
  });

  return app;
}

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    app.log.info('Coiny backend ready');
    if (!config.PLAID_CLIENT_ID || !config.PLAID_SECRET) {
      app.log.warn(
        '⚠ PLAID_CLIENT_ID/PLAID_SECRET not set — Plaid endpoints will fail. Set in Fly secrets or Keychain.',
      );
    }
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

export { buildApp };
export default start;

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  start();
}
