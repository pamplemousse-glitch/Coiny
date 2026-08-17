import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { validateSession } from '../store/sessions.js';

declare module 'fastify' {
  interface FastifyRequest {
    // null before the auth preHandler runs; always populated for protected routes.
    user: { id: string } | null;
  }
}

type BindableLogger = { setBindings?: (bindings: Record<string, unknown>) => void };

/** Attach user_id to every subsequent log line for this request. */
function bindUserId(log: unknown, userId: string): void {
  const candidate = log as BindableLogger;
  if (typeof candidate.setBindings === 'function') {
    candidate.setBindings({ user_id: userId });
  }
}

export async function registerAuthPlugin(app: FastifyInstance): Promise<void> {
  app.decorateRequest('user', null);

  app.addHook('preHandler', async (req: FastifyRequest, reply: FastifyReply) => {
    const header = req.headers.authorization;
    if (!header?.toLowerCase().startsWith('bearer ')) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }
    const rawToken = header.slice(7).trim();
    const userId = await validateSession(rawToken);
    if (!userId) return reply.status(401).send({ error: 'Unauthorized' });
    req.user = { id: userId };

    // Bind user_id to this request's logger (PRD R-31.2, audit 1.0.3, FTC
    // Safeguards 314.4(c)(8) monitoring of authorised-user activity).
    //
    // Done here rather than in the `req` serializer, and the reason is timing:
    // Fastify writes its "incoming request" line at onRequest, which is BEFORE
    // this preHandler runs, so `req.user` is still null when that serializer
    // fires. Binding instead attaches user_id to every line this request emits
    // from now on, including the completion line and anything a handler logs,
    // which is strictly more useful than the one field on the request line.
    //
    // Pseudonymous by construction: our own row id, never an email or a
    // provider `sub`.
    //
    // `setBindings` is pino's, and Fastify's FastifyBaseLogger type does not
    // declare it even though the runtime logger is pino. Guarded rather than
    // blanket-cast so that swapping in a logger without it degrades to "no
    // user_id in the logs" instead of throwing on every authenticated request.
    bindUserId(req.log, userId);
  });
}
