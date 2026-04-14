import { defineConfig } from 'vitest/config';

/**
 * Default `npm run test:coverage` instruments all of `src/**` (Tier 1–testable + runtime sources),
 * so the headline % mixes high `src/lib` coverage with 0% for background/content/dashboard.
 *
 * Use `npm run test:coverage:lib` for a summary scoped to `src/lib` only (~90%+), or open
 * `coverage/index.html` after any run and drill into folders.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reportsDirectory: './coverage',
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts'],
    },
  },
});
