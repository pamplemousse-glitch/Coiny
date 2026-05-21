import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { z } from 'zod';
import { config } from '../config.js';
import { deleteSession } from '../store/sessions.js';
import { createSession } from '../store/sessions.js';
import { findOrCreateUser } from '../store/users.js';

// Cache the Apple JWKS fetcher (it internally caches with a 15-min TTL).
const appleJwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

const AppleSignInSchema = z.object({
  identity_token: z.string().min(1),
  // Apple's stable user identifier — cross-check against JWT `sub`.
  user_id: z.string().min(1),
  // Optional: only provided on first sign-in; null on subsequent logins.
  email: z.string().email().nullish(),
});

export function registerAuthApi(app: FastifyInstance): void {
  app.post('/api/auth/apple', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = AppleSignInSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { identity_token, user_id, email } = parsed.data;

    let sub: string;
    try {
      const { payload } = await jwtVerify(identity_token, appleJwks, {
        issuer: 'https://appleid.apple.com',
        audience: config.APPLE_BUNDLE_ID,
      });
      sub = payload.sub as string;
    } catch (err) {
      req.log.warn({ err }, 'apple identity token verification failed');
      return reply.status(401).send({ error: 'Invalid identity token' });
    }

    if (sub !== user_id) {
      req.log.warn({ sub, user_id }, 'apple token sub mismatch');
      return reply.status(401).send({ error: 'Invalid identity token' });
    }

    const userId = await findOrCreateUser({ appleSub: sub, email });
    const { rawToken } = await createSession(userId);

    req.log.info({ userId }, 'apple sign-in success');
    return reply.status(200).send({ token: rawToken, user_id: userId });
  });

  // Logout: invalidate the session token passed in the Authorization header.
  // Protected by auth plugin when registered inside the protected scope.
  app.post('/api/auth/logout', async (req: FastifyRequest, reply: FastifyReply) => {
    const rawToken = (req.headers.authorization ?? '').slice(7).trim();
    await deleteSession(rawToken);
    return reply.status(200).send({ ok: true });
  });
}
