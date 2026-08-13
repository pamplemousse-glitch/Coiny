import { eq } from 'drizzle-orm';
import { config } from '../config.js';
import { db } from '../db/client.js';
import { truelayerConnections } from '../db/schema.js';
import { decryptString, encryptString } from '../util/crypto.js';
import type { TrueLayerEnv } from './client.js';
import { refreshAccessToken } from './client.js';

export type TrueLayerConnection = typeof truelayerConnections.$inferSelect;

const REFRESH_BUFFER_MS = 5 * 60 * 1000; // refresh when < 5 min to expiry

// Lives here rather than in api/truelayer.ts because account deletion needs the
// same logic: revoking a grant requires a live access token, and the stored one
// is very often expired by the time somebody deletes their account.
export async function getTrueLayerAccessToken(userId: string, conn: TrueLayerConnection): Promise<string> {
  const expiresAt = conn.expiresAt.getTime();
  if (expiresAt - Date.now() >= REFRESH_BUFFER_MS) {
    return decryptString(conn.accessToken);
  }

  if (!config.TRUELAYER_CLIENT_ID || !config.TRUELAYER_CLIENT_SECRET) {
    throw new Error('TrueLayer not configured, cannot refresh');
  }

  const env = config.TRUELAYER_ENV as TrueLayerEnv;
  const tokens = await refreshAccessToken(
    decryptString(conn.refreshToken),
    config.TRUELAYER_CLIENT_ID,
    config.TRUELAYER_CLIENT_SECRET,
    env,
  );

  await db()
    .update(truelayerConnections)
    .set({
      accessToken: encryptString(tokens.accessToken),
      expiresAt: new Date(Date.now() + tokens.expiresIn * 1000),
    })
    .where(eq(truelayerConnections.userId, userId));

  return tokens.accessToken;
}
