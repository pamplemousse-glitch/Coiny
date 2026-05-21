import { eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { deviceTokens } from '../db/schema.js';

export async function upsertDeviceToken(args: {
  token: string;
  platform: 'ios' | 'android';
  userId: string;
}): Promise<void> {
  await db()
    .insert(deviceTokens)
    .values({ token: args.token, platform: args.platform, userId: args.userId })
    .onConflictDoUpdate({
      target: deviceTokens.token,
      set: { platform: args.platform, updatedAt: new Date() },
    });
}

export async function listDeviceTokens(userId: string): Promise<{ token: string; platform: string }[]> {
  const rows = await db()
    .select({ token: deviceTokens.token, platform: deviceTokens.platform })
    .from(deviceTokens)
    .where(eq(deviceTokens.userId, userId));
  return rows;
}
