import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Epic 0 — extension shell: MV3 manifest, dashboard entry, side panel, host permissions.
 * Epic 3.0 — content script for page overlay on http(s) pages.
 */
describe('manifest.json', () => {
  const dir = dirname(fileURLToPath(import.meta.url));
  const manifest = JSON.parse(readFileSync(join(dir, '../manifest.json'), 'utf8')) as Record<
    string,
    unknown
  >;

  it('is Manifest V3 with service worker background', () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.background).toEqual(
      expect.objectContaining({ service_worker: 'dist/background.js' })
    );
  });

  it('declares storage, alarms, tabs, windows, sidePanel and broad http(s) hosts', () => {
    expect(manifest.permissions).toEqual(
      expect.arrayContaining(['storage', 'alarms', 'tabs', 'windows', 'sidePanel'])
    );
    expect(manifest.host_permissions).toContain('http://*/*');
    expect(manifest.host_permissions).toContain('https://*/*');
  });

  it('opens full-page dashboard from toolbar (options_ui)', () => {
    expect(manifest.options_ui).toEqual(
      expect.objectContaining({
        page: 'dashboard/dashboard.html',
        open_in_tab: true,
      })
    );
    expect(manifest.action).toEqual(
      expect.objectContaining({
        default_title: expect.stringMatching(/dashboard|open/i),
      })
    );
  });

  it('includes side panel default path (Epic 0.3)', () => {
    expect(manifest.side_panel).toEqual(
      expect.objectContaining({ default_path: 'sidepanel/sidepanel.html' })
    );
  });

  it('injects page overlay content script on http(s) at document_idle (Epic 3.0)', () => {
    const scripts = manifest.content_scripts as Array<Record<string, unknown>>;
    expect(Array.isArray(scripts)).toBe(true);
    const overlay = scripts.find(
      (e) => Array.isArray(e.js) && (e.js as string[]).includes('dist/page-overlay.js')
    );
    expect(overlay).toBeDefined();
    expect(overlay?.matches).toEqual(['http://*/*', 'https://*/*']);
    expect(overlay?.run_at).toBe('document_idle');
  });
});
