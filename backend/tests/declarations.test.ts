import { beforeEach, describe, expect, it } from 'vitest';
import { resetDatabase, testUserId } from './db-helper.js';

const NOW = new Date('2026-08-12T00:00:00Z');

describe('declarations store', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('returns engine defaults (nulls) when nothing was declared', async () => {
    const { getDeclarations } = await import('../src/store/declarations.js');
    const decl = await getDeclarations(testUserId);
    expect(decl.shelteredTargetRate).toBeNull();
    expect(decl.surplusTargetRate).toBeNull();
  });

  it('round-trips a declared rate', async () => {
    const { getDeclarations, updateDeclarations } = await import('../src/store/declarations.js');
    await updateDeclarations(testUserId, { shelteredTargetRate: 0.12 }, NOW);
    const decl = await getDeclarations(testUserId);
    expect(decl.shelteredTargetRate).toBeCloseTo(0.12, 5);
  });

  it('leaves an absent field untouched on partial update', async () => {
    const { getDeclarations, updateDeclarations } = await import('../src/store/declarations.js');
    await updateDeclarations(testUserId, { shelteredTargetRate: 0.12, surplusTargetRate: 0.3 }, NOW);
    await updateDeclarations(testUserId, { surplusTargetRate: 0.25 }, NOW);

    const decl = await getDeclarations(testUserId);
    expect(decl.shelteredTargetRate).toBeCloseTo(0.12, 5);
    expect(decl.surplusTargetRate).toBeCloseTo(0.25, 5);
  });

  it('clears an override back to the default with an explicit null', async () => {
    const { getDeclarations, updateDeclarations } = await import('../src/store/declarations.js');
    await updateDeclarations(testUserId, { surplusTargetRate: 0.3 }, NOW);
    await updateDeclarations(testUserId, { surplusTargetRate: null }, NOW);
    expect((await getDeclarations(testUserId)).surplusTargetRate).toBeNull();
  });

  it('scopes declarations by user', async () => {
    const { getDeclarations, updateDeclarations } = await import('../src/store/declarations.js');
    const { findOrCreateUser } = await import('../src/store/users.js');
    const otherUser = await findOrCreateUser({ appleSub: 'other_sub_decl', email: 'other@coiny.test' });

    await updateDeclarations(testUserId, { shelteredTargetRate: 0.12 }, NOW);
    expect((await getDeclarations(otherUser)).shelteredTargetRate).toBeNull();
  });
});
