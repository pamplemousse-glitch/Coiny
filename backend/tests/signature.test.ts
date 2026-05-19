import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyTellerSignature } from '../src/teller/signature.js';

const SECRET = 'test-secret-abc123';
const BODY = Buffer.from('{"id":"evt_1","type":"webhook.test"}', 'utf8');

function buildHeader(body: Buffer, secret: string, ts: number): string {
  const payload = `${ts}.${body.toString('utf8')}`;
  const sig = createHmac('sha256', secret).update(payload).digest('hex');
  return `t=${ts},v1=${sig}`;
}

const NOW_MS = Date.now();
const NOW_S = Math.floor(NOW_MS / 1000);

describe('verifyTellerSignature', () => {
  it('accepts a valid signature', () => {
    const header = buildHeader(BODY, SECRET, NOW_S);
    const result = verifyTellerSignature(header, BODY, SECRET, NOW_MS);
    expect(result.ok).toBe(true);
  });

  it('rejects a bad signature', () => {
    const header = buildHeader(BODY, 'wrong-secret', NOW_S);
    const result = verifyTellerSignature(header, BODY, SECRET, NOW_MS);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe('invalid_signature');
  });

  it('rejects a timestamp older than 3 minutes', () => {
    const staleTs = NOW_S - 200;
    const header = buildHeader(BODY, SECRET, staleTs);
    const result = verifyTellerSignature(header, BODY, SECRET, NOW_MS);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe('timestamp_expired');
  });

  it('rejects when header is missing', () => {
    const result = verifyTellerSignature(undefined, BODY, SECRET, NOW_MS);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe('missing_header');
  });

  it('returns no_secret when secret is empty', () => {
    const header = buildHeader(BODY, SECRET, NOW_S);
    const result = verifyTellerSignature(header, BODY, '', NOW_MS);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe('no_secret');
  });

  it('rejects a malformed header', () => {
    const result = verifyTellerSignature('notaheader', BODY, SECRET, NOW_MS);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.reason).toBe('malformed_header');
  });
});
