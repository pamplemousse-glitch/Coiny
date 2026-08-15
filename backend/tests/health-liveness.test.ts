import { describe, expect, it, vi } from 'vitest';
import { resetDatabase } from './db-helper.js';

// Regression cover for the /health liveness split.
//
// /health used to return 503 whenever the scheduler tick was older than
// TICK_STALE_MS, which took the entire API offline for a condition that says
// nothing about whether the process can serve requests. On this deployment that
// was guaranteed rather than rare: fly.toml runs `auto_stop_machines = 'suspend'`
// with `min_machines_running = 0`, suspend preserves process memory, and
// setInterval does not fire while suspended, so any machine idle past the
// staleness window resumed already stale and served 503 to Fly's own check
// until the next tick fired. Observed live on staging as 503, 503, 200.
//
// The staleness is mocked rather than produced by starting a real scheduler and
// advancing the clock. That approach looks more faithful and is not: moving the
// clock past the interval makes the real timer fire during buildApp, which sets
// lastTickAt to the faked present and reports the scheduler fresh again. What
// this route owes is a contract, so the contract is what gets asserted.
vi.mock('../src/scheduler/index.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/scheduler/index.js')>();
  return {
    ...original,
    startScheduler: () => {},
    getSchedulerStatus: () => ({
      enabled: true,
      startedAt: new Date('2026-08-15T00:00:00Z'),
      lastTickAt: new Date('2026-08-15T00:05:00Z'),
    }),
    isSchedulerStale: () => true,
  };
});

describe('/health liveness versus /health/scheduler readiness', () => {
  it('stays 200 while the tick is stale, and 503s only on the readiness route', async () => {
    await resetDatabase();
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const live = await app.inject({ method: 'GET', url: '/health' });
    expect(live.statusCode).toBe(200);
    expect(live.json().ok).toBe(true);
    // The heartbeat is still reported, it just does not gate the status code.
    expect(live.json().last_tick_at).toBe('2026-08-15T00:05:00.000Z');

    const ready = await app.inject({ method: 'GET', url: '/health/scheduler' });
    expect(ready.statusCode).toBe(503);
    expect(ready.json().ok).toBe(false);

    await app.close();
  });
});
