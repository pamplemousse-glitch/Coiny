import { createHmac, timingSafeEqual } from 'node:crypto';

const MAX_AGE_SECONDS = 180;

export type VerifyResult =
  | { ok: true }
  | { ok: false; reason: 'missing_header' | 'malformed_header' | 'timestamp_expired' | 'invalid_signature' | 'no_secret' };

export function verifyTellerSignature(
  signatureHeader: string | undefined,
  rawBody: Buffer,
  secret: string,
  nowMs = Date.now(),
): VerifyResult {
  if (!signatureHeader) return { ok: false, reason: 'missing_header' };

  const parts = Object.fromEntries(
    signatureHeader.split(',').map((part) => part.split('=', 2) as [string, string]),
  );

  const timestamp = parts['t'];
  const sig = parts['v1'];

  if (!timestamp || !sig) return { ok: false, reason: 'malformed_header' };

  const tsSeconds = parseInt(timestamp, 10);
  if (!Number.isFinite(tsSeconds)) return { ok: false, reason: 'malformed_header' };

  const ageSeconds = (nowMs / 1000) - tsSeconds;
  if (ageSeconds > MAX_AGE_SECONDS || ageSeconds < -MAX_AGE_SECONDS) {
    return { ok: false, reason: 'timestamp_expired' };
  }

  if (!secret) return { ok: false, reason: 'no_secret' };

  const payload = `${timestamp}.${rawBody.toString('utf8')}`;
  const expected = createHmac('sha256', secret).update(payload).digest('hex');

  const expectedBuf = Buffer.from(expected, 'hex');
  const sigBuf = Buffer.from(sig, 'hex');

  if (expectedBuf.length !== sigBuf.length) return { ok: false, reason: 'invalid_signature' };

  if (!timingSafeEqual(expectedBuf, sigBuf)) return { ok: false, reason: 'invalid_signature' };

  return { ok: true };
}

export function buildSignatureHeader(rawBody: Buffer, secret: string, timestampSeconds?: number): string {
  const ts = timestampSeconds ?? Math.floor(Date.now() / 1000);
  const payload = `${ts}.${rawBody.toString('utf8')}`;
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  return `t=${ts},v1=${sig}`;
}
