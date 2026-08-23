import { createHash, createHmac } from 'node:crypto';
import { convertToUsd } from '../fx/client.js';
import { fetchWithRetry } from '../util/fetch.js';
import { log } from '../util/log.js';

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

  const res = await fetchWithRetry(`${BASE}${path}`, {
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
  ZGBP: 'GBP',
  ZCAD: 'CAD',
  ZJPY: 'JPY',
  ZAUD: 'AUD',
  ZCHF: 'CHF',
};

/** Fiat that must be converted through the FX rate, not looked up as a coin.
 *  Anything here and not in ASSET_MAP would fall through to getSpotPrice,
 *  fail, and be dropped from the total in silence. */
const FIAT = new Set(['USD', 'EUR', 'GBP', 'CAD', 'JPY', 'AUD', 'CHF']);

/** Strip Kraken's balance suffixes.
 *
 *  Per Kraken's own docs these are `.S` (staked), `.M` (opt-in rewards),
 *  `.F` (automatically earning), `.B` (yield-bearing) and `.T` (tokenized).
 *  `.T` was missing, so a tokenized balance normalized to something like
 *  "ETH.T", failed the spot-price lookup, and was silently dropped from net
 *  worth. Silently, because the only signal is a console.warn.
 *
 *  The previous comment also mislabelled `.M` as margin and `.F` as futures. */
function normalizeAsset(raw: string): string {
  const stripped = raw.replace(/\.(S|M|B|F|T)$/, '');
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

    if (FIAT.has(asset)) {
      // Was a hardcoded `amount * 1.08` for EUR and nothing at all for the
      // other five fiats Kraken holds, which fell through to the spot-price
      // lookup and were dropped. A stale constant in a net worth total is a
      // wrong number presented as a real one, and it drifts further every day.
      try {
        total += await convertToUsd(amount, asset);
      } catch {
        log.warn({ vendor: 'kraken', asset }, 'fx lookup failed, balance excluded');
      }
      continue;
    }

    try {
      const price = await getSpotPrice(asset);
      total += amount * price;
    } catch {
      log.warn({ vendor: 'kraken', asset, raw_asset: rawAsset }, 'skipping unpriceable asset');
    }
  }

  return total;
}
