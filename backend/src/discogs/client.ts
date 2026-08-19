import { createHmac, randomBytes } from 'node:crypto';
import { config } from '../config.js';
import { fetchWithRetry } from '../util/fetch.js';

const BASE_URL = 'https://api.discogs.com';
const UA = 'Coiny/1.0 +support@coiny.app';

const pct = encodeURIComponent;

function buildAuthHeader(
  method: string,
  url: string,
  consumerSecret: string,
  tokenSecret: string,
  extraOAuth: Record<string, string> = {},
): string {
  // RFC 5849 §3.4.1: base string URI must NOT include query string;
  // query params are merged into the normalized parameter set.
  const parsed = new URL(url);
  const baseUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname}`;

  const params: Record<string, string> = {
    oauth_consumer_key: config.DISCOGS_CONSUMER_KEY,
    oauth_nonce: randomBytes(12).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0',
    ...extraOAuth,
  };

  // Merge URL query params into the parameter set for signing
  parsed.searchParams.forEach((value, key) => {
    params[key] = value;
  });

  // Sort all params, percent-encode, join for base string
  const paramStr = Object.keys(params)
    .sort()
    .map((k) => `${pct(k)}=${pct(params[k]!)}`)
    .join('&');

  const base = `${method.toUpperCase()}&${pct(baseUrl)}&${pct(paramStr)}`;
  const key = `${pct(consumerSecret)}&${pct(tokenSecret)}`;
  params.oauth_signature = createHmac('sha1', key).update(base).digest('base64');

  // Authorization header contains only oauth_* params (not query params)
  const header = Object.keys(params)
    .filter((k) => k.startsWith('oauth_'))
    .map((k) => `${pct(k)}="${pct(params[k]!)}"`)
    .join(', ');

  return `OAuth ${header}`;
}

function parseFormEncoded(body: string): Record<string, string> {
  return Object.fromEntries(new URLSearchParams(body));
}

export class DiscogsError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'DiscogsError';
  }
}

export async function getRequestToken(): Promise<{
  oauthToken: string;
  oauthTokenSecret: string;
  authorizeUrl: string;
}> {
  const url = `${BASE_URL}/oauth/request_token`;
  const auth = buildAuthHeader('GET', url, config.DISCOGS_CONSUMER_SECRET, '', {
    oauth_callback: 'oob',
  });

  const res = await fetchWithRetry(url, {
    headers: { Authorization: auth, 'User-Agent': UA },
  });
  if (!res.ok) throw new DiscogsError(res.status, `request_token failed: ${res.status}`);

  const parsed = parseFormEncoded(await res.text());
  const oauthToken = parsed.oauth_token;
  const oauthTokenSecret = parsed.oauth_token_secret;
  if (!oauthToken || !oauthTokenSecret) throw new DiscogsError(500, 'malformed request_token response');

  return {
    oauthToken,
    oauthTokenSecret,
    authorizeUrl: `https://www.discogs.com/oauth/authorize?oauth_token=${pct(oauthToken)}`,
  };
}

export async function getAccessToken(
  oauthToken: string,
  oauthTokenSecret: string,
  oauthVerifier: string,
): Promise<{ accessToken: string; accessTokenSecret: string }> {
  const url = `${BASE_URL}/oauth/access_token`;
  const auth = buildAuthHeader('POST', url, config.DISCOGS_CONSUMER_SECRET, oauthTokenSecret, {
    oauth_token: oauthToken,
    oauth_verifier: oauthVerifier,
  });

  const res = await fetchWithRetry(url, {
    method: 'POST',
    headers: { Authorization: auth, 'User-Agent': UA, 'Content-Length': '0' },
  });
  if (!res.ok) throw new DiscogsError(res.status, `access_token failed: ${res.status}`);

  const parsed = parseFormEncoded(await res.text());
  const accessToken = parsed.oauth_token;
  const accessTokenSecret = parsed.oauth_token_secret;
  if (!accessToken || !accessTokenSecret) throw new DiscogsError(500, 'malformed access_token response');

  return { accessToken, accessTokenSecret };
}

export async function getUsername(accessToken: string, accessTokenSecret: string): Promise<string> {
  const url = `${BASE_URL}/oauth/identity`;
  const auth = buildAuthHeader('GET', url, config.DISCOGS_CONSUMER_SECRET, accessTokenSecret, {
    oauth_token: accessToken,
  });

  const res = await fetchWithRetry(url, {
    headers: { Authorization: auth, 'User-Agent': UA },
  });
  if (!res.ok) throw new DiscogsError(res.status, `identity failed: ${res.status}`);

  const body = (await res.json()) as { username: string };
  if (!body.username) throw new DiscogsError(500, 'no username in identity response');
  return body.username;
}

interface MarketplaceStats {
  lowestPriceUsd: number | null;
  numForSale: number;
}

async function getMarketplaceStats(releaseId: number): Promise<MarketplaceStats> {
  const res = await fetchWithRetry(`${BASE_URL}/marketplace/stats/${releaseId}`, {
    headers: { 'User-Agent': UA },
  });
  if (!res.ok) return { lowestPriceUsd: null, numForSale: 0 };

  const body = (await res.json()) as {
    num_for_sale?: number;
    lowest_price?: { value: number; currency: string } | null;
  };

  const raw = body.lowest_price;
  const lowestPriceUsd = raw && raw.currency === 'USD' ? raw.value : null;
  return { lowestPriceUsd, numForSale: body.num_for_sale ?? 0 };
}

export async function syncCollection(
  username: string,
  accessToken: string,
  accessTokenSecret: string,
): Promise<{ totalUsd: number; releaseCount: number; pricedCount: number }> {
  // Fetch first page of collection (max 100 releases per Discogs TOS guidance)
  const collectionUrl = `${BASE_URL}/users/${pct(username)}/collection/folders/0/releases?per_page=100&page=1`;
  const auth = buildAuthHeader('GET', collectionUrl, config.DISCOGS_CONSUMER_SECRET, accessTokenSecret, {
    oauth_token: accessToken,
  });

  const res = await fetchWithRetry(collectionUrl, {
    headers: { Authorization: auth, 'User-Agent': UA },
  });
  if (!res.ok) throw new DiscogsError(res.status, `collection fetch failed: ${res.status}`);

  const body = (await res.json()) as {
    releases: Array<{ basic_information: { id: number } }>;
  };

  const releases = body.releases ?? [];

  // Call marketplace/stats for each release; rate-limit friendly serial loop
  let totalUsd = 0;
  let pricedCount = 0;
  for (const release of releases) {
    const stats = await getMarketplaceStats(release.basic_information.id);
    if (stats.lowestPriceUsd !== null) {
      totalUsd += stats.lowestPriceUsd;
      pricedCount++;
    }
  }

  return { totalUsd, releaseCount: releases.length, pricedCount };
}
