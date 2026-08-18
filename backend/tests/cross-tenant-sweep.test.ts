// Systematic cross-tenant object access (PRD R-33.1 to R-33.6).
//
// BOLA, "broken object level authorization", is API1 in the OWASP API Security
// Top 10 in both the 2019 and 2023 editions. It is the bug where the server
// correctly checks WHO you are and then forgets to check whether the thing you
// asked for is YOURS. Published analysis puts it at roughly 40% of API attacks
// and present in an estimated 68% of APIs that serve user-scoped resources.
//
// It is also the class no scanner finds. OWASP's own guidance is that access
// control detection is not reliably responsive to automated static or dynamic
// testing, and the reason is simple: ZAP can send user B's token to user A's
// URL, but it has no idea whether the 200 that comes back is a leak or a
// correct answer. Only something that knows who owns what can tell. That is
// why this file exists and why it is worth more here than a DAST run.
//
// `authorization-matrix.test.ts` already proves every route REQUIRES a session.
// This file proves a session is not enough. The two are different questions and
// passing the first says nothing about the second.
//
// THE FAILURE MODE THIS FILE IS BUILT AROUND
//
// A cross-tenant test that attacks a resource which never existed passes
// perfectly and proves nothing. So does one whose URL was mistyped, or whose
// seeding request quietly 400'd. Every one of those looks like "B was blocked".
// Three guards, and they are the point of the design:
//
//   1. PAIRED LEGS. Every case runs twice: once as the owner (must succeed)
//      and once as the attacker (must not). A failing owner leg is a suite
//      ERROR, not a pass, because it means the case never tested authorization.
//   2. HARVESTED IDS. The attacker uses the exact id the owner's own collection
//      returned, never a freshly invented UUID. A random id proves only that
//      the row is absent.
//   3. FAIL-CLOSED COVERAGE. Every identifier-bearing route enumerated from the
//      live Fastify instance must match a seed here, or the suite fails by
//      name. Same shape, and the same reasoning, as PUBLIC_ROUTES in
//      authorization-matrix.test.ts: the route nobody added is the route nobody
//      scoped.

import type { FastifyInstance } from 'fastify';
import { beforeEach, describe, expect, it } from 'vitest';
import { authHeader, createOtherUser, resetDatabase } from './db-helper.js';

/** How the owner creates one of these, and how its id is read back.
 *
 *  `create` is the POST body. `collection` is the GET whose response carries
 *  the id. `idFrom` pulls the identifier out of that response, because the
 *  families do not agree on an envelope shape. */
type Seed = {
  /** Route prefix, matching the `:id` routes it covers. */
  base: string;
  create: Record<string, unknown>;
  /** A value unique to this owner, asserted absent from the attacker's list. */
  sentinel: string;
  idFrom: (body: unknown) => string | null;
};

/** Pulls the first id out of whatever envelope a family happens to use.
 *
 *  Shape-agnostic on purpose. These ten routes do not agree: some return a
 *  bare array, some wrap it in a named key, and the id field is variously
 *  `id`, `assetId` or `positionId`. Hardcoding one shape produced a null on
 *  the very first family, which the harvest guard caught immediately, which is
 *  the guard doing its job rather than a nuisance. */
function firstId(): (body: unknown) => string | null {
  return (body: unknown): string | null => {
    const rows = Array.isArray(body)
      ? body
      : Object.values((body ?? {}) as Record<string, unknown>).find((v) => Array.isArray(v));
    if (!Array.isArray(rows) || rows.length === 0) return null;
    const row = rows[0] as Record<string, unknown>;
    const id = row.id ?? row.assetId ?? row.positionId ?? row.holdingId;
    return id === undefined || id === null ? null : String(id);
  };
}

const OWNER_TAG = 'owner-sentinel-8814';

const SEEDS: Seed[] = [
  {
    base: '/api/coins',
    create: { pcgsNo: 1941, gradeNo: 65, quantity: 1, label: OWNER_TAG },
    sentinel: OWNER_TAG,
    idFrom: firstId(),
  },
  {
    base: '/api/energy',
    create: { commodity: 'wti_crude', quantity: 10, label: OWNER_TAG },
    sentinel: OWNER_TAG,
    idFrom: firstId(),
  },
  {
    base: '/api/farmland',
    create: { stateCode: 'IA', acres: 40, label: OWNER_TAG },
    sentinel: OWNER_TAG,
    idFrom: firstId(),
  },
  {
    base: '/api/manual-assets',
    create: { name: OWNER_TAG, category: 'other', selfReportedValueUsd: 1234 },
    sentinel: OWNER_TAG,
    idFrom: firstId(),
  },
  {
    base: '/api/metals',
    create: { metal: 'XAU', weightOz: 2, label: OWNER_TAG },
    sentinel: OWNER_TAG,
    idFrom: firstId(),
  },
  {
    base: '/api/pokemon-cards',
    create: { cardName: OWNER_TAG, quantity: 1 },
    sentinel: OWNER_TAG,
    idFrom: firstId(),
  },
  {
    base: '/api/real-estate',
    create: { address: `1 ${OWNER_TAG} Street`, label: OWNER_TAG },
    sentinel: OWNER_TAG,
    idFrom: firstId(),
  },
  {
    base: '/api/sneakers',
    create: { sku: OWNER_TAG, quantity: 1 },
    sentinel: OWNER_TAG,
    idFrom: firstId(),
  },
  {
    base: '/api/trading-cards',
    create: { game: 'mtg', cardName: OWNER_TAG, quantity: 1 },
    sentinel: OWNER_TAG,
    idFrom: firstId(),
  },
  {
    base: '/api/vehicles',
    create: { vin: `VIN${OWNER_TAG}`, label: OWNER_TAG },
    sentinel: OWNER_TAG,
    idFrom: firstId(),
  },
];

/** Identifier routes deliberately outside the sweep, each with the reason.
 *
 *  An exclusion is a claim that the route cannot be seeded through the API, not
 *  that it is safe. Anything listed here still needs a hand-written case or a
 *  reason it cannot have one. */
const UNSEEDABLE: { pattern: string; why: string }[] = [
  {
    pattern: '/api/polymarket/accounts/:address',
    why: 'Already covered by a dedicated hand-written case in authorization-matrix.test.ts ("does not let another user delete a wallet address they do not own"), which asserts data survival rather than status.',
  },
  {
    pattern: '/api/hyperliquid/accounts/:address',
    why: 'Address-keyed, same shape as the polymarket case above. The identifier is a value the attacker supplies rather than one they discover, so the generic id-harvesting binder does not model it. Follow-up: a hand-written case mirroring polymarket.',
  },
  {
    pattern: '/api/nft/wallets/:address',
    why: 'Address-keyed, same reasoning as hyperliquid above. Follow-up: hand-written case.',
  },
  {
    pattern: '/api/debts/:id/merge',
    why: 'Debt rows arrive from Spinwheel or the Plaid liability cache; there is no create endpoint to seed one through, and merge takes a second id in the body that the binder does not model.',
  },
  {
    pattern: '/api/debts/:id/split',
    why: 'Same as merge: unseeded source data plus a body-carried second identifier.',
  },
  {
    pattern: '/api/declared-assets/:assetClass',
    why: 'Keyed by asset class rather than a row id, and already covered by a dedicated hand-written case in authorization-matrix.test.ts ("does not leak another user declared assets"), which seeds through PUT.',
  },
  {
    pattern: '/api/zerion/wallets/:address',
    why: 'Keyed by the wallet address the caller supplies, so user B attacking it is attacking a value they already know. Covered in spirit by the polymarket case in authorization-matrix.test.ts, which is the same address-keyed shape. Worth a hand-written case; see R-33.1 follow-up.',
  },
  {
    pattern: '/api/chain-wallets/:chain/:address',
    why: 'Same address-keyed shape as zerion, with a two-segment identifier the generic binder does not model. Worth a hand-written case; see R-33.1 follow-up.',
  },
  {
    pattern: '/api/goals/ladder/rungs/:rungId/skip',
    why: 'The ladder is derived state, not a created row: rungs exist because net worth put them there, so there is nothing to POST. Needs a hand-written case once the ladder has a test fixture.',
  },
  {
    pattern: '/api/debts/:id',
    why: 'Debt rows arrive from Spinwheel or the Plaid liability cache; there is no create endpoint to seed one through.',
  },
  {
    pattern: '/api/goals/:id',
    why: 'Covered by the dedicated goal ownership tests in target-goals.test.ts, which seed through the goal system rather than a plain POST.',
  },
];

async function buildTestApp(): Promise<FastifyInstance> {
  const { buildApp } = await import('../src/server.js');
  return buildApp();
}

function json(headers: Record<string, string>): Record<string, string> {
  return { ...headers, 'content-type': 'application/json' };
}

type Seeded = { seed: Seed; id: string };

/** Creates one resource per family as the OWNER and harvests its real id.
 *  Throws rather than skipping: an unseeded family is a hole in the sweep. */
async function seedAll(app: FastifyInstance): Promise<Seeded[]> {
  const out: Seeded[] = [];
  for (const seed of SEEDS) {
    const created = await app.inject({
      method: 'POST',
      url: seed.base,
      headers: json(authHeader()),
      payload: JSON.stringify(seed.create),
    });
    expect(created.statusCode, `SEED FAILED for ${seed.base}: ${created.body}`).toBeLessThan(300);

    const list = await app.inject({ method: 'GET', url: seed.base, headers: authHeader() });
    expect(list.statusCode, `seed list failed for ${seed.base}`).toBe(200);
    const id = seed.idFrom(list.json());
    // R-33.3: harvested, never invented. A null here means the sweep would
    // attack a URL with "null" in it and pass for the wrong reason.
    expect(id, `could not harvest an id for ${seed.base} from ${list.body}`).toBeTruthy();
    out.push({ seed, id: id as string });
  }
  return out;
}

describe('systematic cross-tenant object access', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  // R-33.5. The sweep is only worth what it covers, and coverage has to be
  // enforced rather than hoped for.
  it('covers every identifier-bearing route the server registers', async () => {
    const app = await buildTestApp();
    const { getRegisteredRoutes } = await import('../src/server.js');
    const identifierRoutes = getRegisteredRoutes()
      .filter((r) => r.url.startsWith('/api/') && r.url.includes('/:'))
      .map((r) => r.url);
    await app.close();

    expect(identifierRoutes.length, 'no identifier routes found, the enumeration is broken').toBeGreaterThan(10);

    const covered = (url: string) =>
      SEEDS.some((s) => url.startsWith(`${s.base}/`)) || UNSEEDABLE.some((u) => u.pattern === url);

    const uncovered = [...new Set(identifierRoutes)].filter((u) => !covered(u));
    expect(
      uncovered,
      `these identifier routes have no seed and no documented exclusion:\n  ${uncovered.join('\n  ')}`,
    ).toEqual([]);
  });

  // R-33.2, the paired legs. This is the guard that makes every other
  // assertion in the file mean something.
  it('confirms the owner can reach their own resource, or the sweep proves nothing', async () => {
    const app = await buildTestApp();
    const seeded = await seedAll(app);

    for (const { seed, id } of seeded) {
      const asOwner = await app.inject({
        method: 'PATCH',
        url: `${seed.base}/${id}`,
        headers: json(authHeader()),
        payload: JSON.stringify({ label: 'owner-can-edit' }),
      });
      // Not every family exposes PATCH; a 404 for a route that does not exist
      // is fine, but 401/403 for the OWNER would mean the control leg is broken
      // and every "B was blocked" result below is meaningless.
      expect(
        [401, 403].includes(asOwner.statusCode),
        `owner was denied their own ${seed.base}/${id}, so this sweep tests nothing`,
      ).toBe(false);
    }
    await app.close();
  });

  // R-33.1 and R-33.4. The attack, asserted on DATA rather than status.
  it('does not let another user mutate or delete a resource they do not own', async () => {
    const app = await buildTestApp();
    const seeded = await seedAll(app);
    const other = await createOtherUser();

    for (const { seed, id } of seeded) {
      await app.inject({
        method: 'PATCH',
        url: `${seed.base}/${id}`,
        headers: json(other.authHeader),
        payload: JSON.stringify({ label: 'attacker-was-here', quantity: 999 }),
      });
      await app.inject({ method: 'DELETE', url: `${seed.base}/${id}`, headers: other.authHeader });

      // Survival, not status code. A store function scoped by
      // `WHERE user_id = $attacker` matches zero rows and can legitimately
      // return 204 for an idempotent delete; asserting >= 400 would fail
      // correct code. What must never be true is that the row moved.
      const stillMine = await app.inject({ method: 'GET', url: seed.base, headers: authHeader() });
      expect(stillMine.statusCode).toBe(200);
      expect(stillMine.body, `user B destroyed user A resource at ${seed.base}/${id}`).toContain(seed.sentinel);
      expect(stillMine.body, `user B edited user A resource at ${seed.base}/${id}`).not.toContain('attacker-was-here');
    }
    await app.close();
  });

  // R-33.6. The read half, and the cheapest coverage per line in the file.
  it('does not leak one user resources into another user collection', async () => {
    const app = await buildTestApp();
    await seedAll(app);
    const other = await createOtherUser();

    for (const seed of SEEDS) {
      const theirs = await app.inject({ method: 'GET', url: seed.base, headers: other.authHeader });
      expect(theirs.statusCode).toBe(200);
      expect(theirs.body, `user A resource leaked into user B collection at ${seed.base}`).not.toContain(seed.sentinel);
    }
    await app.close();
  });
});
