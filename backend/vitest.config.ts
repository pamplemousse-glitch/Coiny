import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    hookTimeout: 60000,
    // PGlite-backed tests routinely exceed the 5s default when the whole suite
    // runs in parallel; raised for the same reason hookTimeout was.
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['src/db/migrations/**'],
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 75,
        functions: 75,
        branches: 75,
      },
    },
  },
});
