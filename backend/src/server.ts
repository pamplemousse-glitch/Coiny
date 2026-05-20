import { fileURLToPath } from 'node:url';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { registerDevicesApi } from './api/devices.js';
import { registerOverridesApi } from './api/overrides.js';
import { registerPetsApi } from './api/pets.js';
import { registerPlaidLinkApi } from './api/plaid-link.js';
import { registerSpendingApi } from './api/spending.js';
import { registerSubscriptionsApi } from './api/subscriptions.js';
import { config } from './config.js';
import { initDb } from './db/client.js';
import { runMigrations, seedPetStateIfMissing } from './db/migrate.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { loggerOptions } from './plugins/logger.js';
import { registerPlaidWebhook } from './webhook/plaid.js';

async function buildApp() {
  await initDb();
  await runMigrations();
  await seedPetStateIfMissing();

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

  registerPlaidWebhook(app);
  registerPlaidLinkApi(app);
  registerPetsApi(app);
  registerSpendingApi(app);
  registerOverridesApi(app);
  registerDevicesApi(app);
  registerSubscriptionsApi(app);

  app.get('/health', async () => ({ ok: true }));

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

// Only auto-start when run directly, not when imported by tests or other modules.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  start();
}
