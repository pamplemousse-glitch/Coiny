// Integration tests for POST /api/diagnostics (src/api/diagnostics.ts) via
// app.inject(). Real SQL via PGlite; nothing is mocked.

import { beforeEach, describe, expect, it } from 'vitest';
import { authHeader, resetDatabase, testUserId } from './db-helper.js';

const jsonHeaders = () => ({ ...authHeader(), 'content-type': 'application/json' });

/** A call stack shaped the way MetricKit serialises one. */
const callStack = () => ({
  callStacks: [
    {
      threadAttributed: true,
      callStackRootFrames: [
        {
          binaryName: 'Coiny',
          offsetIntoBinaryTextSegment: 123_456,
          address: 4_310_000_000,
          sampleCount: 1,
          binaryUUID: 'A1B2C3D4-5E6F-7890-ABCD-EF1234567890',
        },
      ],
    },
  ],
});

const diagnostic = (over: Record<string, unknown> = {}) => ({
  kind: 'crash',
  app_build: 321,
  os_major: 26,
  signature: 'a1b2c3d4e5f60718',
  call_stack: callStack(),
  ...over,
});

describe('POST /api/diagnostics', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('requires authentication', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/diagnostics',
      headers: { 'content-type': 'application/json' },
      payload: { diagnostics: [diagnostic()] },
    });
    expect(res.statusCode).toBe(401);
  });

  it('stores a crash and reports how many it accepted', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/diagnostics',
      headers: jsonHeaders(),
      payload: { diagnostics: [diagnostic()] },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ accepted: 1, rejected: [] });
  });

  it('files the crash against the SESSION, never an id in the payload', async () => {
    // BOLA rule #6. A device must not be able to attribute a crash to somebody
    // else's account, which would let it pollute another user's history.
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    await app.inject({
      method: 'POST',
      url: '/api/diagnostics',
      headers: jsonHeaders(),
      payload: { diagnostics: [diagnostic()] },
    });

    const { db } = await import('../src/db/client.js');
    const { crashDiagnostics } = await import('../src/db/schema.js');
    const rows = await db().select().from(crashDiagnostics);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.userId).toBe(testUserId);
  });

  it('preserves the call stack verbatim, because it is what gets symbolicated', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    await app.inject({
      method: 'POST',
      url: '/api/diagnostics',
      headers: jsonHeaders(),
      payload: { diagnostics: [diagnostic()] },
    });

    const { db } = await import('../src/db/client.js');
    const { crashDiagnostics } = await import('../src/db/schema.js');
    const [row] = await db().select().from(crashDiagnostics);
    expect(row?.callStack).toEqual(callStack());
  });

  // --- What must not get through -------------------------------------------

  it('rejects a free-form field the client is supposed to have dropped', async () => {
    // terminationReason, virtualMemoryRegionInfo and exceptionReason are
    // dropped on the device. This is the second line: a control that exists in
    // one place is one refactor from not existing, and the privacy manifest's
    // claim that the trace carries no user data depends on both.
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/diagnostics',
      headers: jsonHeaders(),
      payload: { diagnostics: [diagnostic({ termination_reason: 'Namespace SPRINGBOARD, Code 0x8badf00d' })] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects an unknown kind', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/diagnostics',
      headers: jsonHeaders(),
      payload: { diagnostics: [diagnostic({ kind: 'something_new' })] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects a signature that is not lowercase hex', async () => {
    // Otherwise `signature` is a free-form string column by another name.
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/diagnostics',
      headers: jsonHeaders(),
      payload: { diagnostics: [diagnostic({ signature: 'Crash in PetView.swift' })] },
    });
    expect(res.statusCode).toBe(400);
  });

  it('rejects a call stack past the size cap without failing the batch', async () => {
    // Bytes, not structure: Zod measures shape and shape is not what fills a
    // table with a 90-day retention.
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const huge = { blob: 'x'.repeat(300 * 1024) };
    const res = await app.inject({
      method: 'POST',
      url: '/api/diagnostics',
      headers: jsonHeaders(),
      payload: { diagnostics: [diagnostic(), diagnostic({ call_stack: huge })] },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.accepted).toBe(1);
    expect(body.rejected).toEqual([{ index: 1, reason: 'call_stack_too_large' }]);
  });

  it('rejects a batch larger than the cap', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    const res = await app.inject({
      method: 'POST',
      url: '/api/diagnostics',
      headers: jsonHeaders(),
      payload: { diagnostics: Array.from({ length: 11 }, () => diagnostic()) },
    });
    expect(res.statusCode).toBe(400);
  });

  // --- Grouping, which is the only question worth asking of this table ------

  it('groups repeats of one crash by signature rather than counting them separately', async () => {
    const { buildApp } = await import('../src/server.js');
    const app = await buildApp();
    await app.inject({
      method: 'POST',
      url: '/api/diagnostics',
      headers: jsonHeaders(),
      payload: { diagnostics: [diagnostic(), diagnostic(), diagnostic({ signature: 'ffffffffffffffff' })] },
    });

    const { crashGroups } = await import('../src/store/crash-diagnostics.js');
    const groups = await crashGroups(new Date(Date.now() - 60_000));

    expect(groups).toHaveLength(2);
    // Worst first: "one crash, three times" is a lead; three rows is a pile.
    expect(groups[0]?.occurrences).toBe(2);
    expect(groups[0]?.affectedUsers).toBe(1);
  });
});

describe('crash diagnostics retention', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('purges rows past the 90-day window', async () => {
    const { db } = await import('../src/db/client.js');
    const { crashDiagnostics } = await import('../src/db/schema.js');
    const { purgeCrashDiagnostics } = await import('../src/store/crash-diagnostics.js');

    const old = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
    await db().insert(crashDiagnostics).values({
      userId: testUserId,
      kind: 'crash',
      appBuild: 1,
      osMajor: 26,
      signature: 'aaaaaaaaaaaaaaaa',
      callStack: {},
      receivedAt: old,
    });
    await db().insert(crashDiagnostics).values({
      userId: testUserId,
      kind: 'crash',
      appBuild: 2,
      osMajor: 26,
      signature: 'bbbbbbbbbbbbbbbb',
      callStack: {},
    });

    const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    expect(await purgeCrashDiagnostics(cutoff)).toBe(1);
    expect(await db().select().from(crashDiagnostics)).toHaveLength(1);
  });
});
