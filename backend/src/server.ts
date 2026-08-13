import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import rateLimit from '@fastify/rate-limit';
import Fastify from 'fastify';
import { registerAccountApi } from './api/account.js';
import { registerAlpacaApi } from './api/alpaca.js';
import { registerAuthApi } from './api/auth.js';
import { registerChainWalletsApi } from './api/chain-wallets.js';
import { registerCoinbaseApi } from './api/coinbase.js';
import { registerCoinsApi } from './api/coins.js';
import { registerDebtsApi } from './api/debts.js';
import { registerDebugApi, registerDebugSessionApi } from './api/debug.js';
import { registerDeclaredAssetsApi } from './api/declared-assets.js';
import { registerDevicesApi } from './api/devices.js';
import { registerDiscogsApi } from './api/discogs.js';
import { registerEnergyApi } from './api/energy.js';
import { registerEntitlementsApi } from './api/entitlements.js';
import { registerFarmlandApi } from './api/farmland.js';
import { registerGoalsApi } from './api/goals.js';
import { registerHyperliquidApi } from './api/hyperliquid.js';
import { registerKalshiConnectApi } from './api/kalshi-connect.js';
import { registerKrakenApi } from './api/kraken.js';
import { registerManualAssetsApi } from './api/manual-assets.js';
import { registerMetalsApi } from './api/metals.js';
import { registerNetWorthApi } from './api/net-worth.js';
import { registerNftApi } from './api/nft.js';
import { registerOverridesApi } from './api/overrides.js';
import { registerPetsApi } from './api/pets.js';
import { registerPlaidLinkApi } from './api/plaid-link.js';
import { registerPlaidRecurringApi } from './api/plaid-recurring.js';
import { registerPokemonCardsApi } from './api/pokemon-cards.js';
import { registerPolymarketApi } from './api/polymarket.js';
import { registerRealEstateApi } from './api/real-estate.js';
import { registerSneakersApi } from './api/sneakers.js';
import { registerSpendingApi } from './api/spending.js';
import { registerSpinwheelApi } from './api/spinwheel.js';
import { registerSubscriptionsApi } from './api/subscriptions.js';
import { registerTelemetryApi } from './api/telemetry.js';
import { registerTradingCardsApi } from './api/trading-cards.js';
import { registerTruelayerApi } from './api/truelayer.js';
import { registerVehiclesApi } from './api/vehicles.js';
import { registerYnabApi } from './api/ynab.js';
import { registerZerionApi } from './api/zerion.js';
import { config } from './config.js';
import { initDb } from './db/client.js';
import { runMigrations } from './db/migrate.js';
import { registerAuthPlugin } from './plugins/auth.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { loggerOptions } from './plugins/logger.js';
import { getSchedulerStatus, isSchedulerStale, startScheduler } from './scheduler/index.js';
import { registerAppStoreWebhook } from './webhook/appstore.js';
import { registerPlaidWebhook } from './webhook/plaid.js';

/** Debug routes are for local development and the iOS simulator only.
 *  Both conditions must hold: not a production build, AND pointed at Plaid
 *  sandbox data. Either alone is insufficient, which is the bug this replaces:
 *  fly.toml ships NODE_ENV=production with PLAID_ENV=sandbox, so gating on
 *  PLAID_ENV alone exposed an unauthenticated session-minting route publicly. */
function isDebugBuild(): boolean {
  return config.NODE_ENV !== 'production' && config.PLAID_ENV === 'sandbox';
}

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

  // Unauthenticated routes. /health carries the scheduler heartbeat
  // (prd.md R-16.2): 503 when the tick is older than 45 minutes routes
  // scheduler death through the Fly health check and the external pinger.
  // When the scheduler is not running (tests, one-off scripts) the fields are
  // absent and the endpoint stays a plain liveness check.
  app.get('/health', async (_req, reply) => {
    const status = getSchedulerStatus();
    if (!status.enabled) return { ok: true };
    const lastTickAt = status.lastTickAt ? status.lastTickAt.toISOString() : null;
    if (isSchedulerStale()) {
      return reply.status(503).send({ ok: false, last_tick_at: lastTickAt });
    }
    return { ok: true, last_tick_at: lastTickAt };
  });
  registerPlaidWebhook(app);
  // Unauthenticated in the session sense only: every request is JWS-verified
  // against Apple's pinned root before anything is read from it.
  registerAppStoreWebhook(app);

  // Public auth endpoints (no session required)
  app.register(async (scope) => {
    registerAuthApi(scope);
    // Gated on NODE_ENV, NOT on PLAID_ENV. PLAID_ENV describes which Plaid data
    // environment we talk to; it says nothing about whether this process is
    // publicly reachable. fly.toml ships NODE_ENV=production with
    // PLAID_ENV=sandbox, so the old PLAID_ENV gate registered an
    // UNAUTHENTICATED session-minting endpoint on the public internet.
    if (isDebugBuild()) registerDebugSessionApi(scope);
  });

  // All other routes require a valid session token. The global rate-limiter
  // above keys on the bearer-token hash, so each authenticated user gets a
  // distinct bucket regardless of their network address.
  app.register(async (scope) => {
    await registerAuthPlugin(scope);

    registerPlaidLinkApi(scope);
    registerPlaidRecurringApi(scope);
    if (isDebugBuild()) registerDebugApi(scope);
    registerAccountApi(scope);
    registerEntitlementsApi(scope);
    registerPetsApi(scope);
    registerGoalsApi(scope);
    registerSpendingApi(scope);
    registerOverridesApi(scope);
    registerDevicesApi(scope);
    registerSubscriptionsApi(scope);
    registerCoinbaseApi(scope);
    registerDiscogsApi(scope);
    registerZerionApi(scope);
    registerSpinwheelApi(scope);
    registerSneakersApi(scope);
    registerManualAssetsApi(scope);
    registerDeclaredAssetsApi(scope);
    registerChainWalletsApi(scope);
    registerHyperliquidApi(scope);
    registerPolymarketApi(scope);
    registerKalshiConnectApi(scope);
    registerKrakenApi(scope);
    registerAlpacaApi(scope);
    registerRealEstateApi(scope);
    registerVehiclesApi(scope);
    registerMetalsApi(scope);
    registerNftApi(scope);
    registerYnabApi(scope);
    registerTruelayerApi(scope);
    registerPokemonCardsApi(scope);
    registerEnergyApi(scope);
    registerFarmlandApi(scope);
    registerTradingCardsApi(scope);
    registerCoinsApi(scope);
    registerDebtsApi(scope);
    registerNetWorthApi(scope);
    registerTelemetryApi(scope);
  });

  return app;
}

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: config.PORT, host: '0.0.0.0' });
    // Started here, not in buildApp: tests build apps constantly and must not
    // spawn timers. fly.toml's min_machines_running = 1 keeps this process,
    // and therefore this interval, alive.
    startScheduler(app.log);
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
