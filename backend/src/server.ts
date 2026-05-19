import Fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import { config } from './config.js';
import { loggerOptions } from './plugins/logger.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { registerTellerWebhook } from './webhook/teller.js';

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

  app.get('/health', async () => ({ ok: true }));

  return app;
}

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    app.log.info('Coiny backend ready');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

export { buildApp };
export default start;

start();
