// Persistence for the onboarding declaration sheet (docs/prd.md R-5.3).
// One row per declared line, at most one line per asset class per user,
// every read and write scoped by userId (.claude/rules/security.md #6).
//
// Values are the log-slider's bucketed magnitudes, stored positive; whether a
// class subtracts from net worth is a property of the class (credit_cards,
// student_loans), never the sign of the stored number. This is why the sheet
// does not live in manual_assets: that table's nonnegative values ARE the
// asset value, so a declared credit card balance written there would inflate
// the total instead of reducing it.

import { and, eq } from 'drizzle-orm';
import { db } from '../db/client.js';
import { declaredAssets } from '../db/schema.js';

/** The onboarding chip list (prd.md section 5.2 screen 2), as the stable
 *  snake_case tokens the iOS model already uses for telemetry. */
export const DECLARED_ASSET_CLASSES = [
  'checking',
  'savings',
  'credit_cards',
  'retirement',
  'brokerage',
  'crypto',
  'car',
  'home',
  'student_loans',
  'business',
  'collectibles',
  'other',
] as const;

export type DeclaredAssetClassName = (typeof DECLARED_ASSET_CLASSES)[number];

/** Classes whose declared magnitude reduces net worth. */
const DEBT_CLASSES: ReadonlySet<DeclaredAssetClassName> = new Set(['credit_cards', 'student_loans']);

export function isDeclaredDebtClass(assetClass: DeclaredAssetClassName): boolean {
  return DEBT_CLASSES.has(assetClass);
}

export type DeclaredAssetLine = {
  assetClass: DeclaredAssetClassName;
  /** Bucketed magnitude, always >= 0; null means "has it, skipped the amount". */
  bucketedValueUsd: number | null;
  confidence: string;
  declaredAt: Date;
  refreshedAt: Date;
};

export type DeclaredAssetInput = {
  assetClass: DeclaredAssetClassName;
  bucketedValueUsd: number | null;
  declaredAt: Date;
};

function toLine(row: typeof declaredAssets.$inferSelect): DeclaredAssetLine {
  const value = row.bucketedValueUsd !== null ? parseFloat(row.bucketedValueUsd) : null;
  return {
    assetClass: row.assetClass as DeclaredAssetClassName,
    bucketedValueUsd: value !== null && Number.isFinite(value) ? value : null,
    confidence: row.confidence,
    declaredAt: row.declaredAt,
    refreshedAt: row.refreshedAt,
  };
}

/** Canonical chip order, so every consumer renders the sheet the same way. */
function ordered(lines: DeclaredAssetLine[]): DeclaredAssetLine[] {
  const rank = new Map(DECLARED_ASSET_CLASSES.map((c, i) => [c, i]));
  return [...lines].sort((a, b) => (rank.get(a.assetClass) ?? 99) - (rank.get(b.assetClass) ?? 99));
}

export async function listDeclaredAssets(userId: string): Promise<DeclaredAssetLine[]> {
  const rows = await db().select().from(declaredAssets).where(eq(declaredAssets.userId, userId));
  return ordered(rows.map(toLine));
}

/** Replace the user's whole sheet with the given lines: upsert each line and
 *  delete lines whose class is no longer declared. Used by the onboarding sync
 *  (the device PUTs the full sheet). declaredAt is the client's declaration
 *  time (clamped to now so a bad clock cannot post-date a line); refreshedAt
 *  is stamped server-side now, since a full-sheet write is the user restating
 *  the whole sheet. */
export async function replaceDeclaredAssets(
  userId: string,
  lines: DeclaredAssetInput[],
  now: Date = new Date(),
): Promise<DeclaredAssetLine[]> {
  const keep = new Set(lines.map((l) => l.assetClass));

  const existing = await db().select().from(declaredAssets).where(eq(declaredAssets.userId, userId));
  for (const row of existing) {
    if (!keep.has(row.assetClass as DeclaredAssetClassName)) {
      await db()
        .delete(declaredAssets)
        .where(and(eq(declaredAssets.userId, userId), eq(declaredAssets.id, row.id)));
    }
  }

  for (const line of lines) {
    const declaredAt = line.declaredAt.getTime() > now.getTime() ? now : line.declaredAt;
    const values = {
      userId,
      assetClass: line.assetClass,
      bucketedValueUsd: line.bucketedValueUsd !== null ? String(line.bucketedValueUsd) : null,
      confidence: 'declared',
      declaredAt,
      refreshedAt: now,
    };
    await db()
      .insert(declaredAssets)
      .values(values)
      .onConflictDoUpdate({
        target: [declaredAssets.userId, declaredAssets.assetClass],
        set: {
          bucketedValueUsd: values.bucketedValueUsd,
          declaredAt: values.declaredAt,
          refreshedAt: values.refreshedAt,
        },
      });
  }

  return listDeclaredAssets(userId);
}

/** Update one line's value (the R-5.4 refresh action). Bumps refreshedAt but
 *  keeps declaredAt: "first told us" and "last confirmed" stay distinct.
 *  Returns null when the user has no such line. */
export async function updateDeclaredAsset(
  userId: string,
  assetClass: DeclaredAssetClassName,
  bucketedValueUsd: number | null,
  now: Date = new Date(),
): Promise<DeclaredAssetLine | null> {
  const [row] = await db()
    .update(declaredAssets)
    .set({
      bucketedValueUsd: bucketedValueUsd !== null ? String(bucketedValueUsd) : null,
      refreshedAt: now,
    })
    .where(and(eq(declaredAssets.userId, userId), eq(declaredAssets.assetClass, assetClass)))
    .returning();
  return row ? toLine(row) : null;
}

export async function deleteDeclaredAsset(userId: string, assetClass: DeclaredAssetClassName): Promise<boolean> {
  const rows = await db()
    .delete(declaredAssets)
    .where(and(eq(declaredAssets.userId, userId), eq(declaredAssets.assetClass, assetClass)))
    .returning({ id: declaredAssets.id });
  return rows.length > 0;
}

/** Signed net of a sheet: assets add, debt classes subtract, skipped lines
 *  contribute nothing. Null when no line carries a value, because a number we
 *  cannot compute is never rendered as zero. */
export function declaredNetUsd(lines: DeclaredAssetLine[]): number | null {
  let net = 0;
  let any = false;
  for (const line of lines) {
    if (line.bucketedValueUsd === null) continue;
    any = true;
    net += isDeclaredDebtClass(line.assetClass) ? -line.bucketedValueUsd : line.bucketedValueUsd;
  }
  return any ? net : null;
}

/** The oldest refreshedAt across the sheet, so the class's age is honest. */
export function oldestRefreshedAt(lines: DeclaredAssetLine[]): Date | null {
  let oldest: Date | null = null;
  for (const line of lines) {
    if (oldest === null || line.refreshedAt.getTime() < oldest.getTime()) oldest = line.refreshedAt;
  }
  return oldest;
}

const DAY_MS = 24 * 60 * 60 * 1000;
export const NUDGE_AGE_DAYS = 60;

export type DeclaredNudgeCandidate = {
  assetClass: DeclaredAssetClassName;
  ageDays: number;
};

/** The R-5.4 nudge candidate: the stalest valued line 60 or more days since
 *  last touch, or null. Staleness here drives a quiet in-app prompt only; it
 *  NEVER excludes the value from the total (R-8.2). The at-most-once-a-week
 *  display throttle is the client's, since "shown" is a UI fact. */
export function declaredNudgeCandidate(
  lines: DeclaredAssetLine[],
  now: Date = new Date(),
): DeclaredNudgeCandidate | null {
  let candidate: DeclaredNudgeCandidate | null = null;
  for (const line of lines) {
    if (line.bucketedValueUsd === null) continue;
    const ageDays = Math.floor((now.getTime() - line.refreshedAt.getTime()) / DAY_MS);
    if (ageDays < NUDGE_AGE_DAYS) continue;
    if (candidate === null || ageDays > candidate.ageDays) {
      candidate = { assetClass: line.assetClass, ageDays };
    }
  }
  return candidate;
}
