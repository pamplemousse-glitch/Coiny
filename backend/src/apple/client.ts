// Sign in with Apple REST API, the two calls account deletion needs.
//
// TN3194 ("Handling account deletions and revoking tokens for Sign in with
// Apple") is the whole specification for this file:
//
//   - Deleting an account must revoke the Sign in with Apple grant, otherwise
//     Coiny keeps sitting in the user's "Apps Using Apple ID" list after they
//     were told their account and all data are gone.
//   - The revoke endpoint takes a refresh token or an access token. It does NOT
//     take the identity token the app already sends at sign-in: that is an
//     assertion about who signed in, not a grant.
//   - The only way to obtain either token is to exchange the single-use
//     `authorizationCode` from ASAuthorizationAppleIDCredential, which expires
//     five minutes after it is issued. So either the exchange happens at
//     sign-in and the refresh token is stored, or a fresh code is collected at
//     deletion time. Both paths are supported here; `revoke/upstream.ts`
//     prefers a freshly supplied code and falls back to the stored token.
//   - Every request is authenticated by a client secret that is itself an ES256
//     JWT signed with the Sign in with Apple private key (.p8), not a static
//     string.
//
// https://developer.apple.com/documentation/technotes/tn3194-handling-account-deletions-and-revoking-tokens-for-sign-in-with-apple
// https://developer.apple.com/documentation/signinwithapplerestapi/revoke_tokens
// https://developer.apple.com/documentation/signinwithapplerestapi/generate_and_validate_tokens

import { createPrivateKey } from 'node:crypto';
import { SignJWT } from 'jose';
import { z } from 'zod';
import { config } from '../config.js';
import { fetchWithRetry } from '../util/fetch.js';

export const APPLE_AUTH_BASE_URL = 'https://appleid.apple.com';

// Apple caps the client secret at six months. Nothing here needs it to outlive
// the request it authenticates, and a short life means a leaked secret from a
// log or a proxy is dead before it is useful.
const CLIENT_SECRET_TTL = '5m';

export class AppleAuthError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'AppleAuthError';
  }
}

/** Whether the three secrets the REST API needs are all present.
 *
 *  They are absent in development, in tests that do not set them, and on any
 *  deploy where the .p8 has not been added yet. Callers must treat `false` as
 *  "skip and log", never as an error: account deletion cannot be gated on a
 *  credential the operator has not configured. */
export function isAppleRevocationConfigured(): boolean {
  return Boolean(config.APPLE_TEAM_ID && config.APPLE_SIGN_IN_KEY_ID && config.APPLE_SIGN_IN_PRIVATE_KEY);
}

async function buildClientSecret(): Promise<string> {
  const key = createPrivateKey({ key: config.APPLE_SIGN_IN_PRIVATE_KEY, format: 'pem' });
  return new SignJWT({})
    .setProtectedHeader({ alg: 'ES256', kid: config.APPLE_SIGN_IN_KEY_ID })
    .setIssuer(config.APPLE_TEAM_ID)
    .setIssuedAt()
    .setExpirationTime(CLIENT_SECRET_TTL)
    .setAudience(APPLE_AUTH_BASE_URL)
    .setSubject(config.APPLE_BUNDLE_ID)
    .sign(key);
}

async function appleForm(path: string, fields: Record<string, string>): Promise<Response> {
  const body = new URLSearchParams({
    client_id: config.APPLE_BUNDLE_ID,
    client_secret: await buildClientSecret(),
    ...fields,
  });

  return fetchWithRetry(`${APPLE_AUTH_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
}

// Apple returns the error as a code, never as prose, and never echoes anything
// user-identifying. Safe to log verbatim.
const ErrorSchema = z.object({ error: z.string() });

const TokenResponseSchema = z.object({
  access_token: z.string().optional(),
  refresh_token: z.string().optional(),
  token_type: z.string().optional(),
  expires_in: z.number().optional(),
});

/** Exchanges the client's single-use authorization code for a refresh token.
 *
 *  Returns null when Apple accepts the request but issues no refresh token,
 *  which is what happens for a code that was already spent. Throws on a
 *  rejected exchange so the caller can decide whether that is fatal (it never
 *  is: sign-in and deletion both continue without it). */
export async function exchangeAuthorizationCode(code: string): Promise<string | null> {
  const res = await appleForm('/auth/token', { code, grant_type: 'authorization_code' });

  if (!res.ok) {
    const parsed = ErrorSchema.safeParse(await res.json().catch(() => null));
    throw new AppleAuthError(res.status, parsed.success ? parsed.data.error : `HTTP ${res.status}`);
  }

  const payload = TokenResponseSchema.parse(await res.json());
  return payload.refresh_token ?? null;
}

/** Revokes a Sign in with Apple grant. A 200 with an empty body is success.
 *
 *  Apple treats revoking an already-revoked token as success, so this is safe
 *  to retry and safe to call on a deletion that is being replayed. */
export async function revokeToken(token: string, tokenTypeHint: 'refresh_token' | 'access_token'): Promise<void> {
  const res = await appleForm('/auth/revoke', { token, token_type_hint: tokenTypeHint });

  if (!res.ok) {
    const parsed = ErrorSchema.safeParse(await res.json().catch(() => null));
    throw new AppleAuthError(res.status, parsed.success ? parsed.data.error : `HTTP ${res.status}`);
  }
}
