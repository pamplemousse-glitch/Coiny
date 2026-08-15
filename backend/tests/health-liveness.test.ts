import { describe, expect, it, vi } from 'vitest';

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
describe('/health liveness versus /health/scheduler readiness', () => {
  it('stays 200 while the tick is stale, and 503s only on the readiness route', async () => {
    const sched = await import('../src/scheduler/index.js');
    sched.startScheduler({ info: () => {}, warn: () => {} });

    // Exactly the state a resumed machine wakes in: past the window, no tick yet.
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.now() + sched.TICK_STALE_MS + 60_000));
    expect(sched.getSchedulerStatus().enabled).toBe(true);
    expect(sched.isSchedulerStale()).toBe(true);

    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();

    const live = await app.inject({ method: 'GET', url: '/health' });
    expect(live.statusCode).toBe(200);
    expect(live.json().ok).toBe(true);

    const ready = await app.inject({ method: 'GET', url: '/health/scheduler' });
    expect(ready.statusCode).toBe(503);
    expect(ready.json().ok).toBe(false);

    await app.close();
    vi.useRealTimers();
    sched.stopScheduler();
  });
});
