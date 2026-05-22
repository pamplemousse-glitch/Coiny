import { eq } from 'drizzle-orm';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetDatabase, testUserId } from './db-helper.js';

const sampleReaction = {
  animation: 'celebrate' as const,
  sound: 'fanfare' as const,
  led: 'rainbow' as const,
  duration: 3000,
  // The reason field is the highest-risk PII: free-text merchant name + amount.
  reason: 'paycheck_received (Starbucks $42.17)',
};

describe('reaction_history encryption at rest', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('stores reaction as AES-256-GCM ciphertext, never plaintext JSON', async () => {
    const { recordReaction } = await import('../src/store/pet.js');
    const { db } = await import('../src/db/client.js');
    const { reactionHistory } = await import('../src/db/schema.js');

    await recordReaction(testUserId, 'paycheck_received', sampleReaction);

    const rows = await db().select().from(reactionHistory).where(eq(reactionHistory.userId, testUserId));
    expect(rows).toHaveLength(1);
    const stored = rows[0]?.reaction ?? '';

    // Should be the envelope format: hex(iv):hex(tag):hex(ct)
    expect(stored).toMatch(/^[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);

    // Belt-and-suspenders: none of the sensitive plaintext substrings should
    // appear anywhere in the stored value.
    expect(stored).not.toContain('Starbucks');
    expect(stored).not.toContain('42.17');
    expect(stored).not.toContain('paycheck_received');
    expect(stored).not.toContain('celebrate');
  });

  it('round-trips: getState returns the original Reaction object', async () => {
    const { recordReaction, getState } = await import('../src/store/pet.js');

    await recordReaction(testUserId, 'paycheck_received', sampleReaction);
    const state = await getState(testUserId);

    expect(state.reactionHistory).toHaveLength(1);
    expect(state.reactionHistory[0]?.reaction).toEqual(sampleReaction);
  });
});
