import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { verifyAppStoreJws } from '../src/appstore/jws.js';
import { setTrustedRootsForTesting } from '../src/appstore/roots.js';
import { generateChain, signJws, type TestChain } from './appstore-helper.js';

// Chain generation shells out to openssl, so build every chain once.
let chain: TestChain;
let untrustedChain: TestChain;
let noLeafOidChain: TestChain;
let noIntermediateOidChain: TestChain;

beforeAll(() => {
  chain = generateChain();
  untrustedChain = generateChain();
  noLeafOidChain = generateChain({ omitLeafOid: true });
  noIntermediateOidChain = generateChain({ omitIntermediateOid: true });
  setTrustedRootsForTesting([...chain.roots, ...noLeafOidChain.roots, ...noIntermediateOidChain.roots]);
});

afterAll(() => {
  setTrustedRootsForTesting(null);
});

describe('verifyAppStoreJws', () => {
  const payload = { hello: 'apple', n: 7 };

  it('accepts a payload signed by a chain anchored at a trusted root', () => {
    const result = verifyAppStoreJws(signJws(payload, chain));
    expect(result).toEqual({ ok: true, payload });
  });

  it('rejects a chain anchored at an untrusted root', () => {
    const result = verifyAppStoreJws(signJws(payload, untrustedChain));
    expect(result).toEqual({ ok: false, reason: 'untrusted_root' });
  });

  it('rejects a corrupted signature', () => {
    const result = verifyAppStoreJws(signJws(payload, chain, { breakSignature: true }));
    expect(result).toEqual({ ok: false, reason: 'invalid_signature' });
  });

  it('rejects a tampered payload', () => {
    const jws = signJws(payload, chain);
    const [header, , signature] = jws.split('.') as [string, string, string];
    const forged = Buffer.from(JSON.stringify({ hello: 'attacker' }), 'utf8').toString('base64url');
    const result = verifyAppStoreJws(`${header}.${forged}.${signature}`);
    expect(result).toEqual({ ok: false, reason: 'invalid_signature' });
  });

  it('rejects an algorithm other than ES256', () => {
    const result = verifyAppStoreJws(signJws(payload, chain, { alg: 'RS256' }));
    expect(result).toEqual({ ok: false, reason: 'wrong_algorithm' });
  });

  it('rejects an x5c header that is not exactly three certificates', () => {
    const result = verifyAppStoreJws(signJws(payload, chain, { x5c: [chain.x5c[0], chain.x5c[2]] }));
    expect(result).toEqual({ ok: false, reason: 'missing_chain' });
  });

  it('rejects a leaf that was not signed by the presented intermediate', () => {
    // Foreign leaf grafted onto a trusted intermediate and root: the anchor
    // and intermediate check out, but the chain of signatures is broken.
    const grafted = signJws(payload, untrustedChain, { x5c: [untrustedChain.x5c[0], chain.x5c[1], chain.x5c[2]] });
    const result = verifyAppStoreJws(grafted);
    expect(result).toEqual({ ok: false, reason: 'broken_chain' });
  });

  it('rejects a leaf missing the App Store marker OID', () => {
    const result = verifyAppStoreJws(signJws(payload, noLeafOidChain));
    expect(result).toEqual({ ok: false, reason: 'missing_marker_oid' });
  });

  it('rejects an intermediate missing the Apple intermediate marker OID', () => {
    const result = verifyAppStoreJws(signJws(payload, noIntermediateOidChain));
    expect(result).toEqual({ ok: false, reason: 'missing_marker_oid' });
  });

  it('rejects certificates outside their validity window', () => {
    const twoHundredYears = Date.now() + 200 * 365 * 24 * 60 * 60 * 1000;
    const result = verifyAppStoreJws(signJws(payload, chain), twoHundredYears);
    expect(result).toEqual({ ok: false, reason: 'cert_expired' });
  });

  it('rejects a structurally malformed token', () => {
    expect(verifyAppStoreJws('not-a-jws')).toEqual({ ok: false, reason: 'malformed_jws' });
  });

  it('rejects a token whose header is not JSON', () => {
    const jws = signJws(payload, chain);
    const [, body, signature] = jws.split('.') as [string, string, string];
    const junkHeader = Buffer.from('garbage', 'utf8').toString('base64url');
    expect(verifyAppStoreJws(`${junkHeader}.${body}.${signature}`)).toEqual({ ok: false, reason: 'malformed_jws' });
  });

  it('rejects the real Apple root when the payload chain is homegrown', () => {
    // With the pinned production root restored, a locally generated chain must
    // not verify. This is the check that makes the pin real.
    setTrustedRootsForTesting(null);
    try {
      const result = verifyAppStoreJws(signJws(payload, chain));
      expect(result).toEqual({ ok: false, reason: 'untrusted_root' });
    } finally {
      setTrustedRootsForTesting([...chain.roots, ...noLeafOidChain.roots, ...noIntermediateOidChain.roots]);
    }
  });
});
