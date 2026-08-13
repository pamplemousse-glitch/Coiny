// The debt dedupe layer (docs/prd.md R-7.13).
//
// Plaid Liabilities and Spinwheel both report debt accounts, and a user who
// connects both would otherwise see the same credit card twice: twice the
// balance, twice the minimum payment, and ladder rung 3 judged against phantom
// debt. This module keeps one normalized row per (source, account) in
// `debt_source_accounts` and derives `debt_accounts`, one row per real-world
// debt, from them.
//
// Match key (R-7.13): (normalized_issuer, last4 or open_date, credit_limit).
// Source precedence is asymmetric on purpose:
//   - Plaid wins on balance and minimum payment: it syncs daily, the bureau
//     reports on a monthly cycle.
//   - Spinwheel wins on APR and credit limit: bureau data is more complete.
// A single "most recent source wins" rule would blend those wrongly.
//
// When automatic matching is wrong, the user's verdict is recorded in
// `debt_merge_decisions` keyed by source ids, so it survives every re-sync
// and rebuild: 'same' forces a merge, 'different' vetoes one.
//
// Security: never log issuer names, balances, or last4. Callers log debt_id
// and user_id only.

import { randomUUID } from 'node:crypto';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db/client.js';
import { debtAccounts, debtMergeDecisions, debtPlanSettings, debtSourceAccounts } from '../db/schema.js';
import { HIGH_APR_THRESHOLD } from '../goals/ladder.js';
import type { LiabilitiesGetResponse } from '../plaid/types.js';
import type { SpinwheelDebt } from '../spinwheel/client.js';

export type DebtSource = 'plaid' | 'spinwheel';

export type DebtType = 'credit_card' | 'student_loan' | 'mortgage' | 'auto_loan' | 'personal_loan' | 'loan' | 'other';

export type DebtStatus = 'open' | 'delinquent' | 'closed';

/** A normalized per-source debt row, the input to the dedupe. */
export type SourceDebtRecord = {
  sourceAccountId: string;
  issuer: string | null;
  last4: string | null;
  openDate: string | null;
  type: DebtType;
  balance: number | null;
  apr: number | null; // percent, 18 means 18%
  minPayment: number | null;
  creditLimit: number | null;
  dueDate: string | null;
  accountStatus: DebtStatus | null;
};

export type DebtAccountRecord = {
  debtId: string;
  issuer: string;
  nickname: string | null;
  type: DebtType;
  sourceIds: string[];
  balance: number | null;
  apr: number | null;
  aprOverride: number | null;
  minPayment: number | null;
  creditLimit: number | null;
  dueDay: number | null;
  statementCloseDay: number | null;
  isPromotional: boolean;
  promoEndDate: string | null;
  promoApr: number | null;
  status: DebtStatus;
};

export function sourceKey(source: DebtSource, sourceAccountId: string): string {
  return `${source}:${sourceAccountId}`;
}

// Issuer aliases: bureau tradelines say "AMEX" where the bank feed says
// "American Express National Bank". Matching happens on the squashed
// lowercase string, so each pattern here is also squashed.
const ISSUER_ALIASES: [pattern: string, canonical: string][] = [
  ['americanexpress', 'amex'],
  ['amex', 'amex'],
  ['bankofamerica', 'bankofamerica'],
  ['bofa', 'bankofamerica'],
  ['jpmorgan', 'chase'],
  ['chase', 'chase'],
  ['citibank', 'citi'],
  ['citicard', 'citi'],
  ['citi', 'citi'],
  ['capitalone', 'capitalone'],
  ['capone', 'capitalone'],
  ['wellsfargo', 'wellsfargo'],
  ['discover', 'discover'],
  ['usbank', 'usbank'],
  ['synchrony', 'synchrony'],
  ['barclay', 'barclays'],
  ['usaa', 'usaa'],
  ['navyfederal', 'navyfederal'],
  ['pncbank', 'pnc'],
  ['pnc', 'pnc'],
  ['tdbank', 'td'],
  ['goldmansachs', 'goldmansachs'],
  ['sofi', 'sofi'],
  ['navient', 'navient'],
  ['nelnet', 'nelnet'],
  ['mohela', 'mohela'],
  ['salliemae', 'salliemae'],
];

/** Lowercase, strip everything but letters and digits, then canonicalize
 *  known issuer aliases. Null in, null out: an unknown issuer must never
 *  normalize to a matchable empty string. */
export function normalizeIssuer(issuer: string | null): string | null {
  if (issuer === null) return null;
  const squashed = issuer.toLowerCase().replace(/[^a-z0-9]/g, '');
  if (squashed.length === 0) return null;
  for (const [pattern, canonical] of ISSUER_ALIASES) {
    if (squashed.includes(pattern)) return canonical;
  }
  return squashed;
}

type SourceRow = {
  key: string;
  source: DebtSource;
  sourceAccountId: string;
  issuer: string | null;
  normalizedIssuer: string | null;
  last4: string | null;
  openDate: string | null;
  type: DebtType;
  balance: number | null;
  apr: number | null;
  minPayment: number | null;
  creditLimit: number | null;
  dueDate: string | null;
  accountStatus: DebtStatus | null;
  syncedAt: Date;
};

const GENERIC_TYPES = new Set<DebtType>(['loan', 'other']);

function typesCompatible(a: DebtType, b: DebtType): boolean {
  return a === b || GENERIC_TYPES.has(a) || GENERIC_TYPES.has(b);
}

/** The automatic match: same normalized issuer, same identity (last4 when both
 *  report one, otherwise open date when both report one), compatible credit
 *  limits. Deliberately conservative: when neither identity field is
 *  comparable on both sides there is no auto-match, only the manual
 *  affordance. Only rows from DIFFERENT sources auto-match; two accounts from
 *  the same source are distinct by definition. */
export function autoMatch(a: SourceRow, b: SourceRow): boolean {
  if (a.source === b.source) return false;
  if (a.normalizedIssuer === null || b.normalizedIssuer === null) return false;
  if (a.normalizedIssuer !== b.normalizedIssuer) return false;
  if (!typesCompatible(a.type, b.type)) return false;

  // Identity: last4 takes priority when both sides have one. Two cards at the
  // same issuer with different last4 are different cards, whatever else agrees.
  if (a.last4 !== null && b.last4 !== null) {
    if (a.last4 !== b.last4) return false;
  } else if (a.openDate !== null && b.openDate !== null) {
    if (a.openDate !== b.openDate) return false;
  } else {
    return false;
  }

  // Credit limit: must agree when both sides report one (1% tolerance for
  // reporting-date drift); a missing limit on either side is compatible.
  if (a.creditLimit !== null && b.creditLimit !== null) {
    const tolerance = Math.max(1, 0.01 * Math.max(a.creditLimit, b.creditLimit));
    if (Math.abs(a.creditLimit - b.creditLimit) > tolerance) return false;
  }
  return true;
}

function num(v: string | null): number | null {
  if (v === null) return null;
  const parsed = Number.parseFloat(v);
  return Number.isNaN(parsed) ? null : parsed;
}

function str(v: number | null): string | null {
  return v === null ? null : String(v);
}

function pairKey(keyA: string, keyB: string): [string, string] {
  return keyA < keyB ? [keyA, keyB] : [keyB, keyA];
}

function dayOfMonth(isoDate: string | null): number | null {
  if (isoDate === null) return null;
  const match = /^\d{4}-\d{2}-(\d{2})/.exec(isoDate);
  if (!match) return null;
  const day = Number.parseInt(match[1] as string, 10);
  return day >= 1 && day <= 31 ? day : null;
}

// ---------------------------------------------------------------------------
// Ingestion
// ---------------------------------------------------------------------------

/** Replace all of one source's rows for a user, then rebuild the merged
 *  records. Replace-all keeps a paid-off or unlinked account from lingering
 *  with a stale balance. */
export async function upsertSourceDebts(
  userId: string,
  source: DebtSource,
  records: SourceDebtRecord[],
): Promise<void> {
  const now = new Date();
  await db()
    .delete(debtSourceAccounts)
    .where(and(eq(debtSourceAccounts.userId, userId), eq(debtSourceAccounts.source, source)));

  if (records.length > 0) {
    await db()
      .insert(debtSourceAccounts)
      .values(
        records.map((r) => ({
          userId,
          source,
          sourceAccountId: r.sourceAccountId,
          issuer: r.issuer ?? null,
          normalizedIssuer: normalizeIssuer(r.issuer),
          last4: r.last4 ?? null,
          openDate: r.openDate ?? null,
          type: r.type,
          balance: str(r.balance),
          apr: str(r.apr),
          minPayment: str(r.minPayment),
          creditLimit: str(r.creditLimit),
          dueDate: r.dueDate ?? null,
          accountStatus: r.accountStatus ?? null,
          syncedAt: now,
        })),
      );
  }
  await rebuildDebtAccounts(userId);
}

const PLAID_DEBT_ACCOUNT_TYPES = new Set(['credit', 'loan']);

function plaidDebtType(accountType: string, subtype: string | null): DebtType {
  if (accountType === 'credit') return 'credit_card';
  const s = (subtype ?? '').toLowerCase();
  if (s === 'student') return 'student_loan';
  if (s === 'mortgage' || s === 'home equity') return 'mortgage';
  if (s === 'auto') return 'auto_loan';
  if (s === 'consumer' || s === 'personal') return 'personal_loan';
  return 'loan';
}

/** Normalize a Plaid /liabilities/get response into source rows and rebuild.
 *  The response carries both the accounts (name, mask, balance, limit) and the
 *  liability details (APR, minimum payment, due date). */
export async function ingestPlaidLiabilities(userId: string, response: LiabilitiesGetResponse): Promise<void> {
  const credit = new Map((response.liabilities.credit ?? []).map((c) => [c.account_id, c]));
  const mortgage = new Map((response.liabilities.mortgage ?? []).map((m) => [m.account_id, m]));
  const student = new Map((response.liabilities.student ?? []).map((s) => [s.account_id, s]));

  const records: SourceDebtRecord[] = [];
  for (const acct of response.accounts) {
    if (!PLAID_DEBT_ACCOUNT_TYPES.has(acct.type)) continue;
    const c = credit.get(acct.account_id);
    const m = mortgage.get(acct.account_id);
    const s = student.get(acct.account_id);
    const purchaseApr = c?.aprs?.find((a) => a.apr_type === 'purchase_apr') ?? c?.aprs?.[0] ?? null;

    records.push({
      sourceAccountId: acct.account_id,
      issuer: acct.official_name ?? acct.name,
      last4: acct.mask ?? null,
      openDate: null, // Plaid does not report an open date for these products
      type: plaidDebtType(acct.type, acct.subtype),
      balance: acct.balances.current ?? null,
      apr: purchaseApr?.apr_percentage ?? null,
      minPayment: c?.minimum_payment_amount ?? m?.next_monthly_payment ?? s?.minimum_payment_amount ?? null,
      dueDate: c?.next_payment_due_date ?? m?.next_payment_due_date ?? s?.next_payment_due_date ?? null,
      creditLimit: acct.balances.limit ?? null,
      accountStatus: c?.is_overdue === true ? 'delinquent' : 'open',
    });
  }
  await upsertSourceDebts(userId, 'plaid', records);
}

const SPINWHEEL_TYPE_MAP: Record<SpinwheelDebt['type'], DebtType> = {
  CREDIT_CARD: 'credit_card',
  STUDENT_LOAN: 'student_loan',
  HOME_LOAN: 'mortgage',
  AUTO_LOAN: 'auto_loan',
  PERSONAL_LOAN: 'personal_loan',
  MISCELLANEOUS_LIABILITY: 'other',
};

const SPINWHEEL_STATUS_MAP: Record<string, DebtStatus> = {
  OPEN: 'open',
  CLOSED: 'closed',
  DELINQUENT: 'delinquent',
};

/** Normalize a Spinwheel debt profile into source rows and rebuild. Closed
 *  tradelines with no remaining balance are skipped: the bureau remembers
 *  every account ever opened, and those are not debt. */
export async function ingestSpinwheelDebts(userId: string, debts: SpinwheelDebt[]): Promise<void> {
  const records: SourceDebtRecord[] = [];
  for (const d of debts) {
    if (d.accountStatus === 'CLOSED' && (d.balance ?? 0) <= 0) continue;
    records.push({
      sourceAccountId: d.id,
      issuer: d.name ?? d.creditorName ?? null,
      last4: d.last4 ?? d.accountNumberLast4 ?? null,
      openDate: d.openDate ?? null,
      type: SPINWHEEL_TYPE_MAP[d.type],
      balance: d.balance ?? null,
      apr: d.interestRate ?? null,
      minPayment: d.minimumPayment ?? null,
      creditLimit: d.creditLimit ?? null,
      dueDate: d.dueDate ?? null,
      accountStatus: d.accountStatus != null ? (SPINWHEEL_STATUS_MAP[d.accountStatus] ?? null) : null,
    });
  }
  await upsertSourceDebts(userId, 'spinwheel', records);
}

// ---------------------------------------------------------------------------
// Rebuild: source rows + decisions -> one debt_accounts row per real debt
// ---------------------------------------------------------------------------

function firstNonNull<T>(rows: SourceRow[], pick: (r: SourceRow) => T | null): T | null {
  for (const row of rows) {
    const v = pick(row);
    if (v !== null) return v;
  }
  return null;
}

/** Recompute the merged `debt_accounts` rows for a user from the current
 *  source rows and merge decisions. User-owned fields (nickname, aprOverride,
 *  statementCloseDay, promo declaration) are preserved by matching each new
 *  group to the existing account it shares the most source ids with. */
export async function rebuildDebtAccounts(userId: string): Promise<void> {
  const sourceRowsRaw = await db().select().from(debtSourceAccounts).where(eq(debtSourceAccounts.userId, userId));
  const decisions = await db().select().from(debtMergeDecisions).where(eq(debtMergeDecisions.userId, userId));
  const existing = await db().select().from(debtAccounts).where(eq(debtAccounts.userId, userId));

  const rows: SourceRow[] = sourceRowsRaw
    .map((r) => ({
      key: sourceKey(r.source as DebtSource, r.sourceAccountId),
      source: r.source as DebtSource,
      sourceAccountId: r.sourceAccountId,
      issuer: r.issuer ?? null,
      normalizedIssuer: r.normalizedIssuer ?? null,
      last4: r.last4 ?? null,
      openDate: r.openDate ?? null,
      type: r.type as DebtType,
      balance: num(r.balance),
      apr: num(r.apr),
      minPayment: num(r.minPayment),
      creditLimit: num(r.creditLimit),
      dueDate: r.dueDate ?? null,
      accountStatus: (r.accountStatus as DebtStatus | null) ?? null,
      syncedAt: r.syncedAt,
    }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const decisionByPair = new Map<string, 'same' | 'different'>();
  for (const d of decisions) {
    const [a, b] = pairKey(d.sourceKeyA, d.sourceKeyB);
    decisionByPair.set(`${a}|${b}`, d.decision as 'same' | 'different');
  }
  const decisionFor = (x: string, y: string): 'same' | 'different' | undefined => {
    const [a, b] = pairKey(x, y);
    return decisionByPair.get(`${a}|${b}`);
  };

  // Union-find over source keys.
  const parent = new Map<string, string>(rows.map((r) => [r.key, r.key]));
  const find = (k: string): string => {
    let root = k;
    while (parent.get(root) !== root) root = parent.get(root) as string;
    let cur = k;
    while (cur !== root) {
      const next = parent.get(cur) as string;
      parent.set(cur, root);
      cur = next;
    }
    return root;
  };
  const union = (a: string, b: string): void => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra < rb ? rb : ra, ra < rb ? ra : rb);
  };

  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i] as SourceRow;
      const b = rows[j] as SourceRow;
      const decision = decisionFor(a.key, b.key);
      if (decision === 'same') {
        union(a.key, b.key);
        continue;
      }
      if (decision === 'different') continue;
      if (autoMatch(a, b)) union(a.key, b.key);
    }
  }

  const groups = new Map<string, SourceRow[]>();
  for (const row of rows) {
    const root = find(row.key);
    const group = groups.get(root);
    if (group) group.push(row);
    else groups.set(root, [row]);
  }

  // Claim existing accounts by source-id overlap so user-owned fields and
  // debt ids are stable across rebuilds.
  const claimed = new Set<string>();
  const orderedGroups = [...groups.values()].sort((a, b) =>
    (a[0] as SourceRow).key.localeCompare((b[0] as SourceRow).key),
  );

  for (const group of orderedGroups) {
    const keys = group.map((r) => r.key).sort();
    const keySet = new Set(keys);
    let best: (typeof existing)[number] | null = null;
    let bestOverlap = 0;
    for (const account of existing) {
      if (claimed.has(account.debtId)) continue;
      const overlap = account.sourceIds.filter((id) => keySet.has(id)).length;
      if (overlap > bestOverlap) {
        best = account;
        bestOverlap = overlap;
      }
    }
    if (best) claimed.add(best.debtId);

    const plaidRows = group
      .filter((r) => r.source === 'plaid')
      .sort((a, b) => b.syncedAt.getTime() - a.syncedAt.getTime());
    const spinRows = group
      .filter((r) => r.source === 'spinwheel')
      .sort((a, b) => b.syncedAt.getTime() - a.syncedAt.getTime());

    // The asymmetric precedence (R-7.13). Plaid is fresher: balance and
    // minimum payment. Spinwheel is more complete: APR and credit limit.
    const balance = firstNonNull(plaidRows, (r) => r.balance) ?? firstNonNull(spinRows, (r) => r.balance);
    const minPayment = firstNonNull(plaidRows, (r) => r.minPayment) ?? firstNonNull(spinRows, (r) => r.minPayment);
    const sourceApr = firstNonNull(spinRows, (r) => r.apr) ?? firstNonNull(plaidRows, (r) => r.apr);
    const creditLimit = firstNonNull(spinRows, (r) => r.creditLimit) ?? firstNonNull(plaidRows, (r) => r.creditLimit);
    const issuer = firstNonNull(plaidRows, (r) => r.issuer) ?? firstNonNull(spinRows, (r) => r.issuer) ?? 'Unknown';
    const specificType =
      spinRows.map((r) => r.type).find((t) => !GENERIC_TYPES.has(t)) ??
      plaidRows.map((r) => r.type).find((t) => !GENERIC_TYPES.has(t)) ??
      (group[0] as SourceRow).type;
    const dueDay = dayOfMonth(firstNonNull(plaidRows, (r) => r.dueDate) ?? firstNonNull(spinRows, (r) => r.dueDate));

    const statuses = group.map((r) => r.accountStatus).filter((s): s is DebtStatus => s !== null);
    let status: DebtStatus = 'open';
    if (statuses.includes('delinquent')) status = 'delinquent';
    else if (statuses.length > 0 && statuses.every((s) => s === 'closed')) status = 'closed';

    const aprOverride = best ? num(best.aprOverride) : null;
    const apr = aprOverride ?? sourceApr;
    const now = new Date();

    if (best) {
      await db()
        .update(debtAccounts)
        .set({
          issuer,
          type: specificType,
          sourceIds: keys,
          balance: str(balance),
          apr: str(apr),
          minPayment: str(minPayment),
          creditLimit: str(creditLimit),
          dueDay: dueDay ?? null,
          status,
          updatedAt: now,
        })
        .where(and(eq(debtAccounts.userId, userId), eq(debtAccounts.debtId, best.debtId)));
    } else {
      await db()
        .insert(debtAccounts)
        .values({
          debtId: randomUUID(),
          userId,
          issuer,
          nickname: null,
          type: specificType,
          sourceIds: keys,
          balance: str(balance),
          apr: str(apr),
          aprOverride: null,
          minPayment: str(minPayment),
          creditLimit: str(creditLimit),
          dueDay: dueDay ?? null,
          statementCloseDay: null,
          isPromotional: false,
          promoEndDate: null,
          promoApr: null,
          status,
          createdAt: now,
          updatedAt: now,
        });
    }
  }

  const orphaned = existing.filter((a) => !claimed.has(a.debtId)).map((a) => a.debtId);
  if (orphaned.length > 0) {
    await db()
      .delete(debtAccounts)
      .where(and(eq(debtAccounts.userId, userId), inArray(debtAccounts.debtId, orphaned)));
  }
}

// ---------------------------------------------------------------------------
// Queries and manual affordances
// ---------------------------------------------------------------------------

function toRecord(row: typeof debtAccounts.$inferSelect): DebtAccountRecord {
  return {
    debtId: row.debtId,
    issuer: row.issuer,
    nickname: row.nickname ?? null,
    type: row.type as DebtType,
    sourceIds: row.sourceIds,
    balance: num(row.balance),
    apr: num(row.apr),
    aprOverride: num(row.aprOverride),
    minPayment: num(row.minPayment),
    creditLimit: num(row.creditLimit),
    dueDay: row.dueDay ?? null,
    statementCloseDay: row.statementCloseDay ?? null,
    isPromotional: row.isPromotional,
    promoEndDate: row.promoEndDate ?? null,
    promoApr: num(row.promoApr),
    status: row.status as DebtStatus,
  };
}

export async function getDebtAccounts(userId: string): Promise<DebtAccountRecord[]> {
  const rows = await db().select().from(debtAccounts).where(eq(debtAccounts.userId, userId));
  return rows.map(toRecord).sort((a, b) => a.debtId.localeCompare(b.debtId));
}

export async function getDebtAccount(userId: string, debtId: string): Promise<DebtAccountRecord | null> {
  const rows = await db()
    .select()
    .from(debtAccounts)
    .where(and(eq(debtAccounts.userId, userId), eq(debtAccounts.debtId, debtId)));
  const row = rows[0];
  return row ? toRecord(row) : null;
}

// `| undefined` on each member keeps this assignable from Zod's `.optional()`
// output under exactOptionalPropertyTypes; presence is tested with `in`, and
// an explicit undefined is normalized to null.
export type DebtAccountPatch = {
  nickname?: string | null | undefined;
  statementCloseDay?: number | null | undefined;
  dueDay?: number | null | undefined;
  aprOverride?: number | null | undefined;
  isPromotional?: boolean | undefined;
  promoEndDate?: string | null | undefined;
  promoApr?: number | null | undefined;
};

/** Update the user-owned fields of a merged debt. Setting or clearing
 *  `aprOverride` re-resolves the effective APR immediately: override first,
 *  then bureau, then bank feed. */
export async function updateDebtAccount(
  userId: string,
  debtId: string,
  patch: DebtAccountPatch,
): Promise<DebtAccountRecord | null> {
  const current = await getDebtAccount(userId, debtId);
  if (!current) return null;

  const set: Partial<typeof debtAccounts.$inferInsert> = { updatedAt: new Date() };
  if ('nickname' in patch) set.nickname = patch.nickname ?? null;
  if ('statementCloseDay' in patch) set.statementCloseDay = patch.statementCloseDay ?? null;
  if ('dueDay' in patch) set.dueDay = patch.dueDay ?? null;
  if ('isPromotional' in patch) set.isPromotional = patch.isPromotional ?? false;
  if ('promoEndDate' in patch) set.promoEndDate = patch.promoEndDate ?? null;
  if ('promoApr' in patch) set.promoApr = str(patch.promoApr ?? null);
  if ('aprOverride' in patch) {
    const override = patch.aprOverride ?? null;
    set.aprOverride = str(override);
    // Re-resolve the effective APR: override, else best source-derived value.
    // The stored apr equals aprOverride when one is set, so clearing the
    // override needs the source value back; a rebuild recomputes it exactly.
    set.apr = str(override);
  }

  await db()
    .update(debtAccounts)
    .set(set)
    .where(and(eq(debtAccounts.userId, userId), eq(debtAccounts.debtId, debtId)));

  if ('aprOverride' in patch && (patch.aprOverride ?? null) === null) {
    await rebuildDebtAccounts(userId); // restore the source-derived APR
  }
  return getDebtAccount(userId, debtId);
}

async function recordDecisions(
  userId: string,
  pairs: [string, string][],
  decision: 'same' | 'different',
): Promise<void> {
  for (const [x, y] of pairs) {
    const [a, b] = pairKey(x, y);
    if (a === b) continue;
    await db()
      .insert(debtMergeDecisions)
      .values({ userId, sourceKeyA: a, sourceKeyB: b, decision })
      .onConflictDoUpdate({
        target: [debtMergeDecisions.userId, debtMergeDecisions.sourceKeyA, debtMergeDecisions.sourceKeyB],
        set: { decision },
      });
  }
}

/** "These are the same account": record a 'same' decision for every source
 *  pair across the two merged records, then rebuild. Returns false when
 *  either debt does not exist for this user. */
export async function mergeDebtAccounts(userId: string, debtIdA: string, debtIdB: string): Promise<boolean> {
  const a = await getDebtAccount(userId, debtIdA);
  const b = await getDebtAccount(userId, debtIdB);
  if (!a || !b || debtIdA === debtIdB) return false;

  const pairs: [string, string][] = [];
  for (const ka of a.sourceIds) {
    for (const kb of b.sourceIds) pairs.push([ka, kb]);
  }
  await recordDecisions(userId, pairs, 'same');
  await rebuildDebtAccounts(userId);
  return true;
}

/** The inverse: "these are NOT the same account". Records 'different' for
 *  every source pair inside the merged record (overriding any earlier 'same'),
 *  then rebuilds, splitting it back into per-source records. */
export async function splitDebtAccount(userId: string, debtId: string): Promise<boolean> {
  const account = await getDebtAccount(userId, debtId);
  if (!account) return false;
  if (account.sourceIds.length < 2) return false;

  const pairs: [string, string][] = [];
  for (let i = 0; i < account.sourceIds.length; i++) {
    for (let j = i + 1; j < account.sourceIds.length; j++) {
      pairs.push([account.sourceIds[i] as string, account.sourceIds[j] as string]);
    }
  }
  await recordDecisions(userId, pairs, 'different');
  await rebuildDebtAccounts(userId);
  return true;
}

// ---------------------------------------------------------------------------
// Plan settings (R-7.14)
// ---------------------------------------------------------------------------

export type PlanStrategy = 'blend' | 'avalanche' | 'snowball';

export type PlanSettings = {
  strategy: PlanStrategy;
  extraMonthly: number | null;
};

export async function getPlanSettings(userId: string): Promise<PlanSettings> {
  const rows = await db().select().from(debtPlanSettings).where(eq(debtPlanSettings.userId, userId));
  const row = rows[0];
  if (!row) return { strategy: 'blend', extraMonthly: null };
  return { strategy: row.strategy as PlanStrategy, extraMonthly: num(row.extraMonthly) };
}

export async function setPlanSettings(userId: string, settings: PlanSettings): Promise<void> {
  await db()
    .insert(debtPlanSettings)
    .values({ userId, strategy: settings.strategy, extraMonthly: str(settings.extraMonthly), updatedAt: new Date() })
    .onConflictDoUpdate({
      target: debtPlanSettings.userId,
      set: { strategy: settings.strategy, extraMonthly: str(settings.extraMonthly), updatedAt: new Date() },
    });
}

// ---------------------------------------------------------------------------
// Ladder feed (rung 3)
// ---------------------------------------------------------------------------

/** Balances on merged debts above HIGH_APR_THRESHOLD, the rung 3 input,
 *  computed from `debt_accounts` so a card visible through both Plaid and
 *  Spinwheel counts once.
 *
 *  Returns null when NO source rows exist for this user, meaning "we know
 *  nothing yet"; callers fall back to the legacy per-source snapshot path.
 *
 *  Rate semantics mirror goals/snapshot.ts: `apr` is a percent, the threshold
 *  a fraction. A credit card with an unknown APR counts as high (wrongly
 *  completing rung 3 is permanent, wrongly holding it open self-corrects); an
 *  unknown-rate loan of any other type does not. The underlying APR is used,
 *  not a temporary promo rate: a 0% teaser on a 24% card is still rung 3 debt. */
export async function getHighAprDebtBalances(userId: string): Promise<number[] | null> {
  const anySource = await db()
    .select({ id: debtSourceAccounts.id })
    .from(debtSourceAccounts)
    .where(eq(debtSourceAccounts.userId, userId))
    .limit(1);
  if (anySource.length === 0) return null;

  const accounts = await getDebtAccounts(userId);
  return accounts
    .filter((a) => {
      if (a.status === 'closed') return false;
      const balance = a.balance ?? 0;
      if (balance <= 0) return false;
      if (a.apr === null) return a.type === 'credit_card';
      return a.apr / 100 > HIGH_APR_THRESHOLD;
    })
    .map((a) => a.balance as number);
}
