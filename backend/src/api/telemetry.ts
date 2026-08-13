// POST /api/telemetry (docs/prd.md R-24.1): the batched client event intake.
//
// Contract with the iOS queue (flushes 25 at a time or on background):
//   - The envelope is validated as a whole; a non-array or oversized body is a
//     400 and nothing is stored.
//   - Each event inside the envelope is validated INDIVIDUALLY against the
//     catalog (src/analytics/events.ts). A bad event never sinks its batch:
//     valid events are stored, invalid ones come back in `rejected` with an
//     index and a reason, and the response is still 200. The client drops
//     rejected events rather than retrying them.
//   - A retried batch after a network failure may duplicate rows; that is
//     accepted, and the retention queries use EXISTS/DISTINCT so duplicates
//     cannot move any metric.
//   - user_id always comes from the session, never from the payload.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { validateClientEvent } from '../analytics/events.js';
import { type AnalyticsEventInput, insertAnalyticsEvents } from '../store/analytics.js';

/** Batch cap: double the iOS flush size of 25, so one queued flush plus a
 *  carry-over always fits and anything larger is a client bug. */
const MAX_BATCH = 50;

// Items are `unknown` on purpose: per-item validation happens one event at a
// time so a single malformed entry cannot 400 the whole batch.
const EnvelopeSchema = z.object({
  events: z.array(z.unknown()).min(1).max(MAX_BATCH),
});

const EventItemSchema = z.object({
  event: z.string().min(1).max(64),
  properties: z.record(z.string(), z.unknown()).default({}),
  client_ts: z.iso.datetime({ offset: true }).nullish(),
});

type RejectedEvent = {
  index: number;
  reason: 'malformed_event' | 'unknown_event' | 'server_only' | 'invalid_properties';
};

export function registerTelemetryApi(app: FastifyInstance): void {
  app.post(
    '/api/telemetry',
    {
      // Stricter than the global limiter: the client flushes at most every few
      // seconds, so 60 requests/user/minute is generous headroom while capping
      // a runaway retry loop at write-path scale.
      config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    },
    async (req: FastifyRequest, reply: FastifyReply) => {
      const envelope = EnvelopeSchema.safeParse(req.body);
      if (!envelope.success) return reply.status(400).send({ error: envelope.error.flatten() });

      const accepted: AnalyticsEventInput[] = [];
      const rejected: RejectedEvent[] = [];

      envelope.data.events.forEach((raw, index) => {
        const item = EventItemSchema.safeParse(raw);
        if (!item.success) {
          rejected.push({ index, reason: 'malformed_event' });
          return;
        }

        const validated = validateClientEvent(item.data.event, item.data.properties);
        if (!validated.ok) {
          rejected.push({ index, reason: validated.reason });
          return;
        }

        accepted.push({
          event: item.data.event,
          properties: validated.properties,
          clientTs: item.data.client_ts ? new Date(item.data.client_ts) : null,
        });
      });

      // One insert for the whole batch. If the write itself fails, the error
      // handler returns a 5xx and the client retries the entire batch: partial
      // failure is only ever the per-event validation above, never a torn write.
      const stored = await insertAnalyticsEvents(req.user!.id, accepted);

      if (rejected.length > 0) {
        // Names and reasons only; properties never reach the log.
        req.log.warn(
          { rejectedCount: rejected.length, reasons: rejected.map((r) => r.reason) },
          'telemetry batch had rejected events',
        );
      }

      return { accepted: stored, rejected };
    },
  );
}
