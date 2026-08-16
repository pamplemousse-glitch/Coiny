import { beforeEach, describe, expect, it } from 'vitest';
import { authHeader, createOtherUser, resetDatabase } from './db-helper.js';

/**
 * The authorization matrix.
 *
 * Broken Object Level Authorization is API1 in the OWASP API Security Top 10
 * (https://owasp.org/API-Security/editions/2023/en/0xa1-broken-object-level-authorization/)
 * and it is the most likely way this app leaks money data: one route that
 * forgets `WHERE user_id = $userId` returns a stranger's net worth.
 * `.claude/rules/security.md` #6 mandates that scoping and, until this file,
 * nothing enforced it.
 *
 * The routes are ENUMERATED from the built Fastify instance, never listed by
 * hand. That is the whole point. A hand-maintained list of 157 routes goes
 * stale, and a stale list in an authorization test fails open: the route nobody
 * remembered to add to the list is the same route nobody remembered to protect.
 *
 * Consequently a new route is protected by default. To add a public one you
 * must come here and say so in `PUBLIC_ROUTES`, with a reason, which is a
 * reviewable act rather than an omission.
 */

/** Routes that are intentionally reachable without a session, each with the
 *  reason it is allowed to be. Anything not in here must reject an anonymous
 *  request. Keep the reasons: they are what a reviewer checks. */
const PUBLIC_ROUTES: Record<string, string> = {
  'GET /health': 'liveness probe for Fly; must answer before anything else works',
  'GET /health/scheduler': 'readiness of the background tick, for an external monitor',
  'GET /.well-known/security.txt': 'RFC 9116 requires this to be publicly fetchable',
  'POST /webhooks/plaid': 'Plaid cannot hold a session; authenticated by JWS + request_body_sha256',
  'POST /webhooks/appstore': 'Apple cannot hold a session; authenticated by JWS against the pinned root',
  'POST /api/auth/apple': 'the endpoint that mints the session',
  'POST /api/auth/google': 'the endpoint that mints the session',
  'POST /api/auth/logout': 'accepts an already-invalid token; revoking twice is not an error',
  'POST /api/debug/session': 'debug builds only, gated on NODE_ENV !== production AND Plaid sandbox',
};

/** Fastify adds HEAD for every GET. Testing both says the same thing twice. */
const normalise = (method: string): string => (method === 'HEAD' ? 'GET' : method);

const key = (method: string, url: string): string => `${normalise(method)} ${url}`;

/** A distinct source address per request.
 *
 *  The global limiter keys unauthenticated requests on `req.ip`, so firing one
 *  request at every route from a single address trips the limit partway through
 *  and the rest of the suite reports 429 instead of 401. That would be a green
 *  test measuring the rate limiter rather than the authorization. */
let addressCounter = 0;
const nextAddress = (): string => {
  addressCounter += 1;
  return `10.${(addressCounter >> 16) & 0xff}.${(addressCounter >> 8) & 0xff}.${addressCounter & 0xff}`;
};

/** Headers and payload for a probe request.
 *
 *  A body, and therefore a JSON content-type, is sent only for methods that
 *  take one. Declaring `application/json` on a bodyless DELETE makes Fastify's
 *  parser fail the request with 400 before the auth hook ever runs, which would
 *  make all 29 DELETE routes look like authorization failures when the defect
 *  is in the probe. */
function bodyFor(method: string, headers: Record<string, string> = {}) {
  const takesBody = method !== 'GET' && method !== 'HEAD' && method !== 'DELETE';
  return takesBody ? { headers: { ...headers, 'content-type': 'application/json' }, payload: '{}' } : { headers };
}

/** A syntactically plausible session token that was never issued. */
let forgedCounter = 0;
const forgedToken = (): string => {
  forgedCounter += 1;
  return forgedCounter.toString(16).padStart(64, '0');
};

/** Placeholder values for path parameters. The value is irrelevant: an
 *  unauthenticated request must be rejected before the parameter is ever read. */
const fillParams = (url: string): string => url.replace(/:[^/]+/g, 'placeholder');

async function buildTestApp() {
  const { buildApp } = await import('../src/server.js');
  return buildApp();
}

async function routeInventory() {
  const { getRegisteredRoutes } = await import('../src/server.js');
  const seen = new Set<string>();
  return getRegisteredRoutes()
    .filter((route) => {
      // OPTIONS is CORS preflight, not an application route.
      if (route.method === 'OPTIONS') return false;
      const id = key(route.method, route.url);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .map((route) => ({ method: normalise(route.method), url: route.url }));
}

describe('authorization matrix', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('registers a route inventory to test against', async () => {
    const app = await buildTestApp();
    const routes = await routeInventory();
    // A collector that silently returns nothing would make every test below
    // pass by iterating an empty list. Assert the enumeration itself works.
    expect(routes.length).toBeGreaterThan(100);
    expect(routes.some((r) => r.url === '/api/pets')).toBe(true);
    await app.close();
  });

  it('rejects every non-public route without a session', async () => {
    const app = await buildTestApp();
    const routes = await routeInventory();
    const leaked: string[] = [];

    for (const route of routes) {
      if (PUBLIC_ROUTES[key(route.method, route.url)]) continue;
      const res = await app.inject({
        method: route.method as 'GET',
        url: fillParams(route.url),
        remoteAddress: nextAddress(),
        // Only when a body is actually sent. Declaring a JSON content-type with
        // no payload makes Fastify's parser reject the request with 400 before
        // the auth hook runs, which would report every DELETE as a failure of
        // this test rather than of authentication.
        ...bodyFor(route.method),
      });
      if (res.statusCode !== 401) {
        leaked.push(`${key(route.method, route.url)} -> ${res.statusCode}`);
      }
    }

    expect(
      leaked,
      `These routes answered an anonymous request with something other than 401.\n` +
        `Either they are missing auth, or they are deliberately public and belong in ` +
        `PUBLIC_ROUTES with a written reason:\n  ${leaked.join('\n  ')}`,
    ).toEqual([]);
    await app.close();
  });

  it('rejects every non-public route when the bearer token is not a real session', async () => {
    const app = await buildTestApp();
    const routes = await routeInventory();
    const leaked: string[] = [];

    for (const route of routes) {
      if (PUBLIC_ROUTES[key(route.method, route.url)]) continue;
      const res = await app.inject({
        method: route.method as 'GET',
        url: fillParams(route.url),
        remoteAddress: nextAddress(),
        // Well-formed, entirely invented, and different every time. The limiter
        // buckets authenticated requests on sha256(token), so reusing one
        // forged token puts every route in a single bucket and the run turns
        // into 429s partway through.
        ...bodyFor(route.method, { authorization: `Bearer ${forgedToken()}` }),
      });
      if (res.statusCode !== 401) {
        leaked.push(`${key(route.method, route.url)} -> ${res.statusCode}`);
      }
    }

    expect(leaked, `These routes accepted a forged bearer token:\n  ${leaked.join('\n  ')}`).toEqual([]);
    await app.close();
  });

  it('has no stale entries in PUBLIC_ROUTES', async () => {
    const app = await buildTestApp();
    const routes = await routeInventory();
    const live = new Set(routes.map((r) => key(r.method, r.url)));
    // A public entry for a route that no longer exists is how an allowlist
    // rots: the name gets reused later by a route that should be protected,
    // and the exemption is already sitting there waiting for it.
    const stale = Object.keys(PUBLIC_ROUTES).filter((entry) => !live.has(entry));
    expect(stale, `PUBLIC_ROUTES names routes that are not registered: ${stale.join(', ')}`).toEqual([]);
    await app.close();
  });
});

/**
 * Object-level checks. The tests above prove authentication is on; these prove
 * authorization is, which is the part that actually stops user B reading user
 * A's balances.
 *
 * Each case creates a resource as user A through the real API, then attempts to
 * read or mutate it as user B. Anything other than a non-2xx is a finding.
 */
describe('cross-user object access', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('does not let another user delete a wallet address they do not own', async () => {
    const app = await buildTestApp();
    const other = await createOtherUser();
    const address = '0x1111111111111111111111111111111111111111';

    const created = await app.inject({
      method: 'POST',
      url: '/api/polymarket/accounts',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      payload: JSON.stringify({ walletAddress: address }),
    });
    // If seeding fails the case proves nothing, so fail loudly rather than
    // passing a test that never attacked anything.
    expect(created.statusCode, `seeding failed: ${created.body}`).toBeLessThan(300);

    await app.inject({
      method: 'DELETE',
      url: `/api/polymarket/accounts/${address}`,
      headers: other.authHeader,
    });

    // The assertion is data survival, deliberately not the status code. This
    // handler scopes its DELETE with `and(eq(userId), eq(walletAddress))`, so
    // B's request matches zero rows and returns 204, and 204 for an idempotent
    // no-op delete is defensible. Asserting >= 400 here would fail correct
    // code. What must never be true is that the row is gone.
    const stillThere = await app.inject({
      method: 'GET',
      url: '/api/polymarket/accounts',
      headers: authHeader(),
    });
    expect(stillThere.body, 'user B deleted user A wallet').toContain(address);

    // And B gained nothing by asking.
    const otherList = await app.inject({
      method: 'GET',
      url: '/api/polymarket/accounts',
      headers: other.authHeader,
    });
    expect(otherList.body, 'user A wallet appeared in user B list').not.toContain(address);
    await app.close();
  });

  it('does not leak another user declared assets', async () => {
    const app = await buildTestApp();
    const other = await createOtherUser();

    const created = await app.inject({
      method: 'PUT',
      url: '/api/declared-assets',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      payload: JSON.stringify({
        assets: [{ assetClass: 'savings', bucketedValueUsd: 123_456, declaredAt: new Date().toISOString() }],
      }),
    });
    expect(created.statusCode, `seeding failed: ${created.body}`).toBeLessThan(300);

    const asOther = await app.inject({
      method: 'GET',
      url: '/api/declared-assets',
      headers: other.authHeader,
    });
    expect(asOther.statusCode).toBe(200);
    // The distinctive amount is the tell. An empty list is correct; A's number
    // appearing in B's response is the breach.
    expect(asOther.body, 'user A declared value appeared in user B response').not.toContain('123456');
    await app.close();
  });

  it('does not let another user read a pet that is not theirs', async () => {
    const app = await buildTestApp();
    const other = await createOtherUser();

    await app.inject({
      method: 'PUT',
      url: '/api/pets/goals',
      headers: { ...authHeader(), 'content-type': 'application/json' },
      payload: JSON.stringify({ savingsGoal: 987_654, largePurchaseThreshold: 300 }),
    });

    const asOther = await app.inject({ method: 'GET', url: '/api/pets', headers: other.authHeader });
    expect(asOther.statusCode).toBe(200);
    expect(asOther.body, 'user A savings goal appeared in user B pet state').not.toContain('987654');
    await app.close();
  });

  it('does not let another user revoke sessions they do not own', async () => {
    const app = await buildTestApp();
    const other = await createOtherUser();

    const attack = await app.inject({
      method: 'POST',
      url: '/api/account/sessions/revoke-all',
      headers: { ...other.authHeader, 'content-type': 'application/json' },
      payload: '{}',
    });
    // B revoking their own sessions is legitimate and expected to succeed.
    // What must remain true is that A's session is untouched.
    expect(attack.statusCode).toBeLessThan(500);

    const stillValid = await app.inject({ method: 'GET', url: '/api/pets', headers: authHeader() });
    expect(stillValid.statusCode, 'user B revoke-all killed user A session').toBe(200);
    await app.close();
  });
});
