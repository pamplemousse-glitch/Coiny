import { verify as cryptoVerify, X509Certificate } from 'node:crypto';
import { trustedAppleRoots } from './roots.js';

// Verification of Apple App Store signed data (JWS with an x5c certificate
// chain): signed transactions, signed renewal info, and Server Notifications
// V2 payloads. Built on node:crypto only; per .claude/rules/security.md #7 a
// dedicated App Store server library is not justified for one signature check.
//
// The chain rules mirror Apple's own app-store-server-library:
//   1. Exactly three certificates: leaf, intermediate, root.
//   2. The root must byte-equal a pinned Apple root (Apple Root CA - G3).
//   3. The intermediate must be signed by the root and carry the Apple
//      intermediate marker OID 1.2.840.113635.100.6.2.1.
//   4. The leaf must be signed by the intermediate and carry the App Store
//      signing marker OID 1.2.840.113635.100.6.11.1.
//   5. All three certificates must be within their validity window.
//   6. The ES256 signature over header.payload must verify with the leaf key.

// DER encodings (tag 0x06 + length + base-128 arc bytes) of the marker OIDs.
// Searching the raw certificate for these byte strings is how we check for the
// extension without a full ASN.1 parser; the byte sequences are long enough
// that accidental collision in a 1-2 KB certificate is not a realistic risk.
const LEAF_MARKER_OID = Buffer.from([0x06, 0x0a, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x63, 0x64, 0x06, 0x0b, 0x01]);
const INTERMEDIATE_MARKER_OID = Buffer.from([0x06, 0x0a, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x63, 0x64, 0x06, 0x02, 0x01]);

export type AppStoreVerifyResult =
  | { ok: true; payload: unknown }
  | {
      ok: false;
      reason:
        | 'malformed_jws'
        | 'wrong_algorithm'
        | 'missing_chain'
        | 'untrusted_root'
        | 'broken_chain'
        | 'missing_marker_oid'
        | 'cert_expired'
        | 'invalid_signature'
        | 'malformed_payload';
    };

function decodeBase64Url(part: string): Buffer | null {
  if (!/^[A-Za-z0-9_-]*$/.test(part)) return null;
  return Buffer.from(part, 'base64url');
}

function parseCert(b64: string): X509Certificate | null {
  try {
    return new X509Certificate(Buffer.from(b64, 'base64'));
  } catch {
    return null;
  }
}

function certValidAt(cert: X509Certificate, at: Date): boolean {
  return cert.validFromDate <= at && at <= cert.validToDate;
}

/** Verifies an App Store JWS end to end and returns the parsed (still
 *  unvalidated) JSON payload. Callers apply their own Zod schema on top. */
export function verifyAppStoreJws(jws: string, nowMs: number = Date.now()): AppStoreVerifyResult {
  const parts = jws.split('.');
  if (parts.length !== 3) return { ok: false, reason: 'malformed_jws' };
  const [headerB64, payloadB64, signatureB64] = parts as [string, string, string];

  const headerBuf = decodeBase64Url(headerB64);
  const signature = decodeBase64Url(signatureB64);
  if (!headerBuf || !signature || headerBuf.length === 0 || signature.length === 0) {
    return { ok: false, reason: 'malformed_jws' };
  }

  let header: { alg?: unknown; x5c?: unknown };
  try {
    header = JSON.parse(headerBuf.toString('utf8')) as typeof header;
  } catch {
    return { ok: false, reason: 'malformed_jws' };
  }

  if (header.alg !== 'ES256') return { ok: false, reason: 'wrong_algorithm' };
  if (!Array.isArray(header.x5c) || header.x5c.length !== 3 || !header.x5c.every((c) => typeof c === 'string')) {
    return { ok: false, reason: 'missing_chain' };
  }

  const leaf = parseCert(header.x5c[0] as string);
  const intermediate = parseCert(header.x5c[1] as string);
  const root = parseCert(header.x5c[2] as string);
  if (!leaf || !intermediate || !root) return { ok: false, reason: 'missing_chain' };

  // Anchor: the presented root must be one we pin, byte for byte.
  const anchored = trustedAppleRoots().some((trusted) => trusted.raw.equals(root.raw));
  if (!anchored) return { ok: false, reason: 'untrusted_root' };

  // Chain of signatures: leaf <- intermediate <- root.
  if (!intermediate.verify(root.publicKey) || !leaf.verify(intermediate.publicKey)) {
    return { ok: false, reason: 'broken_chain' };
  }

  if (!leaf.raw.includes(LEAF_MARKER_OID) || !intermediate.raw.includes(INTERMEDIATE_MARKER_OID)) {
    return { ok: false, reason: 'missing_marker_oid' };
  }

  const now = new Date(nowMs);
  if (!certValidAt(leaf, now) || !certValidAt(intermediate, now) || !certValidAt(root, now)) {
    return { ok: false, reason: 'cert_expired' };
  }

  // ES256 over the signing input, JOSE (r||s) signature encoding.
  const signingInput = Buffer.from(`${headerB64}.${payloadB64}`, 'utf8');
  const valid = cryptoVerify('sha256', signingInput, { key: leaf.publicKey, dsaEncoding: 'ieee-p1363' }, signature);
  if (!valid) return { ok: false, reason: 'invalid_signature' };

  const payloadBuf = decodeBase64Url(payloadB64);
  if (!payloadBuf) return { ok: false, reason: 'malformed_payload' };
  try {
    return { ok: true, payload: JSON.parse(payloadBuf.toString('utf8')) as unknown };
  } catch {
    return { ok: false, reason: 'malformed_payload' };
  }
}
