import { fileURLToPath } from 'node:url';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { registerAuthApi } from './api/auth.js';
import { registerDebugApi } from './api/debug.js';
import { registerDevicesApi } from './api/devices.js';
import { registerOverridesApi } from './api/overrides.js';
import { registerPetsApi } from './api/pets.js';
import { registerPlaidLinkApi } from './api/plaid-link.js';
import { registerSpendingApi } from './api/spending.js';
import { registerSubscriptionsApi } from './api/subscriptions.js';
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

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 second',
  });

  // Unauthenticated routes
  app.get('/health', async () => ({ ok: true }));
  registerPlaidWebhook(app);

  // Public auth endpoint (no session required)
  app.register(async (scope) => {
    registerAuthApi(scope);
  });

  // All other routes require a valid session token
  app.register(async (scope) => {
    await registerAuthPlugin(scope);

    registerPlaidLinkApi(scope);
    if (config.PLAID_ENV === 'sandbox') registerDebugApi(scope);
    registerPetsApi(scope);
    registerSpendingApi(scope);
    registerOverridesApi(scope);
    registerDevicesApi(scope);
    registerSubscriptionsApi(scope);
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
