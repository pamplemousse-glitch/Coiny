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

    // Should be the envelope format: v<n>:hex(iv):hex(tag):hex(ct)
    expect(stored).toMatch(/^v[0-9]{1,3}:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);

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

  it('each encryption call produces a unique IV (no nonce reuse)', async () => {
    const { encryptString } = await import('../src/util/crypto.js');
    const ivs = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const ct = encryptString(JSON.stringify(sampleReaction));
      const iv = ct.split(':')[1];
      ivs.add(iv!);
    }
    expect(ivs.size).toBe(50);
  });

  it('multiple reactions are all stored encrypted and all round-trip', async () => {
    const { recordReaction, getState } = await import('../src/store/pet.js');
    const { db } = await import('../src/db/client.js');
    const { reactionHistory } = await import('../src/db/schema.js');
    const { eq } = await import('drizzle-orm');

    const reactions = [
      { ...sampleReaction, animation: 'celebrate' as const, reason: 'paycheck ($3000.00)' },
      { ...sampleReaction, animation: 'sad' as const, reason: 'overspent (groceries $200.00)' },
      { ...sampleReaction, animation: 'happy' as const, reason: 'savings_milestone (50%)' },
    ] as const;

    for (const r of reactions) {
      await recordReaction(testUserId, 'test_event', r);
    }

    // All rows in DB must be ciphertext, not plaintext.
    const rows = await db().select().from(reactionHistory).where(eq(reactionHistory.userId, testUserId));
    for (const row of rows) {
      expect(row.reaction).toMatch(/^v[0-9]{1,3}:[0-9a-f]+:[0-9a-f]+:[0-9a-f]+$/);
      expect(row.reaction).not.toContain('animate');
      expect(row.reaction).not.toContain('paycheck');
      expect(row.reaction).not.toContain('groceries');
    }

    // getState decrypts all correctly.
    const state = await getState(testUserId);
    expect(state.reactionHistory).toHaveLength(3);
    const animations = state.reactionHistory.map((r) => r.reaction.animation);
    expect(animations).toContain('celebrate');
    expect(animations).toContain('sad');
    expect(animations).toContain('happy');
  });
});
