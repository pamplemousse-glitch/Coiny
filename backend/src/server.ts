import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { loggerOptions } from './plugins/logger.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { registerTellerWebhook } from './webhook/teller.js';
import { registerPetsApi } from './api/pets.js';
import { registerSpendingApi } from './api/spending.js';

async function buildApp() {
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

  registerTellerWebhook(app);
  registerPetsApi(app);
  registerSpendingApi(app);

  app.get('/health', async () => ({ ok: true }));

  return app;
}

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    app.log.info('Coiny backend ready');
    if (!config.TELLER_SIGNING_SECRET) {
      app.log.warn('⚠ TELLER_SIGNING_SECRET not set — webhook endpoint is unauthenticated (warn-mode). Register a webhook in the Teller dashboard to enable signature verification.');
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
