import { getGlobalDispatcher, MockAgent, setGlobalDispatcher } from 'undici';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

// Twenty tests once passed locally and failed in CI while quietly making real
// HTTP requests to Plaid. The cause was not the tests: MockAgent installs a
// dispatcher through the npm `undici` package, and whether the built-in global
// `fetch` honours that depends on Node's bundled undici matching the packaged
// one. It matched on the laptop and did not on the runner.
//
// The failure mode is what makes it dangerous. Nothing errors. `disableNetConnect`
// is simply never consulted, and every "mocked" call leaves the machine.
//
// This test asserts the interception itself, so if the runtime and the package
// ever drift apart again, one obvious test fails with a clear reason instead of
// twenty confusing ones that look like flakiness.

describe('undici MockAgent actually intercepts global fetch', () => {
  let original: ReturnType<typeof getGlobalDispatcher>;
  let agent: MockAgent;

  beforeEach(() => {
    original = getGlobalDispatcher();
    agent = new MockAgent();
    agent.disableNetConnect();
    setGlobalDispatcher(agent);
  });

  afterEach(async () => {
    await agent.close();
    setGlobalDispatcher(original);
  });

  it('serves a mocked response to global fetch', async () => {
    agent.get('https://mock-interception.invalid').intercept({ path: '/ping', method: 'GET' }).reply(200, { ok: true });

    const res = await fetch('https://mock-interception.invalid/ping');
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ ok: true });
  });

  // The half that matters most. If interception is not wired up, this request
  // is attempted for real: it resolves on a machine with network access and
  // fails on one without, which is exactly the local-passes-CI-fails shape.
  it('refuses an unmocked request rather than reaching the network', async () => {
    await expect(fetch('https://mock-interception.invalid/not-mocked')).rejects.toThrow();
  });

  it('intercepts fetch called through util/fetch.ts, not just directly', async () => {
    const { fetchWithRetry } = await import('../src/util/fetch.js');

    agent
      .get('https://mock-interception.invalid')
      .intercept({ path: '/via-wrapper', method: 'GET' })
      .reply(200, { via: 'wrapper' });

    const res = await fetchWithRetry('https://mock-interception.invalid/via-wrapper');
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ via: 'wrapper' });
  });
});
