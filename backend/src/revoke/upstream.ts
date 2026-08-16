import { eq } from 'drizzle-orm';
import type { FastifyBaseLogger } from 'fastify';
import { exchangeAuthorizationCode, isAppleRevocationConfigured, revokeToken } from '../apple/client.js';
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
import { getAppleGrant } from '../store/users.js';
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
//
// Apple is here and is the only entry Apple itself requires rather than a
// vendor: TN3194 makes revoking the Sign in with Apple grant part of account
// deletion, and it is checked at review.

export type RevocationResult =
  | 'revoked'
  | 'no_connection'
  | 'not_configured'
  // The grant exists and the provider supports revoking it, but we hold nothing
  // that authenticates the call. Only Apple can reach this: a user who signed
  // in before the authorization code was collected has no stored refresh token
  // and did not supply a fresh code at deletion. Distinct from 'failed', which
  // means we tried and the provider said no.
  | 'no_token'
  | 'unsupported_by_provider'
  | 'failed';

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
export interface RevocationOptions {
  /** A fresh Sign in with Apple authorization code, collected from the user at
   *  deletion time. Preferred over any stored refresh token because TN3194's
   *  own answer to "we hold no usable token" is to ask for a new code. */
  appleAuthorizationCode: string | null;
}

export async function revokeUpstreamGrants(
  userId: string,
  log: FastifyBaseLogger,
  options: RevocationOptions = { appleAuthorizationCode: null },
): Promise<RevocationOutcome[]> {
  const outcomes: RevocationOutcome[] = [
    await revokeApple(userId, log, options.appleAuthorizationCode),
    await revokeTrueLayer(userId, log),
    await revokeSpinwheel(userId, log),
  ];

  for (const { provider, table } of UNSUPPORTED) {
    const present = await hasConnection(table, userId);
    outcomes.push({ provider, result: present ? 'unsupported_by_provider' : 'no_connection' });
  }

  return outcomes;
}

// Apple is the one grant that is not optional. TN3194 makes revoking the Sign
// in with Apple grant part of what "delete my account" means, and App Review
// checks it: an account Coiny reports as deleted while still listed under
// Settings > Apple ID > Sign in with Apple is telling the user something
// untrue. Part 1 row 1.4.13 and Part 2 row 2.3.4 both record it as a blocker.
//
// It is still best-effort in exactly the same sense as every other provider
// here. Apple being unreachable at 2am cannot be the reason a right-to-delete
// request fails; the outcome is logged and the deletion continues.
//
// Order of preference for the token, from TN3194:
//   1. a fresh authorization code supplied with the deletion request, exchanged
//      here, which is the technote's own answer for "no usable token held"
//   2. the refresh token stored at sign-in
//   3. nothing, which is reported as `no_token` and not as success
export async function revokeApple(
  userId: string,
  log: FastifyBaseLogger,
  authorizationCode: string | null = null,
): Promise<RevocationOutcome> {
  const grant = await getAppleGrant(userId);
  // Google-only accounts have no Apple grant. Not a gap, just not applicable.
  if (!grant.appleSub) return { provider: 'apple', result: 'no_connection' };

  if (!isAppleRevocationConfigured()) {
    log.warn({ userId }, 'apple revocation skipped, sign in with apple rest credentials not configured');
    return { provider: 'apple', result: 'not_configured' };
  }

  let token = grant.refreshToken;
  if (authorizationCode) {
    try {
      token = (await exchangeAuthorizationCode(authorizationCode)) ?? token;
    } catch (err) {
      // A spent or expired code is the common case and is not a reason to stop:
      // fall through to whatever was stored at sign-in.
      log.warn(
        { err, userId },
        'apple authorization code exchange failed during deletion, falling back to stored token',
      );
    }
  }

  if (!token) {
    log.warn({ userId }, 'apple revocation skipped, no refresh token held and no authorization code supplied');
    return { provider: 'apple', result: 'no_token' };
  }

  try {
    await revokeToken(token, 'refresh_token');
    return { provider: 'apple', result: 'revoked' };
  } catch (err) {
    log.warn({ err, userId }, 'apple token revocation failed, continuing');
    return { provider: 'apple', result: 'failed' };
  }
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
