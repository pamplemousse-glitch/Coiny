import { fetchWithRetry } from '../util/fetch.js';
// Alpaca Markets REST API v2.
// Auth: APCA-API-KEY-ID + APCA-API-SECRET-KEY headers.
// env: 'live' → api.alpaca.markets, 'paper' → paper-api.alpaca.markets

export type AlpacaEnv = 'live' | 'paper';

export class AlpacaError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'AlpacaError';
  }
}

function baseUrl(env: AlpacaEnv): string {
  return env === 'live' ? 'https://api.alpaca.markets' : 'https://paper-api.alpaca.markets';
}

interface AlpacaAccount {
  equity: string; // total account equity (cash + long market value - short market value)
  cash: string;
  portfolio_value: string;
  long_market_value: string;
  short_market_value: string;
  status: string;
}

export async function getAccount(apiKeyId: string, apiSecretKey: string, env: AlpacaEnv): Promise<AlpacaAccount> {
  const res = await fetchWithRetry(`${baseUrl(env)}/v2/account`, {
    headers: {
      'APCA-API-KEY-ID': apiKeyId,
      'APCA-API-SECRET-KEY': apiSecretKey,
    },
  });

  if (res.status === 401 || res.status === 403) {
    throw new AlpacaError('Invalid Alpaca API credentials', res.status);
  }
  if (!res.ok) {
    throw new AlpacaError(`Alpaca account fetch failed: ${res.status}`, res.status);
  }

  return (await res.json()) as AlpacaAccount;
}

// Returns total account equity in USD.
export async function getEquityUsd(apiKeyId: string, apiSecretKey: string, env: AlpacaEnv): Promise<number> {
  const account = await getAccount(apiKeyId, apiSecretKey, env);
  return parseFloat(account.equity);
}

/** One open position. Every numeric field on the wire is a STRING, so each is
 *  parsed here rather than at the call sites. */
export interface AlpacaPosition {
  symbol: string;
  /** us_equity, us_option, crypto, treasury, and so on. */
  assetClass: string;
  /** long or short. */
  side: string;
  qty: number;
  /** Total dollar amount of the position. */
  marketValueUsd: number;
  costBasisUsd: number;
  currentPriceUsd: number;
  avgEntryPriceUsd: number;
  unrealizedPlUsd: number;
}

interface RawPosition {
  symbol?: string;
  asset_class?: string;
  side?: string;
  qty?: string;
  market_value?: string;
  cost_basis?: string;
  current_price?: string;
  avg_entry_price?: string;
  unrealized_pl?: string;
}

const num = (v: string | undefined): number => {
  const n = Number.parseFloat(v ?? '0');
  return Number.isFinite(n) ? n : 0;
};

/**
 * `GET /v2/positions`, the individual holdings behind the single equity figure
 * that `/v2/account` reports.
 *
 * Until this existed a connected brokerage appeared in Coiny as one opaque
 * number, which is the shallow end of exactly the axis the product competes on.
 * Closed positions are not returned by this endpoint, by design: it is current
 * holdings, not history.
 */
export async function getPositions(apiKeyId: string, apiSecretKey: string, env: AlpacaEnv): Promise<AlpacaPosition[]> {
  const res = await fetchWithRetry(`${baseUrl(env)}/v2/positions`, {
    headers: {
      'APCA-API-KEY-ID': apiKeyId,
      'APCA-API-SECRET-KEY': apiSecretKey,
    },
  });

  if (res.status === 401 || res.status === 403) {
    throw new AlpacaError('Invalid Alpaca API credentials', res.status);
  }
  if (!res.ok) {
    throw new AlpacaError(`Alpaca positions fetch failed: ${res.status}`, res.status);
  }

  const raw = (await res.json()) as RawPosition[];
  // An account with nothing open returns [], which is a valid answer and not an
  // error state.
  if (!Array.isArray(raw)) return [];

  return raw.map((p) => ({
    symbol: p.symbol ?? '',
    assetClass: p.asset_class ?? 'unknown',
    side: p.side ?? 'long',
    qty: num(p.qty),
    marketValueUsd: num(p.market_value),
    costBasisUsd: num(p.cost_basis),
    currentPriceUsd: num(p.current_price),
    avgEntryPriceUsd: num(p.avg_entry_price),
    unrealizedPlUsd: num(p.unrealized_pl),
  }));
}
