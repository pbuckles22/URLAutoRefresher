#!/usr/bin/env node
/**
 * Installs local git alias `push` → git-push-wrapper (main → CI + push + GH watch).
 * Idempotent; safe to run from npm prepare. Skipped when not a git repo or HUSKY=0.
 */
import { execSync, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const wrapper = path.join(repoRoot, 'Scripts/git-push-wrapper.mjs').replace(/\\/g, '/');

function inGitRepo() {
  try {
    execSync('git rev-parse --git-dir', { cwd: repoRoot, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

if (process.env.HUSKY === '0' || !inGitRepo()) {
  process.exit(0);
}

const aliasValue = `!node "${wrapper}"`;
const set = spawnSync('git', ['config', '--local', 'alias.push', aliasValue], {
  cwd: repoRoot,
  stdio: 'inherit',
});
if (set.status !== 0) {
  console.warn('install-git-push-alias: could not set alias.push (push automation optional)');
  process.exit(0);
}

console.log('Git push automation: `git push` to main runs local CI, push, and GitHub CI watch.');
