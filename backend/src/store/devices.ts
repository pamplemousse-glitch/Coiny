import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { db } from '../db/client.js';
import { deviceTokens } from '../db/schema.js';

export async function upsertDeviceToken(args: {
  token: string;
  platform: 'ios' | 'android';
  userId: string;
  // `string | undefined` explicitly: Zod's .optional() output carries the
  // undefined member, and exactOptionalPropertyTypes makes that distinct
  // from a merely absent property.
  timezone?: string | undefined;
  apsEnvironment?: 'development' | 'production' | undefined;
}): Promise<void> {
  // On re-registration, only overwrite the stored timezone when the client sent
  // one: an older app build re-registering without the field must not erase a
  // timezone a newer build already captured (R-9.3). Same rule for
  // apsEnvironment, for the same reason.
  const set: {
    platform: string;
    updatedAt: Date;
    timezone?: string;
    apsEnvironment?: 'development' | 'production';
  } = {
    platform: args.platform,
    updatedAt: new Date(),
  };
  if (args.timezone !== undefined) set.timezone = args.timezone;
  if (args.apsEnvironment !== undefined) set.apsEnvironment = args.apsEnvironment;

  await db()
    .insert(deviceTokens)
    .values({
      token: args.token,
      platform: args.platform,
      userId: args.userId,
      timezone: args.timezone ?? null,
      apsEnvironment: args.apsEnvironment ?? null,
    })
    .onConflictDoUpdate({
      target: deviceTokens.token,
      set,
    });
}

export async function listDeviceTokens(
  userId: string,
): Promise<{ token: string; platform: string; apsEnvironment: string | null }[]> {
  const rows = await db()
    .select({
      token: deviceTokens.token,
      platform: deviceTokens.platform,
      apsEnvironment: deviceTokens.apsEnvironment,
    })
    .from(deviceTokens)
    .where(eq(deviceTokens.userId, userId));
  return rows;
}

// Timezone of the most recently registered device that has one (R-9.3). Null
// when no device for this user carries a timezone; the caller must treat null
// as "suppress", never as an invitation to guess.
export async function latestDeviceTimezone(userId: string): Promise<string | null> {
  const rows = await db()
    .select({ timezone: deviceTokens.timezone })
    .from(deviceTokens)
    .where(and(eq(deviceTokens.userId, userId), isNotNull(deviceTokens.timezone)))
    .orderBy(desc(deviceTokens.updatedAt))
    .limit(1);
  return rows[0]?.timezone ?? null;
}
