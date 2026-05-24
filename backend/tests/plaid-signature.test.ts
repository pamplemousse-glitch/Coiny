import { createHash, webcrypto } from 'node:crypto';
import { exportJWK, type JWK, SignJWT } from 'jose';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { _clearKeyCache, _webcrypto, setKeyFetcher, verifyPlaidSignature } from '../src/plaid/signature.js';

const TEST_KID = 'sig-test-kid';

type Key = Parameters<typeof SignJWT.prototype.sign>[0];
let privateKey: Key;
// biome-ignore lint/suspicious/noExplicitAny: test-only cast for exportJWK
let publicJwk: JWK & Record<string, any>;

beforeAll(async () => {
  const kp = (await _webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
    'sign',
    'verify',
  ])) as { privateKey: unknown; publicKey: unknown };
  privateKey = kp.privateKey as Key;
  // biome-ignore lint/suspicious/noExplicitAny: exportJWK CryptoKey cast
  publicJwk = (await exportJWK(kp.publicKey as any)) as JWK & Record<string, any>;
  publicJwk.kid = TEST_KID;
  publicJwk.alg = 'ES256';
  publicJwk.use = 'sig';
});

beforeEach(() => {
  _clearKeyCache();
  setKeyFetcher(async (kid) => {
    if (kid !== TEST_KID) throw new Error(`unknown kid: ${kid}`);
    return { ...publicJwk, kty: 'EC', crv: 'P-256', created_at: 0, expired_at: null } as never;
  });
});

afterEach(() => {
  setKeyFetcher(null);
  _clearKeyCache();
});

const TEST_BODY = Buffer.from('{"hello":"world"}');

async function signBody(body: Buffer, overrides: Record<string, unknown> = {}): Promise<string> {
  const bodyHash = createHash('sha256').update(body).digest('hex');
  return new SignJWT({ request_body_sha256: bodyHash, ...overrides })
    .setProtectedHeader({ alg: 'ES256', kid: TEST_KID, typ: 'JWT' })
    .setIssuedAt()
    .sign(privateKey);
}

describe('verifyPlaidSignature', () => {
  it('returns missing_header when header is undefined', async () => {
    const result = await verifyPlaidSignature(undefined, TEST_BODY);
    expect(result).toEqual({ ok: false, reason: 'missing_header' });
  });

  it('returns malformed_jwt for completely invalid JWT string', async () => {
    const result = await verifyPlaidSignature('not.a.jwt', TEST_BODY);
    expect(result).toEqual({ ok: false, reason: 'malformed_jwt' });
  });

  it('returns malformed_jwt when alg is not ES256', async () => {
    const token = await new SignJWT({ request_body_sha256: 'abc' })
      .setProtectedHeader({ alg: 'HS256', kid: TEST_KID })
      .setIssuedAt()
      .sign(new TextEncoder().encode('secret'));
    const result = await verifyPlaidSignature(token, TEST_BODY);
    expect(result).toEqual({ ok: false, reason: 'malformed_jwt' });
  });

  it('returns malformed_jwt when kid is missing from header', async () => {
    const { importPKCS8 } = await import('jose');
    const { generateKeyPairSync } = await import('node:crypto');
    const { privateKey: pk } = generateKeyPairSync('ec', {
      namedCurve: 'P-256',
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
      publicKeyEncoding: { type: 'spki', format: 'pem' },
    });
    const key = await importPKCS8(pk, 'ES256');
    const token = await new SignJWT({ request_body_sha256: 'abc' })
      .setProtectedHeader({ alg: 'ES256' })
      .setIssuedAt()
      .sign(key);
    const result = await verifyPlaidSignature(token, TEST_BODY);
    expect(result).toEqual({ ok: false, reason: 'malformed_jwt' });
  });

  it('returns unknown_kid when fetchKey throws', async () => {
    setKeyFetcher(async () => {
      throw new Error('network error fetching key');
    });
    const token = await signBody(TEST_BODY);
    const result = await verifyPlaidSignature(token, TEST_BODY);
    expect(result).toEqual({ ok: false, reason: 'unknown_kid' });
  });

  it('returns unknown_kid when fetchKey returns non-EC key', async () => {
    setKeyFetcher(async () => ({
      kty: 'RSA',
      crv: undefined,
      created_at: 0,
      expired_at: null,
    }));
    const token = await signBody(TEST_BODY);
    const result = await verifyPlaidSignature(token, TEST_BODY);
    expect(result).toEqual({ ok: false, reason: 'unknown_kid' });
  });

  it('returns invalid_signature when JWT was signed with a different key', async () => {
    const otherKp = (await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
      'sign',
      'verify',
    ])) as { privateKey: unknown };
    const otherPriv = otherKp.privateKey as Key;

    const bodyHash = createHash('sha256').update(TEST_BODY).digest('hex');
    const token = await new SignJWT({ request_body_sha256: bodyHash })
      .setProtectedHeader({ alg: 'ES256', kid: TEST_KID, typ: 'JWT' })
      .setIssuedAt()
      .sign(otherPriv);

    const result = await verifyPlaidSignature(token, TEST_BODY);
    expect(result).toEqual({ ok: false, reason: 'invalid_signature' });
  });

  it('returns malformed_jwt when JWT payload has no iat claim', async () => {
    const bodyHash = createHash('sha256').update(TEST_BODY).digest('hex');
    // Create a valid-signature token but deliberately omit setIssuedAt() so iat is absent
    const token = await new SignJWT({ request_body_sha256: bodyHash })
      .setProtectedHeader({ alg: 'ES256', kid: TEST_KID, typ: 'JWT' })
      .sign(privateKey);

    const result = await verifyPlaidSignature(token, TEST_BODY);
    expect(result).toEqual({ ok: false, reason: 'malformed_jwt' });
  });

  it('returns expired when JWT iat is more than 5 minutes in the past', async () => {
    const token = await signBody(TEST_BODY);
    const futureMs = Date.now() + 6 * 60 * 1000;
    const result = await verifyPlaidSignature(token, TEST_BODY, futureMs);
    expect(result).toEqual({ ok: false, reason: 'expired' });
  });

  it('returns expired when JWT iat is more than 5 minutes in the future', async () => {
    const token = await signBody(TEST_BODY);
    const pastMs = Date.now() - 6 * 60 * 1000;
    const result = await verifyPlaidSignature(token, TEST_BODY, pastMs);
    expect(result).toEqual({ ok: false, reason: 'expired' });
  });

  it('returns body_mismatch when request_body_sha256 does not match body', async () => {
    const token = await signBody(Buffer.from('{"different":"body"}'));
    const result = await verifyPlaidSignature(token, TEST_BODY);
    expect(result).toEqual({ ok: false, reason: 'body_mismatch' });
  });

  it('returns ok: true for a valid signature matching the body', async () => {
    const token = await signBody(TEST_BODY);
    const result = await verifyPlaidSignature(token, TEST_BODY);
    expect(result).toEqual({ ok: true });
  });

  it('uses cached key on second call without re-fetching', async () => {
    let fetchCount = 0;
    setKeyFetcher(async (kid) => {
      fetchCount++;
      if (kid !== TEST_KID) throw new Error('unknown kid');
      return { ...publicJwk, kty: 'EC', crv: 'P-256', created_at: 0, expired_at: null } as never;
    });

    const token = await signBody(TEST_BODY);
    await verifyPlaidSignature(token, TEST_BODY);
    await verifyPlaidSignature(token, TEST_BODY);
    expect(fetchCount).toBe(1);
  });
});
