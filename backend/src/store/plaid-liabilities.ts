import { eq, sql } from 'drizzle-orm';
import { db } from '../db/client.js';
import { plaidLiabilityCache } from '../db/schema.js';
import type { LiabilitiesGetResponse } from '../plaid/types.js';

export type PlaidLiabilityCache = typeof plaidLiabilityCache.$inferSelect;

export async function cacheLiabilities(userId: string, response: LiabilitiesGetResponse): Promise<void> {
  const now = new Date();

  type LiabilityRow = typeof plaidLiabilityCache.$inferInsert;
  const rows: LiabilityRow[] = [];

  for (const c of response.liabilities.credit ?? []) {
    // Prefer the purchase APR; fall back to first entry if not found.
    const purchaseApr = c.aprs?.find((a) => a.apr_type === 'purchase_apr') ?? c.aprs?.[0] ?? null;
    rows.push({
      accountId: c.account_id,
      userId,
      accountType: 'credit',
      minPayment: c.minimum_payment_amount != null ? c.minimum_payment_amount.toString() : null,
      nextDueDate: c.next_payment_due_date ?? null,
      lastStatementBalance: c.last_statement_balance != null ? c.last_statement_balance.toString() : null,
      isOverdue: c.is_overdue ?? null,
      primaryApr: purchaseApr != null ? purchaseApr.apr_percentage.toString() : null,
      expectedPayoffDate: null,
      repaymentPlanType: null,
      updatedAt: now,
    });
  }

  for (const m of response.liabilities.mortgage ?? []) {
    rows.push({
      accountId: m.account_id,
      userId,
      accountType: 'mortgage',
      minPayment: m.next_monthly_payment != null ? m.next_monthly_payment.toString() : null,
      nextDueDate: m.next_payment_due_date ?? null,
      lastStatementBalance: null,
      isOverdue: null,
      primaryApr: null,
      expectedPayoffDate: null,
      repaymentPlanType: null,
      updatedAt: now,
    });
  }

  for (const s of response.liabilities.student ?? []) {
    rows.push({
      accountId: s.account_id,
      userId,
      accountType: 'student',
      minPayment: s.minimum_payment_amount != null ? s.minimum_payment_amount.toString() : null,
      nextDueDate: s.next_payment_due_date ?? null,
      lastStatementBalance: null,
      isOverdue: null,
      primaryApr: null,
      expectedPayoffDate: s.expected_payoff_date ?? null,
      repaymentPlanType: s.repayment_plan?.type ?? null,
      updatedAt: now,
    });
  }

  if (rows.length === 0) return;

  await db()
    .insert(plaidLiabilityCache)
    .values(rows)
    .onConflictDoUpdate({
      target: plaidLiabilityCache.accountId,
      set: {
        minPayment: sql`excluded.min_payment`,
        nextDueDate: sql`excluded.next_due_date`,
        lastStatementBalance: sql`excluded.last_statement_balance`,
        isOverdue: sql`excluded.is_overdue`,
        primaryApr: sql`excluded.primary_apr`,
        expectedPayoffDate: sql`excluded.expected_payoff_date`,
        repaymentPlanType: sql`excluded.repayment_plan_type`,
        updatedAt: sql`excluded.updated_at`,
      },
    });
}

export async function getCachedLiabilities(userId: string): Promise<PlaidLiabilityCache[]> {
  return db().select().from(plaidLiabilityCache).where(eq(plaidLiabilityCache.userId, userId));
}
