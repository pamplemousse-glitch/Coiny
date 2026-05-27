const BASE = 'https://api.ynab.com/v1'; // milliunits = currency ÷ 1000

async function ynabGet<T>(apiKey: string, path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(`YNAB GET ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

interface YnabBudgetSummary {
  id: string;
  name: string;
  currency_format: { iso_code: string };
}

interface YnabAccount {
  id: string;
  name: string;
  type: string;
  balance: number; // milliunits
  closed: boolean;
  deleted: boolean;
}

export async function getBudgets(apiKey: string): Promise<YnabBudgetSummary[]> {
  const res = await ynabGet<{ data: { budgets: YnabBudgetSummary[] } }>(apiKey, '/budgets');
  return res.data.budgets;
}

export async function getAccounts(apiKey: string, budgetId: string): Promise<YnabAccount[]> {
  const res = await ynabGet<{ data: { accounts: YnabAccount[] } }>(apiKey, `/budgets/${budgetId}/accounts`);
  return res.data.accounts.filter((a) => !a.closed && !a.deleted);
}

export async function getTotalNetWorth(apiKey: string): Promise<number> {
  const budgets = await getBudgets(apiKey);
  let totalMilliunits = 0;
  for (const budget of budgets) {
    const accounts = await getAccounts(apiKey, budget.id);
    for (const acct of accounts) {
      totalMilliunits += acct.balance;
    }
  }
  return totalMilliunits / 1000;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

async function postToken(
  params: URLSearchParams,
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  const res = await fetch('https://api.ynab.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!res.ok) throw new Error(`YNAB token endpoint → ${res.status}`);
  const data = (await res.json()) as TokenResponse;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

export async function exchangeCodeForTokens(
  clientId: string,
  code: string,
  codeVerifier: string,
  redirectUri: string,
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  return postToken(
    new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
      code,
      code_verifier: codeVerifier,
    }),
  );
}

export async function refreshAccessToken(
  clientId: string,
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  return postToken(
    new URLSearchParams({ grant_type: 'refresh_token', client_id: clientId, refresh_token: refreshToken }),
  );
}
