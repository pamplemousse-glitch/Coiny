import { createHash, timingSafeEqual } from 'node:crypto';
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
  // `email` and `display_name` are deliberately absent. Shipped iOS builds
  // still send both; this schema is not `.strict()`, so Zod strips them and an
  // old client keeps signing in while the values never reach a column. See
  // schema.ts for why the columns are gone (audit 2.2.1).
  // Optional: ASAuthorizationAppleIDCredential.authorizationCode, exchanged
  // here for the refresh token that account deletion needs in order to revoke
  // the grant (TN3194). Single-use and expires in five minutes, which is why it
  // is spent at sign-in rather than kept. Optional because the shipped iOS
  // build does not send it and must keep signing in.
  authorization_code: z.string().min(1).max(2048).nullish(),
  // Replay protection (runbook G1.23). The client generates this, sends
  // SHA-256(nonce) to Apple as the request nonce, and sends the RAW value
  // here. Apple echoes the hash verbatim into the token's `nonce` claim, so
  // only the client that started the flow can produce a matching pair.
  //
  // REQUIRED, not optional, and that is the whole point: an optional nonce
  // protects nothing, because an attacker replaying an intercepted token
  // simply omits the field and takes the unverified path. Made required while
  // there are no external testers, since the cost of requiring it only rises.
  // Bounded because it is hashed, and an unbounded string reaching a hash is
  // free CPU for anyone who asks.
  nonce: z.string().min(16).max(256),
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

    const { identity_token, user_id, authorization_code, nonce } = parsed.data;

    let sub: string;
    try {
      const { payload } = await jwtVerify(identity_token, appleJwks, {
        issuer: 'https://appleid.apple.com',
        // RFC 8725 §3.1: state the allowlist rather than relying on an
        // invariant. Without it the only thing refusing an `alg: HS256` token
        // signed with the public key as the HMAC secret is jose declining to
        // use an asymmetric key for a symmetric algorithm, which is a library
        // behaviour and not a decision this file has made. Apple signs identity
        // tokens with RS256; if that ever changes, sign-in fails loudly at 401
        // rather than quietly widening what is accepted, which is the correct
        // direction to fail.
        algorithms: ['RS256'],
        audience: config.APPLE_BUNDLE_ID,
      });

      // Apple echoes the request nonce into the claim verbatim, so the value
      // to match is SHA-256 of the raw nonce the client just sent us. A token
      // captured from another session carries a different hash and cannot be
      // replayed here without also holding that session's raw nonce.
      //
      // Checked INSIDE the try, before `sub` is trusted, so a token that fails
      // this leaves by the same 401 path as a token that fails its signature.
      // A distinct status or message would tell an attacker which of the two
      // checks they had passed.
      const expectedNonce = createHash('sha256').update(nonce, 'utf8').digest('hex');
      const claimedNonce = typeof payload.nonce === 'string' ? payload.nonce : '';
      const expected = Buffer.from(expectedNonce, 'utf8');
      const claimed = Buffer.from(claimedNonce, 'utf8');
      // timingSafeEqual throws on a length mismatch rather than returning
      // false, so the lengths are compared first. Same shape as the Plaid
      // webhook body hash in plaid/signature.ts.
      if (claimed.length !== expected.length || !timingSafeEqual(claimed, expected)) {
        throw new Error('nonce mismatch');
      }

      sub = payload.sub as string;
    } catch (err) {
      req.log.warn({ err }, 'apple identity token verification failed');
      return reply.status(401).send({ error: 'Invalid identity token' });
    }

    if (sub !== user_id) {
      req.log.warn('apple token sub mismatch');
      return reply.status(401).send({ error: 'Invalid identity token' });
    }

    const userId = await findOrCreateUser({ appleSub: sub });

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
    try {
      const { payload } = await jwtVerify(parsed.data.id_token, googleJwks, {
        // Google's ID tokens use either issuer form; accept both.
        issuer: ['https://accounts.google.com', 'accounts.google.com'],
        // Same reasoning as the Apple verifier above. Google's OpenID
        // discovery document advertises RS256 as the only value of
        // `id_token_signing_alg_values_supported`.
        algorithms: ['RS256'],
        audience: config.GOOGLE_AUTH_CLIENT_ID,
      });
      sub = payload.sub as string;
      // `payload.email` and `payload.name` are present here and deliberately
      // not read. Google hands them over whether or not we want them; taking
      // only `sub` is what keeps them out of the database (audit 2.2.1).
    } catch (err) {
      req.log.warn({ err }, 'google id token verification failed');
      return reply.status(401).send({ error: 'Invalid identity token' });
    }

    const userId = await findOrCreateUser({ googleSub: sub });
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
