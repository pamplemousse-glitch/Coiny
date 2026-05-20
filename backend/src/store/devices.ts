import { db } from '../db/client.js';
import { deviceTokens } from '../db/schema.js';

export async function upsertDeviceToken(args: {
  token: string;
  platform: 'ios' | 'android';
}): Promise<void> {
  await db()
    .insert(deviceTokens)
    .values({ token: args.token, platform: args.platform })
    .onConflictDoUpdate({
      target: deviceTokens.token,
      set: { platform: args.platform, updatedAt: new Date() },
    });
}

export async function listDeviceTokens(): Promise<{ token: string; platform: string }[]> {
  const rows = await db().select().from(deviceTokens);
  return rows.map((r) => ({ token: r.token, platform: r.platform }));
}
