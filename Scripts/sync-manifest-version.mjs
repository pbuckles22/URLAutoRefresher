/**
 * Copy package.json version into manifest.json (MV3 extension version).
 * Called from build.mjs; also runnable via npm run version:sync.
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

export function syncManifestVersion(root) {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  const manifestPath = join(root, 'manifest.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));

  if (manifest.version === pkg.version) {
    return false;
  }

  manifest.version = pkg.version;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return true;
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  syncManifestVersion(root);
}
