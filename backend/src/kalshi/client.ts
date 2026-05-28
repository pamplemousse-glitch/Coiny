import { constants, createSign } from 'node:crypto';

const BASE_URL = 'https://external-api.kalshi.com/trade-api/v2';

export class KalshiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'KalshiError';
  }
}

function buildHeaders(method: string, path: string, keyId: string, privateKeyPem: string): Record<string, string> {
  const timestamp = Date.now().toString();
  const message = `${timestamp}${method.toUpperCase()}${path}`;

  const sign = createSign('SHA256');
  sign.update(message);
  const signature = sign.sign(
    { key: privateKeyPem, padding: constants.RSA_PKCS1_PSS_PADDING, saltLength: 32 },
    'base64',
  );

  return {
    'KALSHI-ACCESS-KEY': keyId,
    'KALSHI-ACCESS-TIMESTAMP': timestamp,
    'KALSHI-ACCESS-SIGNATURE': signature,
    'Content-Type': 'application/json',
  };
}

export function decodePrivateKey(privateKeyBase64: string): string {
  return Buffer.from(privateKeyBase64, 'base64').toString('utf8');
}

export async function getPortfolioBalance(keyId: string, privateKeyBase64: string): Promise<number> {
  const path = '/trade-api/v2/portfolio/balance';
  const pem = decodePrivateKey(privateKeyBase64);
  const headers = buildHeaders('GET', path, keyId, pem);

  const res = await fetch(`${BASE_URL}/portfolio/balance`, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new KalshiError(res.status, `Kalshi error ${res.status}: ${text.slice(0, 200)}`);
  }

  const body = (await res.json()) as { balance?: number; portfolio_value?: number };
  // portfolio_value includes open positions; balance is cash only. Both in cents.
  const cents = body.portfolio_value ?? body.balance ?? 0;
  return cents / 100;
}
