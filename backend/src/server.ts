// Side-effect import, and it is first on purpose: it calls Sentry.init before
// any other module in this file is evaluated. Biome treats a side-effect import
// as an ordering barrier and will not sort it away from here.
import './observability/instrument.js';
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
import { registerConsentApi } from './api/consent.js';
import { registerDebtsApi } from './api/debts.js';
import { registerDebugApi, registerDebugSessionApi } from './api/debug.js';
import { registerDeclaredAssetsApi } from './api/declared-assets.js';
import { registerDevicesApi } from './api/devices.js';
import { registerDiagnosticsApi } from './api/diagnostics.js';
import { registerDiscogsApi } from './api/discogs.js';
import { registerEnergyApi } from './api/energy.js';
import { registerEntitlementsApi } from './api/entitlements.js';
import { registerFarmlandApi } from './api/farmland.js';
import { registerGoalsApi } from './api/goals.js';
import { registerIntegrationsHealth } from './api/health-integrations.js';
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
import { registerWellKnownApi } from './api/well-known.js';
import { registerYnabApi } from './api/ynab.js';
import { registerZerionApi } from './api/zerion.js';
import { config } from './config.js';
import { initDb } from './db/client.js';
import { runMigrations } from './db/migrate.js';
import { registerAuthPlugin } from './plugins/auth.js';
import { registerCompression } from './plugins/compression.js';
import { registerErrorHandler } from './plugins/error-handler.js';
import { loggerOptions } from './plugins/logger.js';
import { registerSecurityHeaders } from './plugins/security-headers.js';
import { getSchedulerStatus, isSchedulerStale, startScheduler } from './scheduler/index.js';
import { installProcessLogging } from './util/log.js';
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

/** One registered route, as captured at build time. */
export type RegisteredRoute = { method: string; url: string };

const registeredRoutes: RegisteredRoute[] = [];

/** Every route the last `buildApp()` registered.
 *
 *  Exists so the authorization matrix (`tests/authorization-matrix.test.ts`)
 *  can enumerate the API instead of hand-maintaining a list of it. A
 *  hand-written list of 157 routes is a list that goes stale, and a stale list
 *  in an authorization test fails open: the route nobody remembered to add is
 *  exactly the route nobody remembered to protect.
 *
 *  `printRoutes()` is not usable for this. It renders a radix tree with merged
 *  prefixes, so `/api/plaid/item` and `/api/plaid/items` come back as a node
 *  and a child called `s`, and reassembling them is guesswork. */
export function getRegisteredRoutes(): readonly RegisteredRoute[] {
  return registeredRoutes;
}

/** Test seam for the redaction suite (R-31.12). Production passes nothing and
 *  pino writes to stdout exactly as before; `tests/logger.test.ts` passes a
 *  stream so it can read what was actually emitted rather than reasoning about
 *  what the config implies. The audit's existing check for this was a grep,
 *  which is why it could only ever be true at a point in time. */
type BuildAppOptions = {
  loggerStream?: NodeJS.WritableStream;
  /** Tests default LOG_LEVEL to 'silent' (tests/setup.ts), so a redaction test
   *  that did not raise it would capture an empty stream and pass by asserting
   *  nothing. */
  loggerLevel?: string;
};

async function buildApp(options: BuildAppOptions = {}) {
  await initDb();
  // Migrations run as a deploy step (fly.toml release_command), not here.
  // On boot, every machine that starts races every other machine to migrate,
  // and a release that fails to migrate still serves traffic against a schema
  // it does not match. Tests keep the boot path because PGlite is per-process
  // and has no deploy step.
  if (config.NODE_ENV === 'test' || config.APP_ENV === 'local') {
    await runMigrations();
  }

  // Built as two whole objects rather than one with an optional `stream` key:
  // under exactOptionalPropertyTypes a `stream?: T` does not satisfy Fastify's
  // logger overload, and the resulting error points at the config rather than
  // at the optional property that caused it.
  const level = options.loggerLevel ?? config.LOG_LEVEL;
  const loggerConfig = options.loggerStream
    ? { ...loggerOptions, level, stream: options.loggerStream }
    : { ...loggerOptions, level };

  const app = Fastify({
    logger: loggerConfig,
    // Both default to disabled in Fastify, which is why nothing bounded the
    // total duration of POST /api/net-worth/refresh: only the individual vendor
    // attempts were bounded, and there can be up to 84 of them.
    // connectionTimeout is the one that matters here, because a handler waiting
    // on sixteen vendors sends no bytes while it waits. See config.ts.
    requestTimeout: config.REQUEST_TIMEOUT_MS,
    connectionTimeout: config.CONNECTION_TIMEOUT_MS,
  });

  // Before anything registers a route, so nothing is missed. onRoute fires on
  // this instance and every encapsulated child, which is what makes the
  // three-scope registration below visible to it.
  registeredRoutes.length = 0;
  app.addHook('onRoute', (route) => {
    const methods = Array.isArray(route.method) ? route.method : [route.method];
    for (const method of methods) {
      registeredRoutes.push({ method, url: route.url });
    }
  });

  registerErrorHandler(app);
  registerSecurityHeaders(app);
  registerCompression(app);

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

  // Unauthenticated routes.
  //
  // /health is LIVENESS ONLY and must never 503 on the health of a background
  // job. It previously 503'd whenever the scheduler tick was older than 45
  // minutes, which took the entire API offline for a reason unrelated to its
  // ability to serve requests. On this configuration that was not a rare
  // failure but a guaranteed one: fly.toml runs `auto_stop_machines = 'suspend'`
  // with `min_machines_running = 0`, suspend preserves process memory, and
  // setInterval does not fire while suspended. So any machine idle for longer
  // than TICK_STALE_MS resumed with an already-stale lastTickAt and served 503
  // to Fly's own check until the next tick, up to TICK_INTERVAL_MS later.
  // Observed live on staging: 503, 503, 200 across three probes.
  //
  // The scheduler heartbeat that R-16.2 actually wants lives at
  // /health/scheduler below, where an external pinger can watch it without
  // holding the API hostage.
  app.get('/health', async () => {
    const status = getSchedulerStatus();
    return {
      ok: true,
      scheduler_enabled: status.enabled,
      last_tick_at: status.lastTickAt ? status.lastTickAt.toISOString() : null,
    };
  });

  // Readiness of the background scheduler, for an external monitor. 503 here
  // means "the tick has stopped", which is worth paging about, and it is
  // deliberately NOT the path in fly.toml's [[http_service.checks]].
  app.get('/health/scheduler', async (_req, reply) => {
    const status = getSchedulerStatus();
    const lastTickAt = status.lastTickAt ? status.lastTickAt.toISOString() : null;
    if (!status.enabled) return { ok: true, scheduler_enabled: false };
    if (isSchedulerStale()) {
      return reply.status(503).send({ ok: false, scheduler_enabled: true, last_tick_at: lastTickAt });
    }
    return { ok: true, scheduler_enabled: true, last_tick_at: lastTickAt };
  });
  // Vendor health for the same external pinger, and unauthenticated for the
  // same reason: a free uptime monitor polls a URL. See api/health-integrations.ts.
  registerIntegrationsHealth(app);

  // RFC 9116 disclosure channel. Public by requirement, see api/well-known.ts.
  registerWellKnownApi(app);
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
    registerConsentApi(scope);
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
    // Protected scope: a crash is filed against the session's account, never
    // against an id in the payload.
    registerDiagnosticsApi(scope);
  });

  return app;
}

async function start() {
  // Before anything can throw. Node prints an uncaught exception itself, with
  // the full message and stack, and that output never passes through pino, so
  // every redaction control is bypassed at exactly the moment the most
  // diagnostic detail is emitted.
  installProcessLogging();

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
