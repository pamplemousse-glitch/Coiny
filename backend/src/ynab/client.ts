const BASE = 'https://api.ynab.com/v1';

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
