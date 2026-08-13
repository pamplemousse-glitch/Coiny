import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('undici', () => ({ request: vi.fn() }));

import { request } from 'undici';
import { linkTokenCreate } from '../src/plaid/client.js';

const mockedRequest = vi.mocked(request);

function mockPlaidResponse(payload: Record<string, unknown>): void {
  mockedRequest.mockResolvedValue({
    statusCode: 200,
    body: { text: async () => JSON.stringify(payload) },
  } as never);
}

function sentBody(): Record<string, unknown> {
  const call = mockedRequest.mock.calls[0];
  const options = call?.[1] as { body: string };
  return JSON.parse(options.body) as Record<string, unknown>;
}

describe('linkTokenCreate', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockPlaidResponse({ link_token: 'link-test', expiration: '2026-08-12T01:00:00Z', request_id: 'r' });
  });

  it('requests 730 days of transaction history, not the 90-day default', async () => {
    await linkTokenCreate({ client_user_id: 'user-1' });
    const body = sentBody();
    expect(body.transactions).toEqual({ days_requested: 730 });
  });

  it('enrolls only transactions, with investments and liabilities as required-if-supported', async () => {
    // Pin for register row DR-16: every product named in `products` is billed
    // permanently at item creation, so this list must never silently grow.
    await linkTokenCreate({ client_user_id: 'user-1' });
    const body = sentBody();
    expect(body.products).toEqual(['transactions']);
    expect(body.required_if_supported_products).toEqual(['investments', 'liabilities']);
  });
});
