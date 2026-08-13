import { beforeEach, describe, expect, it } from 'vitest';
import { resetDatabase, testUserId } from './db-helper.js';

const DAY = 24 * 60 * 60 * 1000;

// One clock read for the whole file. Reading Date.now() per fixture made ages
// land a millisecond short of a whole day, so Math.floor turned 90 into 89
// whenever the two reads straddled a millisecond boundary. That happened under
// CI load and not locally, which is the worst way for a test to be wrong.
const NOW = new Date();

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * DAY);
}

describe('replaceDeclaredAssets', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('inserts a full sheet and returns it in canonical chip order', async () => {
    const { listDeclaredAssets, replaceDeclaredAssets } = await import('../src/store/declared-assets.js');
    const now = new Date();
    await replaceDeclaredAssets(
      testUserId,
      [
        { assetClass: 'home', bucketedValueUsd: 300000, declaredAt: now },
        { assetClass: 'checking', bucketedValueUsd: 5000, declaredAt: now },
        { assetClass: 'credit_cards', bucketedValueUsd: 2000, declaredAt: now },
      ],
      now,
    );

    const lines = await listDeclaredAssets(testUserId);
    expect(lines.map((l) => l.assetClass)).toEqual(['checking', 'credit_cards', 'home']);
  });

  it('stores a skipped amount as null, never zero', async () => {
    const { listDeclaredAssets, replaceDeclaredAssets } = await import('../src/store/declared-assets.js');
    const now = new Date();
    await replaceDeclaredAssets(testUserId, [{ assetClass: 'crypto', bucketedValueUsd: null, declaredAt: now }], now);

    const [line] = await listDeclaredAssets(testUserId);
    expect(line?.bucketedValueUsd).toBeNull();
  });

  it('stamps confidence declared on every line', async () => {
    const { listDeclaredAssets, replaceDeclaredAssets } = await import('../src/store/declared-assets.js');
    const now = new Date();
    await replaceDeclaredAssets(testUserId, [{ assetClass: 'savings', bucketedValueUsd: 10000, declaredAt: now }], now);

    const [line] = await listDeclaredAssets(testUserId);
    expect(line?.confidence).toBe('declared');
  });

  it('updates an existing line in place on re-declaration', async () => {
    const { listDeclaredAssets, replaceDeclaredAssets } = await import('../src/store/declared-assets.js');
    const first = daysAgo(10);
    await replaceDeclaredAssets(testUserId, [{ assetClass: 'car', bucketedValueUsd: 12000, declaredAt: first }], first);
    const now = new Date();
    await replaceDeclaredAssets(testUserId, [{ assetClass: 'car', bucketedValueUsd: 15000, declaredAt: now }], now);

    const lines = await listDeclaredAssets(testUserId);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.bucketedValueUsd).toBe(15000);
  });

  it('removes lines whose class is no longer declared', async () => {
    const { listDeclaredAssets, replaceDeclaredAssets } = await import('../src/store/declared-assets.js');
    const now = new Date();
    await replaceDeclaredAssets(
      testUserId,
      [
        { assetClass: 'checking', bucketedValueUsd: 5000, declaredAt: now },
        { assetClass: 'car', bucketedValueUsd: 12000, declaredAt: now },
      ],
      now,
    );
    await replaceDeclaredAssets(testUserId, [{ assetClass: 'checking', bucketedValueUsd: 5000, declaredAt: now }], now);

    const lines = await listDeclaredAssets(testUserId);
    expect(lines.map((l) => l.assetClass)).toEqual(['checking']);
  });

  it('clamps a future declaredAt to now so a bad clock cannot post-date a line', async () => {
    const { listDeclaredAssets, replaceDeclaredAssets } = await import('../src/store/declared-assets.js');
    const now = new Date();
    const future = new Date(now.getTime() + 30 * DAY);
    await replaceDeclaredAssets(
      testUserId,
      [{ assetClass: 'home', bucketedValueUsd: 250000, declaredAt: future }],
      now,
    );

    const [line] = await listDeclaredAssets(testUserId);
    expect(line?.declaredAt.getTime()).toBe(now.getTime());
  });

  it('never returns another user lines', async () => {
    const { findOrCreateUser } = await import('../src/store/users.js');
    const { listDeclaredAssets, replaceDeclaredAssets } = await import('../src/store/declared-assets.js');
    const otherId = await findOrCreateUser({ appleSub: 'other_sub', email: 'other@coiny.test' });
    const now = new Date();
    await replaceDeclaredAssets(otherId, [{ assetClass: 'home', bucketedValueUsd: 900000, declaredAt: now }], now);

    const lines = await listDeclaredAssets(testUserId);
    expect(lines).toEqual([]);
  });
});

describe('updateDeclaredAsset', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('updates the value and bumps refreshedAt while keeping declaredAt', async () => {
    const { listDeclaredAssets, replaceDeclaredAssets, updateDeclaredAsset } = await import(
      '../src/store/declared-assets.js'
    );
    const declared = daysAgo(90);
    await replaceDeclaredAssets(
      testUserId,
      [{ assetClass: 'car', bucketedValueUsd: 12000, declaredAt: declared }],
      declared,
    );

    const now = new Date();
    const line = await updateDeclaredAsset(testUserId, 'car', 10000, now);
    expect(line?.bucketedValueUsd).toBe(10000);
    expect(line?.refreshedAt.getTime()).toBe(now.getTime());

    const [stored] = await listDeclaredAssets(testUserId);
    expect(stored?.declaredAt.getTime()).toBe(declared.getTime());
  });

  it('returns null for a class the user never declared', async () => {
    const { updateDeclaredAsset } = await import('../src/store/declared-assets.js');
    const line = await updateDeclaredAsset(testUserId, 'brokerage', 5000, new Date());
    expect(line).toBeNull();
  });

  it('cannot touch another user line', async () => {
    const { findOrCreateUser } = await import('../src/store/users.js');
    const { listDeclaredAssets, replaceDeclaredAssets, updateDeclaredAsset } = await import(
      '../src/store/declared-assets.js'
    );
    const otherId = await findOrCreateUser({ appleSub: 'other_sub2', email: 'other2@coiny.test' });
    const now = new Date();
    await replaceDeclaredAssets(otherId, [{ assetClass: 'car', bucketedValueUsd: 12000, declaredAt: now }], now);

    const result = await updateDeclaredAsset(testUserId, 'car', 1, now);
    expect(result).toBeNull();

    const [untouched] = await listDeclaredAssets(otherId);
    expect(untouched?.bucketedValueUsd).toBe(12000);
  });
});

describe('deleteDeclaredAsset', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('removes the line and reports whether one existed', async () => {
    const { deleteDeclaredAsset, listDeclaredAssets, replaceDeclaredAssets } = await import(
      '../src/store/declared-assets.js'
    );
    const now = new Date();
    await replaceDeclaredAssets(testUserId, [{ assetClass: 'crypto', bucketedValueUsd: 3000, declaredAt: now }], now);

    expect(await deleteDeclaredAsset(testUserId, 'crypto')).toBe(true);
    expect(await deleteDeclaredAsset(testUserId, 'crypto')).toBe(false);
    expect(await listDeclaredAssets(testUserId)).toEqual([]);
  });
});

describe('declaredNetUsd', () => {
  it('adds assets and subtracts debt classes', async () => {
    const { declaredNetUsd } = await import('../src/store/declared-assets.js');
    const now = new Date();
    const line = (assetClass: 'home' | 'credit_cards' | 'student_loans', value: number) => ({
      assetClass,
      bucketedValueUsd: value,
      confidence: 'declared',
      declaredAt: now,
      refreshedAt: now,
    });
    expect(declaredNetUsd([line('home', 300000), line('credit_cards', 5000), line('student_loans', 20000)])).toBe(
      275000,
    );
  });

  it('ignores skipped lines instead of counting them as zero', async () => {
    const { declaredNetUsd } = await import('../src/store/declared-assets.js');
    const now = new Date();
    const lines = [
      {
        assetClass: 'checking' as const,
        bucketedValueUsd: 4000,
        confidence: 'declared',
        declaredAt: now,
        refreshedAt: now,
      },
      {
        assetClass: 'home' as const,
        bucketedValueUsd: null,
        confidence: 'declared',
        declaredAt: now,
        refreshedAt: now,
      },
    ];
    expect(declaredNetUsd(lines)).toBe(4000);
  });

  it('returns null when no line carries a value', async () => {
    const { declaredNetUsd } = await import('../src/store/declared-assets.js');
    const now = new Date();
    const lines = [
      {
        assetClass: 'home' as const,
        bucketedValueUsd: null,
        confidence: 'declared',
        declaredAt: now,
        refreshedAt: now,
      },
    ];
    expect(declaredNetUsd(lines)).toBeNull();
  });
});

describe('declaredNudgeCandidate', () => {
  it('picks the stalest valued line at or past 60 days', async () => {
    const { declaredNudgeCandidate } = await import('../src/store/declared-assets.js');
    const now = NOW;
    const lines = [
      {
        assetClass: 'car' as const,
        bucketedValueUsd: 12000,
        confidence: 'declared',
        declaredAt: daysAgo(70),
        refreshedAt: daysAgo(70),
      },
      {
        assetClass: 'home' as const,
        bucketedValueUsd: 300000,
        confidence: 'declared',
        declaredAt: daysAgo(90),
        refreshedAt: daysAgo(90),
      },
    ];
    expect(declaredNudgeCandidate(lines, now)).toEqual({ assetClass: 'home', ageDays: 90 });
  });

  it('returns null when everything was touched within 60 days', async () => {
    const { declaredNudgeCandidate } = await import('../src/store/declared-assets.js');
    const lines = [
      {
        assetClass: 'car' as const,
        bucketedValueUsd: 12000,
        confidence: 'declared',
        declaredAt: daysAgo(59),
        refreshedAt: daysAgo(59),
      },
    ];
    expect(declaredNudgeCandidate(lines, new Date())).toBeNull();
  });

  it('never nudges about a skipped line, however old', async () => {
    const { declaredNudgeCandidate } = await import('../src/store/declared-assets.js');
    const lines = [
      {
        assetClass: 'home' as const,
        bucketedValueUsd: null,
        confidence: 'declared',
        declaredAt: daysAgo(400),
        refreshedAt: daysAgo(400),
      },
    ];
    expect(declaredNudgeCandidate(lines, new Date())).toBeNull();
  });
});
