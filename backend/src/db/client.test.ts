import { afterEach, describe, expect, test, vi } from 'vitest';

// `config` is a module-level singleton parsed from process.env at import time,
// so each case sets the environment and re-imports rather than mutating config.
async function connectionStringFor(role: 'runtime' | 'migrator', env: Record<string, string>): Promise<string> {
  vi.resetModules();
  const previous = { ...process.env };
  Object.assign(process.env, env);
  try {
    const mod = await import('./client.js');
    return mod.connectionStringFor(role);
  } finally {
    process.env = previous;
  }
}

const RUNTIME = 'postgres://runtime:pw@host/db';
const MIGRATOR = 'postgres://migrator:pw@host/db';

afterEach(() => {
  vi.resetModules();
});

describe('connectionStringFor', () => {
  test('the migrator uses MIGRATION_DATABASE_URL when the roles are split', async () => {
    const url = await connectionStringFor('migrator', {
      DATABASE_URL: RUNTIME,
      MIGRATION_DATABASE_URL: MIGRATOR,
    });
    expect(url).toBe(MIGRATOR);
  });

  // The whole point of the split. A runtime process that picked up the migrator
  // credential would hold DDL rights for its entire life, which is the blast
  // radius the split exists to remove.
  test('the runtime never uses MIGRATION_DATABASE_URL, even when it is set', async () => {
    const url = await connectionStringFor('runtime', {
      DATABASE_URL: RUNTIME,
      MIGRATION_DATABASE_URL: MIGRATOR,
    });
    expect(url).toBe(RUNTIME);
  });

  test('the migrator falls back to DATABASE_URL in a single-role setup', async () => {
    const url = await connectionStringFor('migrator', {
      DATABASE_URL: RUNTIME,
      MIGRATION_DATABASE_URL: '',
    });
    expect(url).toBe(RUNTIME);
  });

  test('the runtime uses DATABASE_URL in a single-role setup', async () => {
    const url = await connectionStringFor('runtime', {
      DATABASE_URL: RUNTIME,
      MIGRATION_DATABASE_URL: '',
    });
    expect(url).toBe(RUNTIME);
  });
});
