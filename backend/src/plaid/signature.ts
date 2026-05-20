import { createHash, webcrypto } from 'node:crypto';
import { decodeProtectedHeader, importJWK, type JWK, jwtVerify } from 'jose';

// jose's key type union spans CryptoKey | KeyObject | Uint8Array depending on the
// import path and Node version. We never poke at it ourselves — it round-trips
// through importJWK → jwtVerify, both jose APIs.
type CryptoKeyLike = Awaited<ReturnType<typeof importJWK>>;

import { webhookVerificationKeyGet } from './client.js';
import type { WebhookVerificationKey } from './types.js';

const MAX_AGE_SECONDS = 5 * 60;

// Cache verification keys per kid. Plaid keys are immutable for a given kid;
// rotation produces a new kid, so we never evict — just fetch on demand.
const keyCache = new Map<string, CryptoKeyLike>();

// Tests inject a stub via setKeyFetcher to avoid hitting Plaid for keys.
type KeyFetcher = (kid: string) => Promise<WebhookVerificationKey>;
let fetchKey: KeyFetcher = async (kid) => (await webhookVerificationKeyGet(kid)).key;

export function setKeyFetcher(fetcher: KeyFetcher | null): void {
  fetchKey = fetcher ?? (async (kid) => (await webhookVerificationKeyGet(kid)).key);
}

export function _clearKeyCache(): void {
  keyCache.clear();
}

export type VerifyResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'missing_header' | 'malformed_jwt' | 'unknown_kid' | 'invalid_signature' | 'expired' | 'body_mismatch';
    };

async function getKey(kid: string): Promise<CryptoKeyLike | null> {
  const cached = keyCache.get(kid);
  if (cached) return cached;

  try {
    const jwk = await fetchKey(kid);
    if (!jwk || jwk.kty !== 'EC' || jwk.crv !== 'P-256') return null;
    const key = await importJWK(jwk as unknown as JWK, 'ES256');
    // jose returns CryptoKeyLike for asymmetric algs in modern Node.
    keyCache.set(kid, key as CryptoKeyLike);
    return key as CryptoKeyLike;
  } catch {
    return null;
  }
}

export async function verifyPlaidSignature(
  signatureHeader: string | undefined,
  rawBody: Buffer,
  nowMs: number = Date.now(),
): Promise<VerifyResult> {
  if (!signatureHeader) return { ok: false, reason: 'missing_header' };

  let kid: string;
  try {
    const header = decodeProtectedHeader(signatureHeader);
    if (!header.kid || header.alg !== 'ES256') return { ok: false, reason: 'malformed_jwt' };
    kid = header.kid;
  } catch {
    return { ok: false, reason: 'malformed_jwt' };
  }

  const key = await getKey(kid);
  if (!key) return { ok: false, reason: 'unknown_kid' };

  let payload: { iat?: number; request_body_sha256?: string };
  try {
    const result = await jwtVerify(signatureHeader, key, { algorithms: ['ES256'] });
    payload = result.payload as typeof payload;
  } catch {
    return { ok: false, reason: 'invalid_signature' };
  }

  if (typeof payload.iat !== 'number') return { ok: false, reason: 'malformed_jwt' };
  const ageSeconds = nowMs / 1000 - payload.iat;
  if (ageSeconds > MAX_AGE_SECONDS || ageSeconds < -MAX_AGE_SECONDS) {
    return { ok: false, reason: 'expired' };
  }

  const bodyHash = createHash('sha256').update(rawBody).digest('hex');
  if (payload.request_body_sha256 !== bodyHash) return { ok: false, reason: 'body_mismatch' };

  return { ok: true };
}

// Re-export webcrypto for tests that need to generate keypairs.
export { webcrypto as _webcrypto };
