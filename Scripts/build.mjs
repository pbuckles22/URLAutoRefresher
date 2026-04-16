/**
 * Bundle MV3 service worker and dashboard page scripts with esbuild.
 */
import * as esbuild from 'esbuild';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
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

const dashboardHtmlPath = join(root, 'dashboard/dashboard.html');
const sidepanelHtml = readFileSync(dashboardHtmlPath, 'utf8')
  .replace('class="dashboard-surface"', 'class="sidepanel-surface"')
  .replace('<script src="dashboard.js"></script>', '<script src="../dashboard/dashboard.js"></script>');
const sidepanelDir = join(root, 'sidepanel');
mkdirSync(sidepanelDir, { recursive: true });
writeFileSync(join(sidepanelDir, 'sidepanel.html'), sidepanelHtml);

await esbuild.build({
  ...common,
  entryPoints: [join(root, 'src/content/page-overlay.ts')],
  outfile: join(distDir, 'page-overlay.js'),
});

await esbuild.build({
  ...common,
  entryPoints: [join(root, 'src/content/twitch-live-bridge.ts')],
  outfile: join(distDir, 'twitch-live-bridge.js'),
});
