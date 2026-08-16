// Consent and legal acknowledgement (runbook G1.6).
//
// Two obligations meet on these three routes.
//
// Reg P 1016.9(a) requires the privacy notice to be delivered so the consumer
// can reasonably be expected to receive actual notice; 1016.9(b)(1)(iii) gives
// the worked example for an online relationship, which is to post the notice
// and require acknowledgement as a necessary step to obtaining the service.
// The iOS sign-in screen shows the notice and posts the acknowledgement here
// the moment a session exists, so the record of delivery is server-side and
// survives a reinstall.
//
// docs/legal/consent-copy.md section 2 gives the user a "Share usage data"
// switch. It has to reach the server, because the client queue is only half of
// the telemetry: store/analytics.ts reads `users.analytics_opt_out` on every
// write, including the server-emitted events no client ever sees.

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getConsent, recordLegalAcceptance, setAnalyticsOptOut } from '../store/users.js';

// The version string the client displayed, e.g. '2026-08-13'. Opaque to the
// server on purpose: the documents are bundled with the app, so the app is the
// only thing that knows which revision a given user actually read.
const AcknowledgeSchema = z.object({
  policy_version: z.string().min(1).max(64),
});

const OptOutSchema = z.object({
  analytics_opt_out: z.boolean(),
});

export function registerConsentApi(app: FastifyInstance): void {
  app.get('/api/consent', async (req: FastifyRequest, reply: FastifyReply) => {
    const consent = await getConsent(req.user!.id);
    if (!consent) return reply.status(404).send({ error: 'Not found' });
    return reply.status(200).send({
      legal_accepted_at: consent.legalAcceptedAt?.toISOString() ?? null,
      legal_version: consent.legalVersion,
      analytics_opt_out: consent.analyticsOptOut,
    });
  });

  app.post('/api/consent/acknowledge', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = AcknowledgeSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    await recordLegalAcceptance(req.user!.id, parsed.data.policy_version);
    // Version only. It is not PII and it is the one fact worth being able to
    // reconstruct from logs if the acknowledgement row is ever disputed.
    req.log.info({ userId: req.user!.id, version: parsed.data.policy_version }, 'legal acknowledgement recorded');
    return reply.status(200).send({ ok: true });
  });

  app.patch('/api/consent', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = OptOutSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    await setAnalyticsOptOut(req.user!.id, parsed.data.analytics_opt_out);
    return reply.status(200).send({ ok: true });
  });
}
