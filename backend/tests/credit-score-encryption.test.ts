import { beforeEach, describe, expect, it } from 'vitest';
import { resetDatabase, testUserId } from './db-helper.js';

// Audit 1.3.1 / runbook G2.10. `spinwheel_connections.last_credit_score` was a
// plaintext integer sitting beside an encrypted Plaid token and encrypted
// merchant names. Migration 0065 turned the column into an AES-256-GCM
// envelope; these tests pin that it stays one.

async function connectSpinwheel() {
  const { db } = await import('../src/db/client.js');
  const { spinwheelConnections } = await import('../src/db/schema.js');
  await db().insert(spinwheelConnections).values({
    userId: testUserId,
    spinwheelUserId: 'sw_user_1',
  });
}

async function rawStoredScore(): Promise<string | null> {
  const { db } = await import('../src/db/client.js');
  const { spinwheelConnections } = await import('../src/db/schema.js');
  const [row] = await db().select().from(spinwheelConnections);
  return row?.lastCreditScore ?? null;
}

describe('credit score at rest', () => {
  beforeEach(async () => {
    await resetDatabase();
    await connectSpinwheel();
  });

  // The whole point. A database dump must not yield a credit score.
  it('does not store the score in readable form', async () => {
    const { setLastCreditScore } = await import('../src/store/spinwheel.js');

    await setLastCreditScore(testUserId, 742);

    const stored = await rawStoredScore();
    expect(stored).not.toBeNull();
    expect(stored).not.toBe('742');
    expect(stored).not.toContain('742');
  });

  it('round-trips the score for the application', async () => {
    const { getLastCreditScore, setLastCreditScore } = await import('../src/store/spinwheel.js');

    await setLastCreditScore(testUserId, 742);

    expect(await getLastCreditScore(testUserId)).toBe(742);
  });

  it('reports null when no score has ever been stored', async () => {
    const { getLastCreditScore } = await import('../src/store/spinwheel.js');

    expect(await getLastCreditScore(testUserId)).toBeNull();
  });

  // Migration 0065 casts the old integer to text, so pre-existing rows hold
  // decimal digits in a column that now expects an envelope. decryptString
  // returns a non-envelope value as it found it, which is the tolerance
  // ALLOW_LEGACY_PLAINTEXT_READS exists for. Those rows must keep working.
  it('still reads a pre-migration plaintext score', async () => {
    const { db } = await import('../src/db/client.js');
    const { spinwheelConnections } = await import('../src/db/schema.js');
    const { getLastCreditScore } = await import('../src/store/spinwheel.js');

    await db().update(spinwheelConnections).set({ lastCreditScore: '681' });

    expect(await getLastCreditScore(testUserId)).toBe(681);
  });

  // A score that will not parse must not take down the route that also returns
  // the user's debts. A reaction threshold is not worth a 500.
  it('returns null rather than throwing on an undecodable value', async () => {
    const { decodeScore } = await import('../src/store/spinwheel.js');

    expect(decodeScore('not-a-score')).toBeNull();
  });

  it('overwrites cleanly on a second write', async () => {
    const { getLastCreditScore, setLastCreditScore } = await import('../src/store/spinwheel.js');

    await setLastCreditScore(testUserId, 700);
    await setLastCreditScore(testUserId, 715);

    expect(await getLastCreditScore(testUserId)).toBe(715);
  });
});
