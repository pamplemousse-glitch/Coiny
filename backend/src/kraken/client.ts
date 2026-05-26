import { createHash, createHmac } from 'node:crypto';

const BASE = 'https://api.kraken.com';

// Kraken HMAC-SHA512 private API signing:
// 1. nonce  = Date.now().toString()
// 2. postData = URLSearchParams({ nonce, ...params }).toString()
// 3. message = path + SHA256(nonce + postData)   [SHA256 as binary, not hex]
// 4. signature = HMAC-SHA512(message, base64-decode(privateKey)) as base64
function sign(path: string, nonce: string, postData: string, privateKey: string): string {
  const hash = createHash('sha256')
    .update(nonce + postData)
    .digest();
  const message = Buffer.concat([Buffer.from(path), hash]);
  return createHmac('sha512', Buffer.from(privateKey, 'base64')).update(message).digest('base64');
}

async function krakenPost<T>(
  apiKey: string,
  privateKey: string,
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const nonce = Date.now().toString();
  const postData = new URLSearchParams({ nonce, ...params }).toString();
  const signature = sign(path, nonce, postData, privateKey);

  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'API-Key': apiKey,
      'API-Sign': signature,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: postData,
  });

  if (!res.ok) throw new Error(`Kraken POST ${path} → ${res.status}`);
  const json = (await res.json()) as { error: string[]; result: T };
  if (json.error.length > 0) throw new Error(`Kraken API error: ${json.error.join(', ')}`);
  return json.result;
}

// Kraken internal asset name → canonical ticker
const ASSET_MAP: Record<string, string> = {
  XXBT: 'BTC',
  XETH: 'ETH',
  XXRP: 'XRP',
  XXLM: 'XLM',
  XLTC: 'LTC',
  XXDG: 'DOGE',
  ZUSD: 'USD',
  ZEUR: 'EUR',
};

// Strip Kraken suffixes: .S (staked), .M (margin), .B (bonded), .F (futures)
function normalizeAsset(raw: string): string {
  const stripped = raw.replace(/\.(S|M|B|F)$/, '');
  return ASSET_MAP[stripped] ?? stripped;
}

export async function getBalance(apiKey: string, privateKey: string): Promise<Record<string, string>> {
  return krakenPost<Record<string, string>>(apiKey, privateKey, '/0/private/Balance');
}

export async function getTotalUsd(
  apiKey: string,
  privateKey: string,
  getSpotPrice: (asset: string) => Promise<number>,
): Promise<number> {
  const balances = await getBalance(apiKey, privateKey);
  let total = 0;

  for (const [rawAsset, rawAmount] of Object.entries(balances)) {
    const amount = parseFloat(rawAmount);
    if (amount <= 0) continue;

    const asset = normalizeAsset(rawAsset);

    if (asset === 'USD') {
      total += amount;
      continue;
    }

    if (asset === 'EUR') {
      // Use a fixed approximation for EUR; skip if we don't want the complexity
      total += amount * 1.08;
      continue;
    }

    try {
      const price = await getSpotPrice(asset);
      total += amount * price;
    } catch {
      console.warn(`[kraken] skipping unknown asset ${rawAsset} (normalized: ${asset})`);
    }
  }

  return total;
}
