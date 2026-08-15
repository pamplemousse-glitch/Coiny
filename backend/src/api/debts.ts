// Debt endpoints (docs/prd.md R-7.13, R-7.14).
//
// GET    /api/debts             merged accounts, one per real-world debt
// POST   /api/debts/sync        re-pull both sources and rebuild
// PATCH  /api/debts/:id         user-owned fields (nickname, close day, APR override, promo)
// POST   /api/debts/:id/merge   manual "these are the same account"
// POST   /api/debts/:id/split   the inverse: undo a wrong merge
// GET    /api/debts/plan        strategy ordering + the dollar cost of each choice
// PUT    /api/debts/plan        persist strategy selection and extra payment
//
// Logging: debt_id and user_id only. Never issuer names, balances, or last4
// (.claude/rules/security.md #2).

import { eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { db } from '../db/client.js';
import { spinwheelConnections } from '../db/schema.js';
import { assumedApr, clearingPayment, comparePlans, type PlanDebtInput, type PlanResult } from '../debts/strategy.js';
import { liabilitiesGet } from '../plaid/client.js';
import { getDebtProfile } from '../spinwheel/client.js';
import {
  type DebtAccountRecord,
  getDebtAccount,
  getDebtAccounts,
  getHighAprDebtBalances,
  getPlanSettings,
  ingestPlaidLiabilities,
  ingestSpinwheelDebts,
  mergeDebtAccounts,
  setPlanSettings,
  splitDebtAccount,
  updateDebtAccount,
} from '../store/debts.js';
import { getItemsByUser } from '../store/items.js';

const dayOfMonth = z.number().int().min(1).max(31);

const PatchBodySchema = z
  .object({
    nickname: z.string().min(1).max(60).nullable().optional(),
    statementCloseDay: dayOfMonth.nullable().optional(),
    dueDay: dayOfMonth.nullable().optional(),
    aprOverride: z.number().min(0).max(100).nullable().optional(),
    isPromotional: z.boolean().optional(),
    promoEndDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .nullable()
      .optional(),
    promoApr: z.number().min(0).max(100).nullable().optional(),
  })
  .strict();

const MergeBodySchema = z.object({ otherDebtId: z.string().min(1) }).strict();

const PlanQuerySchema = z.object({
  strategy: z.enum(['blend', 'avalanche', 'snowball']).optional(),
  extra: z.coerce.number().min(0).optional(),
});

const PlanPutSchema = z
  .object({
    strategy: z.enum(['blend', 'avalanche', 'snowball']),
    extraMonthly: z.number().min(0).nullable(),
  })
  .strict();

function serializeDebt(account: DebtAccountRecord): Record<string, unknown> {
  const aprInfo = assumedApr({ type: account.type, apr: account.apr });
  const balance = account.balance ?? 0;
  return {
    debtId: account.debtId,
    issuer: account.issuer,
    nickname: account.nickname,
    type: account.type,
    sourceIds: account.sourceIds,
    sources: [...new Set(account.sourceIds.map((k) => k.split(':')[0]))].sort(),
    balance: account.balance,
    apr: account.apr,
    aprAssumed: account.apr === null,
    aprOverride: account.aprOverride,
    minPayment: account.minPayment,
    creditLimit: account.creditLimit,
    dueDay: account.dueDay,
    statementCloseDay: account.statementCloseDay,
    isPromotional: account.isPromotional,
    promoEndDate: account.promoEndDate,
    promoApr: account.promoApr,
    status: account.status,
    // The primary number per R-7.16: the payment that clears the debt in 36
    // months. The minimum is never the headline.
    payment36: balance > 0 ? Math.round(clearingPayment(balance, aprInfo.apr, 36) * 100) / 100 : 0,
  };
}

function toPlanInputs(accounts: DebtAccountRecord[]): PlanDebtInput[] {
  return accounts
    .filter((a) => a.status !== 'closed' && (a.balance ?? 0) > 0)
    .map((a) => ({
      id: a.debtId,
      type: a.type,
      balance: a.balance as number,
      apr: a.apr,
      minPayment: a.minPayment,
      isPromotional: a.isPromotional,
      promoApr: a.promoApr,
      promoEndDate: a.promoEndDate,
    }));
}

function summarize(plan: PlanResult): Record<string, unknown> {
  return {
    months: plan.months,
    debtFreeDate: plan.debtFreeDate,
    totalInterest: plan.totalInterest,
    order: plan.targetOrder,
  };
}

export function registerDebtsApi(app: FastifyInstance): void {
  // GET /api/debts
  app.get('/api/debts', async (req: FastifyRequest) => {
    const userId = req.user!.id;
    const accounts = await getDebtAccounts(userId);
    const highAprBalances = await getHighAprDebtBalances(userId);
    return {
      debts: accounts.map(serializeDebt),
      // The rung 3 feed, exposed so consumers judge real debt, not doubled debt.
      highAprDebtBalances: highAprBalances,
    };
  });

  // POST /api/debts/sync: re-pull both providers. Each source fails soft; a
  // dead bureau connection must not block a bank refresh or vice versa.
  app.post('/api/debts/sync', async (req: FastifyRequest) => {
    const userId = req.user!.id;
    let plaidSynced = false;
    let spinwheelSynced = false;

    try {
      const items = await getItemsByUser(userId);
      const results = await Promise.allSettled(items.map((item) => liabilitiesGet(item.accessToken)));
      for (const result of results) {
        if (result.status !== 'fulfilled') continue;
        await ingestPlaidLiabilities(userId, result.value);
        plaidSynced = true;
      }
    } catch {
      // No Plaid items or the item store failed; not fatal.
    }

    try {
      const [connection] = await db()
        .select()
        .from(spinwheelConnections)
        .where(eq(spinwheelConnections.userId, userId));
      if (connection) {
        const debts = await getDebtProfile(connection.spinwheelUserId);
        await ingestSpinwheelDebts(userId, debts);
        spinwheelSynced = true;
      }
    } catch {
      // Bureau fetch failed; not fatal.
    }

    req.log.info({ userId, plaidSynced, spinwheelSynced }, 'debt sync completed');
    const accounts = await getDebtAccounts(userId);
    return { synced: { plaid: plaidSynced, spinwheel: spinwheelSynced }, debts: accounts.map(serializeDebt) };
  });

  // PATCH /api/debts/:id
  app.patch('/api/debts/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = PatchBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const userId = req.user!.id;
    const { id } = req.params as { id: string };

    const updated = await updateDebtAccount(userId, id, parsed.data);
    if (!updated) return reply.status(404).send({ error: 'Debt not found' });

    req.log.info({ userId, debtId: id }, 'debt account updated');
    return serializeDebt(updated);
  });

  // POST /api/debts/:id/merge: "these are the same account"
  app.post('/api/debts/:id/merge', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = MergeBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const userId = req.user!.id;
    const { id } = req.params as { id: string };

    const ok = await mergeDebtAccounts(userId, id, parsed.data.otherDebtId);
    if (!ok) return reply.status(404).send({ error: 'Debt not found' });

    req.log.info({ userId, debtId: id }, 'debt accounts merged');
    const accounts = await getDebtAccounts(userId);
    return { debts: accounts.map(serializeDebt) };
  });

  // POST /api/debts/:id/split: the inverse of merge
  app.post('/api/debts/:id/split', async (req: FastifyRequest, reply: FastifyReply) => {
    const userId = req.user!.id;
    const { id } = req.params as { id: string };

    const account = await getDebtAccount(userId, id);
    if (!account) return reply.status(404).send({ error: 'Debt not found' });
    if (account.sourceIds.length < 2) {
      return reply.status(409).send({ error: 'Debt has a single source; nothing to split' });
    }

    await splitDebtAccount(userId, id);
    req.log.info({ userId, debtId: id }, 'debt account split');
    const accounts = await getDebtAccounts(userId);
    return { debts: accounts.map(serializeDebt) };
  });

  // GET /api/debts/plan
  app.get('/api/debts/plan', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = PlanQuerySchema.safeParse(req.query);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const userId = req.user!.id;

    const settings = await getPlanSettings(userId);
    const strategy = parsed.data.strategy ?? settings.strategy;
    const extraMonthly = parsed.data.extra ?? settings.extraMonthly ?? 0;

    const accounts = await getDebtAccounts(userId);
    const inputs = toPlanInputs(accounts);
    const comparison = comparePlans(inputs, extraMonthly, new Date());
    const chosen = comparison[strategy];

    return {
      strategy,
      extraMonthly,
      months: chosen.months,
      debtFreeDate: chosen.debtFreeDate,
      totalInterest: chosen.totalInterest,
      // Targeting order: where the extra payment goes first. `perDebt` is the
      // realized payoff chronology with dates.
      order: chosen.targetOrder,
      perDebt: chosen.perDebt,
      findings: chosen.findings,
      comparison: {
        blend: summarize(comparison.blend),
        avalanche: summarize(comparison.avalanche),
        snowball: summarize(comparison.snowball),
        minimumsOnly: summarize(comparison.minimumsOnly),
      },
      // Positive means the chosen strategy costs that much MORE in interest.
      costVsAvalanche: Math.round((chosen.totalInterest - comparison.avalanche.totalInterest) * 100) / 100,
      costVsSnowball: Math.round((chosen.totalInterest - comparison.snowball.totalInterest) * 100) / 100,
    };
  });

  // PUT /api/debts/plan
  app.put('/api/debts/plan', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = PlanPutSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });
    const userId = req.user!.id;

    await setPlanSettings(userId, { strategy: parsed.data.strategy, extraMonthly: parsed.data.extraMonthly });
    req.log.info({ userId }, 'debt plan settings updated');
    return { ok: true, strategy: parsed.data.strategy, extraMonthly: parsed.data.extraMonthly };
  });
}
