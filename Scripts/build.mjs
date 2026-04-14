/**
 * Bundle MV3 service worker and dashboard page scripts with esbuild.
 */
import * as esbuild from 'esbuild';
import { mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(root, 'dist');

mkdirSync(distDir, { recursive: true });

const common = {
  bundle: true,
  platform: 'browser',
  target: 'es2022',
  format: 'iife',
  logLevel: 'warning',
};

await esbuild.build({
  ...common,
  entryPoints: [join(root, 'src/background/index.ts')],
  outfile: join(distDir, 'background.js'),
});

await esbuild.build({
  ...common,
  entryPoints: [join(root, 'src/dashboard/dashboard.ts')],
  outfile: join(root, 'dashboard/dashboard.js'),
});

await esbuild.build({
  ...common,
  entryPoints: [join(root, 'src/content/page-overlay.ts')],
  outfile: join(distDir, 'page-overlay.js'),
});
