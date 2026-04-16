import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: path.join(root, 'e2e'),
  testMatch: '**/*.spec.ts',
  fullyParallel: false,
  workers: 1,
  /** Entire Playwright run (all files); prevents hung browser/process from running indefinitely. Keep under CI job cap. */
  globalTimeout: 8 * 60 * 1000,
  timeout: 60_000,
  expect: { timeout: 20_000 },
  reporter: [['list']],
  webServer: {
    command: 'node e2e/fixture-server.mjs',
    url: 'http://127.0.0.1:8765',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: {
    trace: 'on-first-retry',
  },
});
