import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { coinbaseConnections } from '../db/schema.js';
import { decryptString, encryptString } from '../util/crypto.js';

type CoinbaseRow = typeof coinbaseConnections.$inferSelect;
export type CoinbaseConnection = Omit<CoinbaseRow, 'accessToken' | 'refreshToken'> & {
  accessToken: string | null;
  refreshToken: string | null;
};

function decrypt(row: CoinbaseRow): CoinbaseConnection {
  return {
    ...row,
    accessToken: row.accessToken ? decryptString(row.accessToken) : null,
    refreshToken: row.refreshToken ? decryptString(row.refreshToken) : null,
  };
}

export async function getCoinbaseConnection(userId: string): Promise<CoinbaseConnection | null> {
  const rows = await db().select().from(coinbaseConnections).where(eq(coinbaseConnections.userId, userId));
  return rows[0] ? decrypt(rows[0]) : null;
}

export async function upsertCoinbaseDevKey(userId: string): Promise<void> {
  await db()
    .insert(coinbaseConnections)
    .values({ userId, mode: 'dev_key' })
    .onConflictDoUpdate({
      target: coinbaseConnections.userId,
      set: { mode: 'dev_key', accessToken: null, refreshToken: null, tokenExpiresAt: null },
    });
}

export async function upsertCoinbaseOAuth(args: {
  userId: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: Date;
}): Promise<void> {
  await db()
    .insert(coinbaseConnections)
    .values({
      userId: args.userId,
      mode: 'oauth',
      accessToken: encryptString(args.accessToken),
      refreshToken: encryptString(args.refreshToken),
      tokenExpiresAt: args.tokenExpiresAt,
    })
    .onConflictDoUpdate({
      target: coinbaseConnections.userId,
      set: {
        mode: 'oauth',
        accessToken: encryptString(args.accessToken),
        refreshToken: encryptString(args.refreshToken),
        tokenExpiresAt: args.tokenExpiresAt,
      },
    });
}

export async function deleteCoinbaseConnection(userId: string): Promise<void> {
  await db().delete(coinbaseConnections).where(eq(coinbaseConnections.userId, userId));
}
