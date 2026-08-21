import { z } from 'zod';
import { config } from '../config.js';
import { fetchWithRetry } from '../util/fetch.js';

// ASSET HUB, not the relay chain.
//
// Polkadot moved balances, staking and governance from the Relay Chain to
// Polkadot Asset Hub on 2025-11-04, atomically. Polkadot's own support
// documentation is explicit: "With balances now recorded on the Polkadot Asset
// Hub, wallets will query this chain to display your account balances... The
// same applies to staking or governance activities."
//
// This client pointed at `polkadot.api.subscan.io` (the relay) and therefore
// reported near-zero DOT for every real holder. Verified on chain against both
// RPCs: the treasury address holds 2,226 DOT of residual dust on the relay and
// 24,310,025 DOT on Asset Hub, and the relay's staking pallet has ZERO ledger
// entries while Asset Hub has thousands.
//
// That is the same defect class as #289: a wrong answer presented with the
// same confidence as a right one. Worse here, because it reads as "this wallet
// is empty" rather than as an error.
//
// Residual dust means the relay is not guaranteed to return exactly zero, so
// this was an UNDER-COUNT rather than a clean failure, which is precisely why
// nothing caught it.
const BASE_URL = 'https://assethub-polkadot.api.subscan.io/api/v2/scan/search';

const ResponseSchema = z.object({
  code: z.number(),
  data: z
    .object({
      account: z
        .object({
          // Subscan computes this as `free + reserved`, i.e. the TOTAL. Their
          // own backend does `accountData.Data.Free.Add(accountData.Data.Reserved)`,
          // and the API exposes no `free` field at all.
          balance: z.string(),
          // Directly nominated stake, and stake being withdrawn. Both are
          // ALREADY INSIDE `balance` — see getPolkadotStakedBalance.
          bonded: z.string().optional(),
          unbonding: z.string().optional(),
        })
        .nullable(),
    })
    .nullable(),
});

// Derived from the schema rather than restated: under
// exactOptionalPropertyTypes a hand-written `bonded?: string` is a DIFFERENT
// type from zod's `bonded?: string | undefined`, and restating it is how the
// two drift.
type SubscanAccount = NonNullable<NonNullable<z.infer<typeof ResponseSchema>['data']>['account']>;

async function fetchAccount(address: string): Promise<SubscanAccount | null | 'empty'> {
  if (!config.SUBSCAN_API_KEY) return null;

  const res = await fetchWithRetry(BASE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': config.SUBSCAN_API_KEY,
    },
    body: JSON.stringify({ key: address, row: 1, page: 0 }),
  });

  if (res.status === 404) return 'empty';
  if (!res.ok) return null;

  const raw: unknown = await res.json();
  const parsed = ResponseSchema.safeParse(raw);
  if (!parsed.success) return null;
  // A non-zero Subscan code is an API-level error reported inside a 200.
  if (parsed.data.code !== 0) return null;
  // A successful lookup that carries no account is Subscan saying the address
  // is unknown to it, which is an empty account rather than a failed call.
  if (parsed.data.data === null) return 'empty';
  if (parsed.data.data.account === null) return 'empty';

  return parsed.data.data.account;
}

/** DOT held at an address, or null when the balance could not be determined.
 *
 *  See getCardanoBalance: null means unknown and preserves the stored value,
 *  0 means the account really is empty and overwrites it. Subscan needs a key
 *  and rate limits, so the unknown branches here are reachable in normal
 *  operation, not just in a disaster.
 *
 *  This is the TOTAL and nothing is added to it. See getPolkadotStakedBalance
 *  for why adding `bonded` would count the stake twice. */
export async function getPolkadotBalance(address: string): Promise<number | null> {
  const account = await fetchAccount(address);
  if (account === null) return null;
  if (account === 'empty') return 0;

  const balance = Number.parseFloat(account.balance);
  return Number.isFinite(balance) ? balance : null;
}

/**
 * The staked portion OF the balance above — never additional to it.
 *
 * THE TRAP THIS EXISTS TO DOCUMENT: `balance + bonded` DOUBLE COUNTS.
 *
 * Two independent proofs. First, Subscan computes `balance` as
 * `free + reserved`, so it is already the total. Second, Polkadot migrated
 * staking from LOCKS to HOLDS: the wiki now says "Reserved Balance (also
 * called holds) is the balance removed from free and does not overlay... used
 * for native staking on the Polkadot Hub".
 *
 * Verified directly against Polkadot Asset Hub, not taken on trust. Account
 * 15aBy7hAzkVCbX4rkB8mdn2NCZNL6m456QQgM2pVcimfNBQ8 returns:
 *
 *     free                 28.0021686817
 *     reserved              5.6891446119
 *     frozen                0
 *     free + reserved      33.6913132936   <- what Subscan reports as `balance`
 *     staking.ledger.total  5.6891446119   <- EQUALS reserved
 *     balances.locks        []             <- empty: staking is not a lock
 *     balances.holds        [{ Staking: 56891446119 }]  <- equals reserved
 *
 * So bonded is inside reserved, which is inside balance. Re-run that query
 * against any staker to check this rather than believing the comment.
 *
 * The pre-migration answer was the same for a different reason: staking was
 * then a lock inside `free`, and `free + reserved` contained it anyway.
 * Adding has never been correct; only the mechanism changed.
 *
 * `nomination_pool_balance` is deliberately NOT read here for the same reason.
 * A pool member holds a `DelegatedStaking::StakingDelegation` hold on their
 * own account, so pool stake also sits in `reserved` and therefore in
 * `balance`. It is not in `bonded`, so a pool staker reports zero staked here
 * rather than a wrong number — an honest gap, not a silent error.
 */
export async function getPolkadotStakedBalance(address: string): Promise<number | null> {
  const account = await fetchAccount(address);
  if (account === null) return null;
  if (account === 'empty') return 0;

  let staked = 0;
  for (const raw of [account.bonded, account.unbonding]) {
    if (raw === undefined) continue;
    const amount = Number.parseFloat(raw);
    if (Number.isFinite(amount)) staked += amount;
  }
  return staked;
}
