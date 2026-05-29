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
  const res = await fetch(`${baseUrl(env)}/v2/account`, {
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
