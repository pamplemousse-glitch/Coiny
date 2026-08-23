// POST /api/diagnostics: MetricKit crash and hang intake (G3.10).
//
// ---------------------------------------------------------------------------
// Why this is not /api/telemetry
// ---------------------------------------------------------------------------
//
// The runbook, 04-performance-reliability 4.13.3 and launch-gap-analysis §7 all
// say to post MetricKit payloads to the existing telemetry endpoint. That
// cannot work, and the reason is a feature rather than an obstacle.
//
// `analytics/events.ts` enforces its privacy invariants BY CONSTRUCTION: every
// string is a closed enum or a lowercase machine token, every event is a
// `z.strictObject` so unknown keys are rejected rather than stripped. That is
// what keeps merchant names, emails and Apple subs out of analytics without
// relying on anybody's review. A call stack tree is a nested tree of binary
// UUIDs and hex offsets and cannot pass it, and loosening the catalog to admit
// one would dismantle the control for all thirteen other events.
//
// So the diagnostics get their own door with their own rules, and the catalog
// stays exactly as strict as it was.
//
// ---------------------------------------------------------------------------
// What arrives here, and what deliberately does not
// ---------------------------------------------------------------------------
//
// `MXCallStackTree.JSONRepresentation` carries binary image name, binary UUID,
// text-segment offset, address and sample count. It is UNSYMBOLICATED: no
// function names, no file paths. Symbolication happens off device against our
// own dSYM, which is why the trace is safe to store and useless to anyone
// without the build.
//
// The three free-form fields MetricKit exposes are dropped ON THE DEVICE and
// never sent: `terminationReason`, `virtualMemoryRegionInfo`, and
// `exceptionReason.composedMessage`, whose header says it "may have some pieces
// redacted" (may, and some, which is not a guarantee to build on). This route
// rejects them a second time anyway, because a control that exists in only one
// place is one refactor from not existing.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { type CrashDiagnosticInput, insertCrashDiagnostics } from '../store/crash-diagnostics.js';

/** MetricKit delivers at most once a day and a payload rarely holds more than a
 *  handful. Ten is generous headroom; anything larger is a client bug. */
const MAX_BATCH = 10;

/** Serialized size cap per call stack.
 *
 *  A deep tree across many threads is genuinely large, so this is not tight,
 *  but it is bounded: without a cap, one device can write unbounded jsonb into
 *  a table with a 90-day retention. Measured against real payloads this is
 *  roughly an order of magnitude of headroom. */
const MAX_CALL_STACK_BYTES = 256 * 1024;

/** Lowercase hex, computed on device from the stack's binary UUIDs and offsets.
 *  Constrained by SHAPE rather than trusted: a client that put something else
 *  here would otherwise have a free-form string column. */
const signature = z
  .string()
  .regex(/^[a-f0-9]{16,64}$/, 'signature must be lowercase hex');

/** Integers only, from sys/exception_types.h and sys/signal.h. Nothing
 *  free-form rides along on these. */
const machInt = z.number().int().min(-1_000_000).max(1_000_000).nullish();

const DiagnosticSchema = z.strictObject({
  kind: z.enum(['crash', 'hang', 'disk_write', 'cpu_exception', 'app_launch']),
  app_build: z.number().int().min(0).max(10_000_000),
  os_major: z.number().int().min(15).max(99),
  signature,
  exception_type: machInt,
  exception_code: machInt,
  signal: machInt,
  // `unknown` rather than a shape: this is Apple's tree and its structure is
  // theirs to change. It is bounded by size and by the strictObject around it,
  // never by a schema we would have to chase.
  call_stack: z.record(z.string(), z.unknown()),
});

const EnvelopeSchema = z.strictObject({
  diagnostics: z.array(DiagnosticSchema).min(1).max(MAX_BATCH),
});

export function registerDiagnosticsApi(app: FastifyInstance): void {
  app.post(
    '/api/diagnostics',
    {
      // Tighter than telemetry's 60/min. MetricKit delivers once a day, so a
      // legitimate client sends a handful of requests per WEEK; anything near
      // this ceiling is a loop, and this endpoint writes jsonb.
      config: { rateLimit: { max: 10, timeWindow: '1 hour' } },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const parsed = EnvelopeSchema.safeParse(req.body);
      if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

      const rows: CrashDiagnosticInput[] = [];
      const rejected: { index: number; reason: 'call_stack_too_large' }[] = [];

      parsed.data.diagnostics.forEach((d, index) => {
        // Size is checked here rather than in the schema because Zod measures
        // structure, not bytes, and bytes are what fills the table.
        if (Buffer.byteLength(JSON.stringify(d.call_stack), 'utf8') > MAX_CALL_STACK_BYTES) {
          rejected.push({ index, reason: 'call_stack_too_large' });
          return;
        }
        rows.push({
          kind: d.kind,
          appBuild: d.app_build,
          osMajor: d.os_major,
          signature: d.signature,
          exceptionType: d.exception_type ?? null,
          exceptionCode: d.exception_code ?? null,
          signal: d.signal ?? null,
          callStack: d.call_stack,
        });
      });

      // user_id always from the session, never the payload (BOLA rule #6).
      const stored = await insertCrashDiagnostics(req.user!.id, rows);

      if (rejected.length > 0) {
        // Counts and reasons only. The payload never reaches the log, which
        // matters more here than on most routes: this one carries the largest
        // client-supplied blob in the product.
        req.log.warn(
          { rejectedCount: rejected.length, reasons: rejected.map((r) => r.reason) },
          'diagnostics batch had rejected entries',
        );
      }

      return { accepted: stored, rejected };
    },
  );
}
