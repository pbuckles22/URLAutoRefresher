/**
 * Runs Tier 2 E2E with headless Chromium (extensions work with bundled channel — see Playwright docs).
 * Use when a real display is unavailable (agents, SSH) so headed mode does not hang.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const r = spawnSync('npx', ['playwright', 'test'], {
  stdio: 'inherit',
  shell: true,
  cwd: root,
  env: { ...process.env, PLAYWRIGHT_HEADLESS: '1' },
});
process.exit(r.status ?? 1);
