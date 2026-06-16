#!/usr/bin/env node
/**
 * pre-push hook: local npm run ci before pushes to origin main/master.
 * Skipped when URLAR_SKIP_CI=1 or push uses --no-verify (inner push from push-main-watch-ci).
 */
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { Readable } from 'node:stream';

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

if (process.env.URLAR_SKIP_CI === '1') {
  process.exit(0);
}

const refs = await readPushRefs();
if (!targetsMainBranch(refs)) {
  process.exit(0);
}

console.log('pre-push: running npm run ci before push to main…');
const ci = spawnSync('npm', ['run', 'ci'], { stdio: 'inherit', shell: true });
process.exit(ci.status ?? 1);
