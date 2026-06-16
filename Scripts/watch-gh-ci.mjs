#!/usr/bin/env node
/**
 * Watch the latest GitHub Actions CI run on main (after push already happened).
 */
import { execSync, spawnSync } from 'node:child_process';

function gh(args) {
  return execSync(`gh ${args}`, { encoding: 'utf8' }).trim();
}

try {
  gh('--version');
} catch {
  console.error('gh CLI not found. Install GitHub CLI or open the Actions tab on GitHub.');
  process.exit(1);
}

const runId = gh('run list --branch main --limit 1 --json databaseId -q ".[0].databaseId"');
if (!runId) {
  console.error('No GitHub Actions run found for main.');
  process.exit(1);
}

console.log(`Watching CI run ${runId}…`);
const watch = spawnSync('gh', ['run', 'watch', runId, '--exit-status'], { stdio: 'inherit' });
process.exit(watch.status ?? 1);
