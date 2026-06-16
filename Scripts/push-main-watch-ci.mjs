#!/usr/bin/env node
/**
 * Push main: local npm run ci → push → block until GitHub Actions CI completes.
 * Used by npm run push:main and git push alias (Scripts/git-push-wrapper.mjs).
 */
import { execSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function gh(args) {
  return execSync(`gh ${args}`, { encoding: 'utf8', cwd: repoRoot }).trim();
}

function die(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

try {
  gh('--version');
} catch {
  die(
    'gh CLI not found. Install GitHub CLI and authenticate, or push with URLAR_SKIP_GH_WATCH=1 and check Actions manually.'
  );
}

const branch = execSync('git branch --show-current', { encoding: 'utf8', cwd: repoRoot }).trim();
if (branch !== 'main') {
  die(`Refusing to push: current branch is "${branch}", expected "main".`);
}

if (process.env.URLAR_SKIP_CI !== '1') {
  console.log('Running local CI before push…');
  const ci = spawnSync('npm', ['run', 'ci'], { stdio: 'inherit', shell: true, cwd: repoRoot });
  if (ci.status !== 0) {
    process.exit(ci.status ?? 1);
  }
}

console.log('Pushing origin main…');
const push = spawnSync('git', ['-c', 'alias.push=', 'push', '--no-verify', 'origin', 'main'], {
  stdio: 'inherit',
  cwd: repoRoot,
});
if (push.status !== 0) {
  process.exit(push.status ?? 1);
}

if (process.env.URLAR_SKIP_GH_WATCH === '1') {
  console.log('URLAR_SKIP_GH_WATCH=1 — skipping GitHub CI watch.');
  process.exit(0);
}

console.log('Waiting for GitHub Actions to register the run…');
await new Promise((r) => setTimeout(r, 6000));

let runId;
try {
  runId = gh('run list --branch main --limit 1 --json databaseId -q ".[0].databaseId"');
} catch {
  die('Could not list GitHub Actions runs. Check gh auth and remote.');
}
if (!runId) {
  die('No GitHub Actions run found for main after push.');
}

console.log(`Watching CI run ${runId} (gh run watch --exit-status)…`);
const watch = spawnSync('gh', ['run', 'watch', runId, '--exit-status'], {
  stdio: 'inherit',
  cwd: repoRoot,
});
process.exit(watch.status ?? 1);
