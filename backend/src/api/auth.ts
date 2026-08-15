import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { z } from 'zod';
import { exchangeAuthorizationCode, isAppleRevocationConfigured } from '../apple/client.js';
import { config } from '../config.js';
import { createSession, deleteSession } from '../store/sessions.js';
import { findOrCreateUser, setAppleRefreshToken } from '../store/users.js';

// Cache the Apple JWKS fetcher (it internally caches with a 15-min TTL).
const appleJwks = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));
// Google's OAuth 2.0 JWKS endpoint. Same caching behavior.
const googleJwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

const AppleSignInSchema = z.object({
  identity_token: z.string().min(1),
  // Apple's stable user identifier — cross-check against JWT `sub`.
  user_id: z.string().min(1),
  // Optional: only provided on first sign-in; null on subsequent logins.
  email: z.string().email().nullish(),
  // Optional: Apple provides fullName only on first sign-in.
  display_name: z.string().max(100).nullish(),
  // Optional: ASAuthorizationAppleIDCredential.authorizationCode, exchanged
  // here for the refresh token that account deletion needs in order to revoke
  // the grant (TN3194). Single-use and expires in five minutes, which is why it
  // is spent at sign-in rather than kept. Optional because the shipped iOS
  // build does not send it and must keep signing in.
  authorization_code: z.string().min(1).max(2048).nullish(),
});

const GoogleSignInSchema = z.object({
  // ID token from the Android Credential Manager Google credential.
  id_token: z.string().min(1),
});

async function storeAppleRefreshToken(req: FastifyRequest, userId: string, code: string | null): Promise<void> {
  if (!code || !isAppleRevocationConfigured()) return;

  try {
    const refreshToken = await exchangeAuthorizationCode(code);
    if (!refreshToken) {
      req.log.warn({ userId }, 'apple authorization code exchange returned no refresh token');
      return;
    }
    await setAppleRefreshToken(userId, refreshToken);
  } catch (err) {
    req.log.warn({ err, userId }, 'apple authorization code exchange failed, continuing sign-in');
  }
}

export function registerAuthApi(app: FastifyInstance): void {
  app.post('/api/auth/apple', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = AppleSignInSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { identity_token, user_id, email, display_name, authorization_code } = parsed.data;

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
      req.log.warn('apple token sub mismatch');
      return reply.status(401).send({ error: 'Invalid identity token' });
    }

    const userId = await findOrCreateUser({ appleSub: sub, email: email ?? null, displayName: display_name ?? null });

    // Best-effort, and deliberately after the user exists but before the
    // session is returned, so a stored token is never attributed to the wrong
    // row. Nothing in here may fail a sign-in: the whole point of holding the
    // refresh token is to make a future deletion cleaner, and a person who
    // cannot sign in has a worse problem than a grant that outlives them.
    await storeAppleRefreshToken(req, userId, authorization_code ?? null);

    const { rawToken } = await createSession(userId);

    req.log.info({ userId }, 'apple sign-in success');
    return reply.status(200).send({ token: rawToken, user_id: userId });
  });

  app.post('/api/auth/google', async (req: FastifyRequest, reply: FastifyReply) => {
    if (!config.GOOGLE_AUTH_CLIENT_ID) {
      return reply.status(503).send({ error: 'Google auth not configured' });
    }

    const parsed = GoogleSignInSchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    let sub: string;
    let email: string | null = null;
    let displayName: string | null = null;
    try {
      const { payload } = await jwtVerify(parsed.data.id_token, googleJwks, {
        // Google's ID tokens use either issuer form; accept both.
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
        audience: config.GOOGLE_AUTH_CLIENT_ID,
      });
      sub = payload.sub as string;
      if (typeof payload.email === 'string') email = payload.email;
      if (typeof payload.name === 'string') displayName = payload.name.slice(0, 100);
    } catch (err) {
      req.log.warn({ err }, 'google id token verification failed');
      return reply.status(401).send({ error: 'Invalid identity token' });
    }

    const userId = await findOrCreateUser({ googleSub: sub, email, displayName });
    const { rawToken } = await createSession(userId);

    req.log.info({ userId }, 'google sign-in success');
    return reply.status(200).send({ token: rawToken, user_id: userId });
  });

  // Logout: invalidate the session token passed in the Authorization header.
  //
  // This route is UNAUTHENTICATED. `registerAuthApi` is registered in
  // server.ts's public scope, alongside the two sign-in routes, so the auth
  // plugin never runs for it. The previous comment here claimed the opposite
  // ("Protected by auth plugin when registered inside the protected scope"),
  // which is what Part 1 row 1.4.10 recorded: not a vulnerability, but a
  // comment asserting the reverse of the behaviour, which is how a later reader
  // ends up trusting `req.user` in a handler that never has one.
  //
  // It does not need the plugin. The route authenticates itself by construction:
  // deleting a row by `sha256(token)` requires holding the token, an unknown
  // token deletes nothing, and the reply is a constant `{ ok: true }` either
  // way, so it cannot be used to test whether a token is live. Anything here
  // that ever needs to know WHO is calling belongs in the protected scope
  // instead, which is where the revoke-all route lives (`api/account.ts`).
  app.post('/api/auth/logout', async (req: FastifyRequest, reply: FastifyReply) => {
    const rawToken = (req.headers.authorization ?? '').slice(7).trim();
    await deleteSession(rawToken);
    return reply.status(200).send({ ok: true });
  });
}
