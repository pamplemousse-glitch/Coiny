import { and, eq } from 'drizzle-orm';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { getAptosBalance } from '../chains/aptos.js';
import { getBitcoinBalance } from '../chains/bitcoin.js';
import { getBlockcypherBalance } from '../chains/blockcypher.js';
import { getCardanoBalance } from '../chains/cardano.js';
import { getCosmosBalance } from '../chains/cosmos.js';
import { getHederaBalance } from '../chains/hedera.js';
import { getNearBalance } from '../chains/near.js';
import { getPolkadotBalance } from '../chains/polkadot.js';
import { getSolanaTotalBalance } from '../chains/solana.js';
import { getStellarBalance } from '../chains/stellar.js';
import { getSuiBalance } from '../chains/sui.js';
import { getTonBalance } from '../chains/ton.js';
import { getXrpBalance } from '../chains/xrp.js';
import { getSpotPrices } from '../coinbase/client.js';
import { config } from '../config.js';
import { db } from '../db/client.js';
import { chainWallets } from '../db/schema.js';
import { SYNC_LIMIT } from './rate-limits.js';

// Maps chain identifier to the Coinbase spot price symbol.
export const CHAIN_SYMBOLS: Record<string, string> = {
  bitcoin: 'BTC',
  xrp: 'XRP',
  stellar: 'XLM',
  doge: 'DOGE',
  ltc: 'LTC',
  bch: 'BCH',
  cosmos: 'ATOM',
  osmosis: 'OSMO',
  near: 'NEAR',
  aptos: 'APT',
  sui: 'SUI',
  hedera: 'HBAR',
  polkadot: 'DOT',
  cardano: 'ADA',
  ton: 'TON',
  solana: 'SOL',
};

// Returns native-unit balance for the given chain and address.
// Returns null when no client is available for the chain yet — each chain PR
// adds a case — AND when the chain's client could not determine the balance.
// Both mean "unknown", and the caller must treat them the same way: leave the
// stored balance alone. Only a number is an assertion about the wallet.
export async function fetchNativeBalance(chain: string, address: string): Promise<number | null> {
  switch (chain) {
    case 'bitcoin':
      return getBitcoinBalance(address);
    case 'xrp':
      return getXrpBalance(address);
    case 'stellar':
      return getStellarBalance(address);
    case 'doge':
    case 'ltc':
    case 'bch':
      return getBlockcypherBalance(chain, address);
    case 'cosmos':
    case 'osmosis':
      return getCosmosBalance(chain, address);
    case 'near':
      return getNearBalance(address);
    case 'aptos':
      return getAptosBalance(address);
    case 'sui':
      return getSuiBalance(address);
    case 'hedera':
      return getHederaBalance(address);
    case 'polkadot':
      return getPolkadotBalance(address);
    case 'cardano':
      return getCardanoBalance(address);
    case 'ton':
      return getTonBalance(address);
    case 'solana':
      return getSolanaTotalBalance(address, config.HELIUS_API_KEY);
    default:
      return null;
  }
}

const AddWalletBodySchema = z.object({
  chain: z.enum([
    'bitcoin',
    'xrp',
    'stellar',
    'doge',
    'ltc',
    'bch',
    'cosmos',
    'osmosis',
    'near',
    'aptos',
    'sui',
    'hedera',
    'polkadot',
    'cardano',
    'ton',
    'solana',
  ]),
  address: z.string().min(1).max(200),
  label: z.string().max(100).optional(),
});

export function registerChainWalletsApi(app: FastifyInstance): void {
  // GET /api/chain-wallets
  app.get('/api/chain-wallets', async (req: FastifyRequest) => {
    const rows = await db().select().from(chainWallets).where(eq(chainWallets.userId, req.user!.id));
    return rows.map((r) => ({
      id: r.id,
      chain: r.chain,
      address: r.address,
      label: r.label ?? null,
      lastBalanceUsd: r.lastBalanceUsd !== null ? parseFloat(r.lastBalanceUsd) : null,
      lastSyncedAt: r.lastSyncedAt?.toISOString() ?? null,
      createdAt: r.createdAt.toISOString(),
    }));
  });

  // POST /api/chain-wallets
  app.post('/api/chain-wallets', async (req: FastifyRequest, reply: FastifyReply) => {
    const parsed = AddWalletBodySchema.safeParse(req.body);
    if (!parsed.success) return reply.status(400).send({ error: parsed.error.flatten() });

    const { chain, address, label } = parsed.data;
    const userId = req.user!.id;

    await db()
      .insert(chainWallets)
      .values({ userId, chain, address, label: label ?? null })
      .onConflictDoNothing();

    req.log.info({ userId, chain }, 'chain wallet added');
    return reply.status(201).send({ ok: true, chain, address });
  });

  // DELETE /api/chain-wallets/:chain/:address
  app.delete(
    '/api/chain-wallets/:chain/:address',
    async (req: FastifyRequest<{ Params: { chain: string; address: string } }>, reply: FastifyReply) => {
      const { chain, address } = req.params;
      const userId = req.user!.id;

      await db()
        .delete(chainWallets)
        .where(and(eq(chainWallets.userId, userId), eq(chainWallets.chain, chain), eq(chainWallets.address, address)));

      req.log.info({ userId, chain }, 'chain wallet removed');
      return reply.status(204).send();
    },
  );

  // POST /api/chain-wallets/sync
  // Fetches live native balances via chain-specific clients, converts to USD, and persists.
  app.post('/api/chain-wallets/sync', SYNC_LIMIT, async (req: FastifyRequest) => {
    const userId = req.user!.id;
    const rows = await db().select().from(chainWallets).where(eq(chainWallets.userId, userId));

    if (rows.length === 0) return { updated: 0 };

    const symbols = [...new Set(rows.map((r) => CHAIN_SYMBOLS[r.chain]).filter((s): s is string => !!s))];
    const prices = symbols.length > 0 ? await getSpotPrices(symbols) : new Map<string, number>();

    let updated = 0;
    let unpriced = 0;
    let unresolved = 0;
    const now = new Date();

    for (const row of rows) {
      const nativeBalance = await fetchNativeBalance(row.chain, row.address);

      // The balance half of the same rule the price half enforces below: a
      // balance we could not read is NOT a balance of zero. Every chain client
      // used to answer 0 for a missing API key, an upstream outage or a shape
      // it did not recognise, and 0 is not null, so those sailed past this
      // guard and were multiplied by a good price and persisted. An expired
      // Blockfrost key was enough to write a user's whole ADA position to
      // nothing, with no error raised anywhere.
      if (nativeBalance === null) {
        unresolved++;
        req.log.warn({ userId, chain: row.chain }, 'balance unresolved for chain; leaving last known balance');
        continue;
      }

      const symbol = CHAIN_SYMBOLS[row.chain];
      const price = symbol ? prices.get(symbol) : undefined;

      // An unpriced coin is NOT a coin worth nothing.
      //
      // This used to be `prices.get(symbol) ?? 0`, so a missing price produced
      // balanceUsd = 0 and PERSISTED it over the last known good value. And
      // getSpotPrices never throws: its own contract is "symbols that fail are
      // omitted", so a Coinbase outage returns an empty map and every one of
      // the sixteen chains here would have been written to zero at once, with
      // no error anywhere. A user's whole crypto column could go to nothing
      // because a third party had a bad minute.
      //
      // Skipping leaves the previous balance and `lastSyncedAt` untouched, so
      // the value reads as stale (which it is) rather than as zero (which it
      // is not). Same reasoning the Hyperliquid client already applies to a
      // token with no mid.
      if (price === undefined) {
        unpriced++;
        req.log.warn({ userId, chain: row.chain }, 'no spot price for chain; leaving last known balance');
        continue;
      }

      const balanceUsd = nativeBalance * price;

      await db()
        .update(chainWallets)
        .set({ lastBalanceUsd: balanceUsd.toString(), lastSyncedAt: now })
        .where(and(eq(chainWallets.userId, userId), eq(chainWallets.id, row.id)));

      updated++;
    }

    req.log.info({ userId, updated, unpriced, unresolved }, 'chain wallets sync complete');
    return { updated, unpriced, unresolved };
  });
}
