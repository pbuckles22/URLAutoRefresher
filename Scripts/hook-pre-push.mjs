#!/usr/bin/env node
/**
 * pre-push: for origin main/master — npm run ci, then push + GitHub CI watch via push-main-watch-ci.
 * Cancels the outer git push (exit 1) after our script pushes with --no-verify to avoid double push.
 */
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAIN_REFS = new Set(['refs/heads/main', 'refs/heads/master']);

async function readPushRefs() {
  const lines = [];
  const rl = createInterface({ input: Readable.from(process.stdin), crlfDelay: Infinity });
  for await (const line of rl) {
    if (line.trim()) {
      lines.push(line.trim().split(/\s+/));
    }
  }
  return lines;
}

function targetsMainBranch(refs) {
  return refs.some((parts) => {
    const remoteRef = parts[2];
    return remoteRef && MAIN_REFS.has(remoteRef);
  });
}

if (process.env.URLAR_PUSH_IN_PROGRESS === '1') {
  process.exit(0);
}

const refs = await readPushRefs();
if (!targetsMainBranch(refs)) {
  process.exit(0);
}

if (process.env.URLAR_SKIP_CI !== '1') {
  console.log('pre-push: running npm run ci before push to main…');
  const ci = spawnSync('npm', ['run', 'ci'], { stdio: 'inherit', shell: true, cwd: repoRoot });
  if (ci.status !== 0) {
    process.exit(ci.status ?? 1);
  }
}

process.env.URLAR_PUSH_IN_PROGRESS = '1';
const ship = spawnSync(
  process.execPath,
  [path.join(repoRoot, 'Scripts/push-main-watch-ci.mjs'), '--skip-local-ci'],
  { stdio: 'inherit', cwd: repoRoot, env: { ...process.env, URLAR_PUSH_IN_PROGRESS: '1' } }
);
if (ship.status !== 0) {
  process.exit(ship.status ?? 1);
}

console.log(
  'pre-push: automated push + GitHub CI watch complete (hook cancels duplicate git push).'
);
process.exit(1);
