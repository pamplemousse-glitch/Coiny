import { constants, createSign } from 'node:crypto';
import { config } from '../config.js';
import { fetchWithRetry } from '../util/fetch.js';

const BASE_URLS = {
  demo: 'https://demo-api.kalshi.co/trade-api/v2',
  prod: 'https://external-api.kalshi.com/trade-api/v2',
} as const;

function baseUrl(): string {
  return BASE_URLS[config.KALSHI_ENV];
}

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

async function kalshiGet<T>(keyId: string, privateKeyBase64: string, endpoint: string): Promise<T> {
  // The signature covers the full path, not the path relative to the base.
  const path = `/trade-api/v2${endpoint}`;
  const pem = decodePrivateKey(privateKeyBase64);
  const headers = buildHeaders('GET', path, keyId, pem);

  const res = await fetchWithRetry(`${baseUrl()}${endpoint}`, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new KalshiError(res.status, `Kalshi error ${res.status}: ${text.slice(0, 200)}`);
  }
  return (await res.json()) as T;
}

/** Cash and positions, kept apart because they mean different things. */
export interface KalshiBalance {
  /** Available cash, spendable today. */
  cashUsd: number;
  /** Current value of the open contracts. */
  positionsUsd: number;
  /** What the account is worth: the two above, added. */
  totalUsd: number;
}

/**
 * `GET /portfolio/balance` returns `balance` (available cash, cents) and
 * `portfolio_value` (value of positions held, cents). Per Kalshi's schema both
 * are required fields and they are ADDITIVE, not alternatives.
 *
 * This used to read `portfolio_value ?? balance`, which takes one or the other.
 * Since portfolio_value is always present, `balance` was never counted: an
 * account with $1,000 cash and $500 of positions reported $500, and the cash
 * disappeared from net worth without any error to show for it.
 */
export async function getBalance(keyId: string, privateKeyBase64: string): Promise<KalshiBalance> {
  const body = await kalshiGet<{ balance?: number; portfolio_value?: number }>(
    keyId,
    privateKeyBase64,
    '/portfolio/balance',
  );
  const cashUsd = (body.balance ?? 0) / 100;
  const positionsUsd = (body.portfolio_value ?? 0) / 100;
  return { cashUsd, positionsUsd, totalUsd: cashUsd + positionsUsd };
}

/** Total account value in USD: cash plus open positions. */
export async function getPortfolioBalance(keyId: string, privateKeyBase64: string): Promise<number> {
  const { totalUsd } = await getBalance(keyId, privateKeyBase64);
  return totalUsd;
}

/** One open market position. Kalshi sends every money and count field as a
 *  fixed-point STRING, not a number, so each one is parsed here rather than at
 *  each call site. */
export interface KalshiMarketPosition {
  ticker: string;
  /** Contracts held. Negative means NO contracts, positive means YES. */
  contracts: number;
  /** Cost of the aggregate position, in USD. */
  exposureUsd: number;
  totalTradedUsd: number;
  realizedPnlUsd: number;
  feesPaidUsd: number;
}

/** One open event position, the aggregate across an event's markets. */
export interface KalshiEventPosition {
  eventTicker: string;
  totalCostUsd: number;
  exposureUsd: number;
  realizedPnlUsd: number;
  feesPaidUsd: number;
}

const money = (v: string | number | undefined): number => {
  const n = typeof v === 'number' ? v : Number.parseFloat(v ?? '0');
  return Number.isFinite(n) ? n : 0;
};

interface RawPositionsResponse {
  market_positions?: Array<{
    ticker?: string;
    position_fp?: string;
    market_exposure_dollars?: string;
    total_traded_dollars?: string;
    realized_pnl_dollars?: string;
    fees_paid_dollars?: string;
  }>;
  event_positions?: Array<{
    event_ticker?: string;
    total_cost_dollars?: string;
    event_exposure_dollars?: string;
    realized_pnl_dollars?: string;
    fees_paid_dollars?: string;
  }>;
  cursor?: string;
}

/**
 * Per-market and per-event detail behind the `portfolio_value` total.
 *
 * `count_filter=position` asks Kalshi to omit rows whose position is zero, so a
 * long trading history does not return thousands of settled markets. The
 * response is paginated; every page is followed, because a truncated holdings
 * list is a wrong holdings list.
 */
export async function getPositions(
  keyId: string,
  privateKeyBase64: string,
): Promise<{ markets: KalshiMarketPosition[]; events: KalshiEventPosition[] }> {
  const markets: KalshiMarketPosition[] = [];
  const events: KalshiEventPosition[] = [];

  let cursor: string | undefined;
  // Bounded so a server that keeps handing back the same cursor cannot spin
  // forever inside a request.
  for (let page = 0; page < 20; page += 1) {
    const query = new URLSearchParams({ count_filter: 'position', limit: '200' });
    if (cursor) query.set('cursor', cursor);

    const body = await kalshiGet<RawPositionsResponse>(
      keyId,
      privateKeyBase64,
      `/portfolio/positions?${query.toString()}`,
    );

    for (const p of body.market_positions ?? []) {
      markets.push({
        ticker: p.ticker ?? '',
        contracts: money(p.position_fp),
        exposureUsd: money(p.market_exposure_dollars),
        totalTradedUsd: money(p.total_traded_dollars),
        realizedPnlUsd: money(p.realized_pnl_dollars),
        feesPaidUsd: money(p.fees_paid_dollars),
      });
    }
    for (const e of body.event_positions ?? []) {
      events.push({
        eventTicker: e.event_ticker ?? '',
        totalCostUsd: money(e.total_cost_dollars),
        exposureUsd: money(e.event_exposure_dollars),
        realizedPnlUsd: money(e.realized_pnl_dollars),
        feesPaidUsd: money(e.fees_paid_dollars),
      });
    }

    if (!body.cursor || body.cursor === cursor) break;
    cursor = body.cursor;
  }

  return { markets, events };
}
