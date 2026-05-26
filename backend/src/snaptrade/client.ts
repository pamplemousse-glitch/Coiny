import { createHmac } from 'node:crypto';
import { config } from '../config.js';

const BASE = 'https://api.snaptrade.com';

// SnapTrade requires canonical JSON with alphabetically sorted keys at every level.
function sortedStringify(val: unknown): string {
  if (val === null || typeof val !== 'object') return JSON.stringify(val);
  if (Array.isArray(val)) return `[${(val as unknown[]).map(sortedStringify).join(',')}]`;
  const keys = Object.keys(val as object).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${sortedStringify((val as Record<string, unknown>)[k])}`).join(',')}}`;
}

function sign(fullPath: string, query: string, body: unknown): string {
  const payload = sortedStringify({ content: body ?? null, path: fullPath, query });
  return createHmac('sha256', config.SNAPTRADE_CONSUMER_KEY).update(payload, 'utf8').digest('base64');
}

async function snap<T>(
  method: 'GET' | 'POST' | 'DELETE',
  pathSuffix: string,
  params: Record<string, string>,
  body?: unknown,
): Promise<T> {
  const fullPath = `/api/v1${pathSuffix}`;
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const qs = new URLSearchParams({ clientId: config.SNAPTRADE_CLIENT_ID, timestamp, ...params }).toString();
  const signature = sign(fullPath, qs, body ?? null);

  const res = await fetch(`${BASE}${fullPath}?${qs}`, {
    method,
    headers: { 'Content-Type': 'application/json', Signature: signature },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  if (!res.ok) throw new Error(`SnapTrade ${method} ${pathSuffix} → ${res.status}`);
  return res.json() as Promise<T>;
}

export async function snapRegisterUser(snapUserId: string): Promise<{ userId: string; userSecret: string }> {
  return snap('POST', '/snapTrade/registerUser', {}, { userId: snapUserId });
}

export async function snapGetLoginUrl(snapUserId: string, userSecret: string): Promise<string> {
  const res = await snap<{ redirectURI: string }>('POST', '/snapTrade/login', { userId: snapUserId, userSecret }, {});
  return res.redirectURI;
}

export interface SnapAccount {
  id: string;
  name: string;
  institution_name: string;
  balance: { total: { amount: number; currency: string } };
}

export async function snapGetAccounts(snapUserId: string, userSecret: string): Promise<SnapAccount[]> {
  return snap('GET', '/accounts', { userId: snapUserId, userSecret });
}

export async function snapDeleteUser(snapUserId: string, userSecret: string): Promise<void> {
  await snap('DELETE', '/snapTrade/deleteUser', { userId: snapUserId, userSecret });
}
