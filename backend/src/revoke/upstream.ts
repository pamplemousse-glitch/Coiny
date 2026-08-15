import { eq } from 'drizzle-orm';
import type { FastifyBaseLogger } from 'fastify';
import { config } from '../config.js';
import { db } from '../db/client.js';
import {
  alpacaConnections,
  discogsConnections,
  kalshiConnections,
  krakenConnections,
  spinwheelConnections,
  truelayerConnections,
  ynabConnections,
} from '../db/schema.js';
import { deleteUser as deleteSpinwheelUser } from '../spinwheel/client.js';
import type { TrueLayerEnv } from '../truelayer/client.js';
import { deleteCredential } from '../truelayer/client.js';
import { getTrueLayerAccessToken } from '../truelayer/tokens.js';

// Deleting our row ends our access. It does not end the user's authorization at
// the provider, which keeps sitting in their connected-apps list looking live.
// S-27 tells the user deletion removes their connections, so leaving a grant
// standing makes that copy false, and PRD R-15.6 rates it MAJOR.
//
// Plaid is deliberately absent from this module: `DELETE /api/account` already
// calls `itemRemove` per item, and moving it here would change the ordering
// relative to the cascade delete for no gain.

export type RevocationResult = 'revoked' | 'no_connection' | 'not_configured' | 'unsupported_by_provider' | 'failed';

export interface RevocationOutcome {
  provider: string;
  result: RevocationResult;
}

// Providers whose credential we hold but cannot programmatically revoke.
//
// YNAB: personal access tokens are revocable from the user's Developer Settings
//   screen, but no API endpoint exists for an app to revoke its own OAuth grant.
//   Verified against https://api.ynab.com/ 2026-08-13.
// Discogs: OAuth 1.0a, no documented revocation endpoint. Users revoke from
//   their Discogs account settings. Verified against docs/context/discogs.md and
//   the developer docs 2026-08-13.
// Kraken, Kalshi, Alpaca: the user pastes an API key they minted themselves in
//   the provider's dashboard. No provider offers an endpoint that lets a key
//   holder delete that key, so the only revocation is the user's own dashboard.
//   These are also the three grants that can carry trade rights, which is why
//   they are named here rather than left out: the deletion audit line has to say
//   a credential existed and was not revocable, and the privacy policy's
//   "revoke at the source" paragraph has to name them.
// Coinbase: `POST https://login.coinbase.com/oauth2/revoke` exists, but no
//   Coinbase OAuth flow is wired in this codebase. `coinbase_connections.mode`
//   is only ever 'dev_key' today (api/coinbase.ts exposes connect/dev-key and
//   nothing else), and a dev key is our own server credential, not a user grant,
//   so there is nothing user-authorized to revoke. Wire the revoke call at the
//   same time as the OAuth flow, not before: an unused code path against an
//   unconfigured client secret would rot silently.
type UnsupportedTable =
  | typeof ynabConnections
  | typeof discogsConnections
  | typeof krakenConnections
  | typeof kalshiConnections
  | typeof alpacaConnections;

const UNSUPPORTED: ReadonlyArray<{ provider: string; table: UnsupportedTable }> = [
  { provider: 'ynab', table: ynabConnections },
  { provider: 'discogs', table: discogsConnections },
  { provider: 'kraken', table: krakenConnections },
  { provider: 'kalshi', table: kalshiConnections },
  { provider: 'alpaca', table: alpacaConnections },
];

// Best-effort revocation of every upstream grant we can end programmatically.
//
// Never throws. A provider outage must not block the right to delete: GLBA and
// CCPA both give the user a deletion right that does not depend on a third
// party being reachable, so every failure is logged and stepped over. The
// returned outcomes let the caller log what actually happened.
export async function revokeUpstreamGrants(userId: string, log: FastifyBaseLogger): Promise<RevocationOutcome[]> {
  const outcomes: RevocationOutcome[] = [await revokeTrueLayer(userId, log), await revokeSpinwheel(userId, log)];

  for (const { provider, table } of UNSUPPORTED) {
    const present = await hasConnection(table, userId);
    outcomes.push({ provider, result: present ? 'unsupported_by_provider' : 'no_connection' });
  }

  return outcomes;
}

export async function revokeTrueLayer(userId: string, log: FastifyBaseLogger): Promise<RevocationOutcome> {
  const [conn] = await db().select().from(truelayerConnections).where(eq(truelayerConnections.userId, userId));
  if (!conn) return { provider: 'truelayer', result: 'no_connection' };

  if (!config.TRUELAYER_CLIENT_ID || !config.TRUELAYER_CLIENT_SECRET) {
    log.warn({ userId }, 'truelayer revocation skipped, client credentials not configured');
    return { provider: 'truelayer', result: 'not_configured' };
  }

  try {
    // Refreshing first is the point: a stored access token is usually expired by
    // the time somebody deletes their account, and revoking with a dead token
    // would report success while leaving the grant standing.
    const accessToken = await getTrueLayerAccessToken(userId, conn);
    await deleteCredential(accessToken, config.TRUELAYER_ENV as TrueLayerEnv);
    return { provider: 'truelayer', result: 'revoked' };
  } catch (err) {
    log.warn({ err, userId }, 'truelayer credential deletion failed, continuing');
    return { provider: 'truelayer', result: 'failed' };
  }
}

// Spinwheel is the one provider where deletion is the whole point: connecting
// hands over a phone number and a date of birth and triggers an Equifax pull,
// so a Coiny account deletion that left the Spinwheel user standing would leave
// the highest-sensitivity record we ever create sitting at a credit-bureau
// aggregator. `DELETE /api/spinwheel/connect` already calls this; account
// deletion must do at least as much as disconnecting one connection.
export async function revokeSpinwheel(userId: string, log: FastifyBaseLogger): Promise<RevocationOutcome> {
  const [conn] = await db().select().from(spinwheelConnections).where(eq(spinwheelConnections.userId, userId));
  if (!conn) return { provider: 'spinwheel', result: 'no_connection' };

  if (!config.SPINWHEEL_SECRET_KEY) {
    log.warn({ userId }, 'spinwheel revocation skipped, secret key not configured');
    return { provider: 'spinwheel', result: 'not_configured' };
  }

  try {
    await deleteSpinwheelUser(conn.spinwheelUserId);
    return { provider: 'spinwheel', result: 'revoked' };
  } catch (err) {
    log.warn({ err, userId }, 'spinwheel user deletion failed, continuing');
    return { provider: 'spinwheel', result: 'failed' };
  }
}

async function hasConnection(table: UnsupportedTable, userId: string): Promise<boolean> {
  const rows = await db().select({ userId: table.userId }).from(table).where(eq(table.userId, userId));
  return rows.length > 0;
}
