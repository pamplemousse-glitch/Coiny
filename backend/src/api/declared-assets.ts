// The declared-assets API (docs/prd.md R-5.3): server persistence for the
// onboarding declaration sheet, so a reinstall or new phone restores what the
// user told us instead of silently dropping their number.
//
// Sync contract with the device:
// - PUT replaces the whole sheet (onboarding writes it once, then again on
//   later restatements). The device's write wins: both sides are the same
//   user's own statements, and the newer statement supersedes the older.
// - GET returns the sheet plus the R-5.4 nudge candidate; a fresh install
//   pulls this to repopulate its local cache.
// - PATCH refreshes one line's value (bumps refreshedAt, the nudge clock).
//
// Never logged: any declared amount. These are the user's own numbers about
// their own money; the PII rule for transactions applies unchanged
// (.claude/rules/security.md #2). Log lines carry userId and counts only.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import {
  DECLARED_ASSET_CLASSES,
  type DeclaredAssetLine,
  declaredNudgeCandidate,
  deleteDeclaredAsset,
  listDeclaredAssets,
  replaceDeclaredAssets,
  updateDeclaredAsset,
} from '../store/declared-assets.js';

const assetClassSchema = z.enum(DECLARED_ASSET_CLASSES);

// Bucketed magnitudes are two significant digits from a slider capped at $5M;
// the bound only has to reject nonsense, not model wealth.
const bucketedValueSchema = z.number().finite().nonnegative().max(1_000_000_000);

const lineSchema = z.strictObject({
  assetClass: assetClassSchema,
  bucketedValueUsd: bucketedValueSchema.nullable(),
  declaredAt: z.iso.datetime({ offset: true }),
});

const putBodySchema = z
  .strictObject({
    assets: z.array(lineSchema).max(DECLARED_ASSET_CLASSES.length),
  })
  .refine((body) => new Set(body.assets.map((a) => a.assetClass)).size === body.assets.length, {
    message: 'duplicate asset class',
  });

const patchBodySchema = z.strictObject({
  bucketedValueUsd: bucketedValueSchema.nullable(),
});

function serializeLine(line: DeclaredAssetLine) {
  return {
    assetClass: line.assetClass,
    bucketedValueUsd: line.bucketedValueUsd,
    confidence: line.confidence,
    declaredAt: line.declaredAt.toISOString(),
    refreshedAt: line.refreshedAt.toISOString(),
  };
}

function serializeSheet(lines: DeclaredAssetLine[], now: Date) {
  return {
    assets: lines.map(serializeLine),
    nudge: declaredNudgeCandidate(lines, now),
  };
}

export function registerDeclaredAssetsApi(app: FastifyInstance): void {
  // GET /api/declared-assets
  app.get('/api/declared-assets', async (req: FastifyRequest) => {
    const lines = await listDeclaredAssets(req.user!.id);
    return serializeSheet(lines, new Date());
  });

  // PUT /api/declared-assets: replace the whole sheet.
  app.put('/api/declared-assets', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = putBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const userId = req.user!.id;
    const now = new Date();
    const lines = await replaceDeclaredAssets(
      userId,
      parsed.data.assets.map((a) => ({
        assetClass: a.assetClass,
        bucketedValueUsd: a.bucketedValueUsd,
        declaredAt: new Date(a.declaredAt),
      })),
      now,
    );

    req.log.info({ userId, classCount: lines.length }, 'declared assets sheet replaced');
    return serializeSheet(lines, now);
  });

  // PATCH /api/declared-assets/:assetClass: refresh one line's value.
  app.patch(
    '/api/declared-assets/:assetClass',
    async (req: FastifyRequest<{ Params: { assetClass: string } }>, reply: FastifyReply) => {
      const cls = assetClassSchema.safeParse(req.params.assetClass);
      if (!cls.success) return reply.status(400).send({ error: 'unknown asset class' });
      const parsed = patchBodySchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

      const userId = req.user!.id;
      const line = await updateDeclaredAsset(userId, cls.data, parsed.data.bucketedValueUsd, new Date());
      if (!line) return reply.status(404).send({ error: 'not declared' });

      req.log.info({ userId, assetClass: cls.data }, 'declared asset refreshed');
      return serializeLine(line);
    },
  );

  // DELETE /api/declared-assets/:assetClass
  app.delete(
    '/api/declared-assets/:assetClass',
    async (req: FastifyRequest<{ Params: { assetClass: string } }>, reply: FastifyReply) => {
      const cls = assetClassSchema.safeParse(req.params.assetClass);
      if (!cls.success) return reply.status(400).send({ error: 'unknown asset class' });

      const userId = req.user!.id;
      const removed = await deleteDeclaredAsset(userId, cls.data);
      if (!removed) return reply.status(404).send({ error: 'not declared' });

      req.log.info({ userId, assetClass: cls.data }, 'declared asset removed');
      return reply.status(204).send();
    },
  );
}
