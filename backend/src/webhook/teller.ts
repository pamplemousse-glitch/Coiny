import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { verifyTellerSignature } from '../teller/signature.js';
import { TellerWebhookPayloadSchema } from '../teller/types.js';
import { evaluate } from '../rules/engine.js';
import { dispatchReaction } from '../reactions/dispatch.js';
import { config } from '../config.js';

export function registerTellerWebhook(app: FastifyInstance): void {
  app.addContentTypeParser('application/json', { parseAs: 'buffer' }, function (_req, body, done) {
    done(null, body);
  });

  app.post('/webhooks/teller', async function (req: FastifyRequest, reply: FastifyReply) {
    const rawBody = req.body as Buffer;
    const signatureHeader = req.headers['teller-signature'] as string | undefined;

    const result = verifyTellerSignature(signatureHeader, rawBody, config.TELLER_SIGNING_SECRET);

    if (!result.ok) {
      if (result.reason === 'no_secret') {
        req.log.warn(
          'TELLER_SIGNING_SECRET not configured — skipping signature verification (warn-mode). Set the secret to enable full verification.',
        );
      } else {
        req.log.warn({ reason: result.reason }, 'webhook signature rejected');
        return reply.status(401).send({ error: 'Unauthorized' });
      }
    }

    let payload;
    try {
      const parsed = JSON.parse(rawBody.toString('utf8')) as unknown;
      payload = TellerWebhookPayloadSchema.parse(parsed);
    } catch {
      return reply.status(400).send({ error: 'Bad Request' });
    }

    reply.status(200).send({ ok: true });

    // Process async after responding — Teller expects a fast 200.
    setImmediate(() => {
      if (payload.type === 'webhook.test') {
        app.log.info('Teller webhook test received — pipeline is healthy');
        return;
      }

      const transactions = payload.payload?.transactions ?? [];
      for (const tx of transactions) {
        const reaction = evaluate(tx);
        if (reaction) {
          dispatchReaction(reaction);
        }
      }
    });
  });
}
