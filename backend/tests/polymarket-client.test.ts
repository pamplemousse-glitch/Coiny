import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getPortfolioValue, getPositions, PolymarketError } from '../src/polymarket/client.js';

const DATA_API_BASE = 'https://data-api.polymarket.com';

function makeResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

const position1 = {
  proxyWallet: '0xabc123',
  asset: '0xasset1',
  conditionId: '0xcond1',
  size: 100,
  avgPrice: 0.6,
  initialValue: 60,
  currentValue: 65.5,
  cashPnl: 5.5,
  percentPnl: 9.17,
  totalBought: 60,
  realizedPnl: 0,
  percentRealizedPnl: 0,
  curPrice: 0.655,
  redeemable: false,
  mergeable: false,
  title: 'Will X happen?',
  slug: 'will-x-happen',
  icon: 'https://example.com/icon.png',
  eventSlug: 'event-slug',
  outcome: 'Yes',
  outcomeIndex: 0,
  oppositeOutcome: 'No',
  oppositeAsset: '0xopposite1',
  endDate: '2025-12-31T00:00:00Z',
  negativeRisk: false,
};

const position2 = {
  proxyWallet: '0xabc123',
  asset: '0xasset2',
  conditionId: '0xcond2',
  size: 50,
  avgPrice: 0.4,
  initialValue: 20,
  currentValue: 22.0,
  cashPnl: 2.0,
  percentPnl: 10.0,
  totalBought: 20,
  realizedPnl: 0,
  percentRealizedPnl: 0,
  curPrice: 0.44,
  redeemable: false,
  mergeable: false,
  title: 'Will Y happen?',
  slug: 'will-y-happen',
  outcome: 'No',
  outcomeIndex: 1,
  oppositeOutcome: 'Yes',
  oppositeAsset: '0xopposite2',
  endDate: '2026-01-31T00:00:00Z',
  negativeRisk: false,
};

describe('getPositions', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses a positions response correctly', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse([position1, position2]));

    const positions = await getPositions('0xabc123');

    expect(positions).toHaveLength(2);
    expect(positions[0]!.asset).toBe('0xasset1');
    expect(positions[0]!.currentValue).toBeCloseTo(65.5);
    expect(positions[0]!.outcome).toBe('Yes');
    expect(positions[1]!.currentValue).toBeCloseTo(22.0);
  });

  it('returns empty array for wallet with no positions', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse([]));

    const positions = await getPositions('0xempty');

    expect(positions).toHaveLength(0);
  });

  it('throws PolymarketError on non-2xx response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ error: 'not found' }, 404));

    await expect(getPositions('0xbad')).rejects.toBeInstanceOf(PolymarketError);
  });

  it('sets PolymarketError.status from HTTP status code', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ error: 'server error' }, 500));

    const err = await getPositions('0xbad').catch((e) => e);
    expect(err).toBeInstanceOf(PolymarketError);
    expect((err as PolymarketError).status).toBe(500);
  });

  it('calls the correct Data API URL with user query param', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse([]));

    await getPositions('0xdeadbeef');

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining(`${DATA_API_BASE}/positions`), expect.anything());
    const calledUrl = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(calledUrl).toContain('user=0xdeadbeef');
  });
});

describe('getPortfolioValue', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns total USD value summed from currentValue fields', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse([position1, position2]));

    const value = await getPortfolioValue('0xabc123');

    // 65.5 + 22.0 = 87.5
    expect(value).toBeCloseTo(87.5);
  });

  it('returns 0 for wallet with no positions', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse([]));

    const value = await getPortfolioValue('0xempty');

    expect(value).toBe(0);
  });

  it('throws PolymarketError on non-2xx response', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse({ error: 'unauthorized' }, 401));

    await expect(getPortfolioValue('0xbad')).rejects.toBeInstanceOf(PolymarketError);
  });

  it('returns correct total for single position', async () => {
    vi.mocked(fetch).mockResolvedValue(makeResponse([position1]));

    const value = await getPortfolioValue('0xabc123');

    expect(value).toBeCloseTo(65.5);
  });
});
