/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as prefs from '../lib/prefs';
import {
  bindOverlayPreference,
  createDashboardContext,
  wireCrossSurfaceLinks,
} from './dashboard-shell';

describe('createDashboardContext', () => {
  it('returns null refs when selectors miss', () => {
    document.body.innerHTML = '';
    const ctx = createDashboardContext();
    expect(ctx.dom.openSidePanel).toBeNull();
    expect(ctx.dom.openDashboardInTab).toBeNull();
    expect(ctx.dom.overlayPreference).toBeNull();
  });

  it('binds known data attributes when present', () => {
    document.body.innerHTML = `
      <button data-open-side-panel></button>
      <a data-open-in-tab></a>
      <input type="checkbox" data-pref-overlay />
    `;
    const ctx = createDashboardContext();
    expect(ctx.dom.openSidePanel).not.toBeNull();
    expect(ctx.dom.openDashboardInTab).not.toBeNull();
    expect(ctx.dom.overlayPreference).not.toBeNull();
  });
});

describe('bindOverlayPreference', () => {
  let loadSpy: ReturnType<typeof vi.spyOn>;
  let saveSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    loadSpy = vi.spyOn(prefs, 'loadExtensionPrefs').mockResolvedValue({
      showPageOverlayTimer: true,
    });
    saveSpy = vi.spyOn(prefs, 'saveExtensionPrefs').mockResolvedValue(undefined);
  });

  afterEach(() => {
    loadSpy.mockRestore();
    saveSpy.mockRestore();
  });

  it('no-ops when overlay input is absent', () => {
    bindOverlayPreference({
      dom: {
        openSidePanel: null,
        openDashboardInTab: null,
        overlayPreference: null,
      },
    });
    expect(loadSpy).not.toHaveBeenCalled();
  });

  it('hydrates checkbox and saves on change', async () => {
    document.body.innerHTML = '<input type="checkbox" data-pref-overlay />';
    const ctx = createDashboardContext();
    bindOverlayPreference(ctx);
    const input = ctx.dom.overlayPreference!;
    await vi.waitFor(() => {
      expect(input.checked).toBe(true);
    });
    input.checked = false;
    input.dispatchEvent(new Event('change'));
    expect(saveSpy).toHaveBeenCalledWith({ showPageOverlayTimer: false });
  });
});

describe('wireCrossSurfaceLinks', () => {
  beforeEach(() => {
    global.chrome = global.chrome ?? ({} as typeof chrome);
    global.chrome.runtime = {
      getURL: (p: string) => `chrome-extension://x/${p}`,
    } as typeof chrome.runtime;
    global.chrome.windows = {
      getCurrent: vi.fn().mockResolvedValue({ id: 7 }),
    } as unknown as typeof chrome.windows;
    global.chrome.sidePanel = {
      open: vi.fn().mockResolvedValue(undefined),
    } as unknown as typeof chrome.sidePanel;
    global.chrome.tabs = {
      create: vi.fn().mockResolvedValue({} as chrome.tabs.Tab),
    } as unknown as typeof chrome.tabs;
  });

  it('wires side panel and open-in-tab when elements exist', async () => {
    document.body.innerHTML = `
      <button type="button" data-open-side-panel>Open side</button>
      <button type="button" data-open-in-tab>Open tab</button>
    `;
    const ctx = createDashboardContext();
    wireCrossSurfaceLinks(ctx);
    ctx.dom.openSidePanel!.click();
    await vi.waitFor(() => {
      expect(chrome.sidePanel.open).toHaveBeenCalledWith({ windowId: 7 });
    });
    ctx.dom.openDashboardInTab!.click();
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'chrome-extension://x/dashboard/dashboard.html',
    });
  });
});
