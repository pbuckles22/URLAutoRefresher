#!/usr/bin/env node
/**
 * Local git alias.push target: main pushes → push-main-watch-ci (local CI + push + GH watch).
 * Other pushes delegate to real git push.
 */
import { spawnSync, execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);

function die(code) {
  process.exit(code ?? 1);
}

function realPush(extraArgs) {
  const r = spawnSync('git', ['-c', 'alias.push=', 'push', ...extraArgs], {
    stdio: 'inherit',
    cwd: repoRoot,
  });
  die(r.status ?? 1);
}

function currentBranch() {
  return execSync('git branch --show-current', { encoding: 'utf8', cwd: repoRoot }).trim();
}

/** True when this push updates origin main (from main or explicit ref). */
function isOriginMainPush(argv) {
  if (argv.includes('--no-verify') || argv.includes('-n')) {
    return false;
  }
  if (process.env.URLAR_INTERNAL_PUSH === '1') {
    return false;
  }

  const filtered = argv.filter((a) => !a.startsWith('-') || a === '-u');
  const positional = argv.filter((a) => !a.startsWith('-'));

  // git push origin main
  if (positional.includes('main') && (positional.includes('origin') || positional.length === 1)) {
    return positional.includes('main');
  }

  // git push origin HEAD:main or HEAD:refs/heads/main
  if (positional.some((p) => p.includes(':main') || p.includes(':refs/heads/main'))) {
    return true;
  }

  // git push (default upstream) while on main
  if (positional.length === 0 && currentBranch() === 'main') {
    return true;
  }

  // git push origin (while on main → pushes current branch)
  if (positional.length === 1 && positional[0] === 'origin' && currentBranch() === 'main') {
    return true;
  }

  return false;
}

if (isOriginMainPush(args)) {
  const r = spawnSync(
    process.execPath,
    [path.join(repoRoot, 'Scripts/push-main-watch-ci.mjs'), '--skip-local-ci'],
    { stdio: 'inherit', cwd: repoRoot }
  );
  die(r.status ?? 1);
}

realPush(args);
