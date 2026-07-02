/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as prefs from '../lib/prefs';
import type { DashboardDom } from './dashboard-shell';
import {
  bindExtensionPreferences,
  createDashboardContext,
  wireCrossSurfaceLinks,
} from './dashboard-shell';

function emptyShellDom(over: Partial<DashboardDom> = {}): DashboardDom {
  return {
    openSidePanel: null,
    openDashboardInTab: null,
    overlayPreference: null,
    overlaySnapBackDebugPreference: null,
    twitchWatchLayoutPreference: null,
    twitchChannelPointsBonusPreference: null,
    jobsList: null,
    addJobForm: null,
    addJobError: null,
    tabSelect: null,
    urlInput: null,
    intervalInput: null,
    jitterInput: null,
    liveAwareInput: null,
    blipPhrasesAdd: null,
    blipRegexAdd: null,
    jobTabSearch: null,
    jobTabRefresh: null,
    globalSectionHeading: null,
    globalGroupsList: null,
    globalGroupForm: null,
    globalGroupName: null,
    globalTabBrowser: null,
    globalRefreshTabs: null,
    globalTabSearch: null,
    globalIntervalInput: null,
    globalJitterInput: null,
    globalUrlPatterns: null,
    globalTwitchFavsHint: null,
    globalFormError: null,
    precisionVolumeSection: null,
    precisionVolumeTabSelect: null,
    precisionVolumeTabSearch: null,
    precisionVolumeTabRefresh: null,
    precisionVolumeFader: null,
    precisionVolumeNumeric: null,
    precisionVolumePhaseLabel: null,
    ...over,
  };
}

describe('createDashboardContext', () => {
  it('returns null refs when selectors miss', () => {
    document.body.innerHTML = '';
    const ctx = createDashboardContext();
    expect(ctx.dom.openSidePanel).toBeNull();
    expect(ctx.dom.openDashboardInTab).toBeNull();
    expect(ctx.dom.overlayPreference).toBeNull();
    expect(ctx.dom.jobsList).toBeNull();
    expect(ctx.dom.addJobForm).toBeNull();
  });

  it('binds known data attributes when present', () => {
    document.body.innerHTML = `
      <button data-open-side-panel></button>
      <a data-open-in-tab></a>
      <input type="checkbox" data-pref-overlay />
      <h2 data-individual-section-heading></h2>
      <ul data-individual-jobs-list></ul>
      <form data-add-individual-form></form>
      <input type="search" data-job-tab-search />
      <button type="button" data-job-tab-refresh></button>
      <h2 data-global-section-heading></h2>
      <ul data-global-groups-list></ul>
      <form data-global-group-form></form>
      <input data-global-group-name />
      <ul data-global-tab-browser></ul>
      <button type="button" data-global-refresh-tabs></button>
      <input data-global-tab-search />
      <input data-global-interval />
      <input data-global-jitter />
      <textarea data-global-url-patterns></textarea>
      <p data-global-twitch-favs-hint></p>
      <p data-global-form-error></p>
    `;
    const ctx = createDashboardContext();
    expect(ctx.dom.openSidePanel).not.toBeNull();
    expect(ctx.dom.openDashboardInTab).not.toBeNull();
    expect(ctx.dom.overlayPreference).not.toBeNull();
    expect(ctx.dom.individualSectionHeading).not.toBeNull();
    expect(ctx.dom.jobsList).not.toBeNull();
    expect(ctx.dom.addJobForm).not.toBeNull();
    expect(ctx.dom.jobTabSearch).not.toBeNull();
    expect(ctx.dom.jobTabRefresh).not.toBeNull();
    expect(ctx.dom.globalSectionHeading).not.toBeNull();
    expect(ctx.dom.globalGroupsList).not.toBeNull();
    expect(ctx.dom.globalGroupForm).not.toBeNull();
    expect(ctx.dom.globalGroupName).not.toBeNull();
    expect(ctx.dom.globalTabBrowser).not.toBeNull();
    expect(ctx.dom.globalRefreshTabs).not.toBeNull();
    expect(ctx.dom.globalTabSearch).not.toBeNull();
    expect(ctx.dom.globalIntervalInput).not.toBeNull();
    expect(ctx.dom.globalJitterInput).not.toBeNull();
    expect(ctx.dom.globalUrlPatterns).not.toBeNull();
    expect(ctx.dom.globalTwitchFavsHint).not.toBeNull();
    expect(ctx.dom.globalFormError).not.toBeNull();
  });
});

describe('bindExtensionPreferences', () => {
  let loadSpy: ReturnType<typeof vi.spyOn>;
  let saveSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    loadSpy = vi.spyOn(prefs, 'loadExtensionPrefs').mockResolvedValue({
      showPageOverlayTimer: true,
      showOverlaySnapBackDebug: true,
      twitchWatchLayoutEnabled: true,
      precisionVolume: { lastTabId: null, lastLinearGain: 1 },
    });
    saveSpy = vi.spyOn(prefs, 'saveExtensionPrefs').mockResolvedValue(undefined);
  });

  afterEach(() => {
    loadSpy.mockRestore();
    saveSpy.mockRestore();
  });

  it('no-ops when overlay input is absent', () => {
    bindExtensionPreferences({
      dom: emptyShellDom(),
    });
    expect(loadSpy).not.toHaveBeenCalled();
  });

  it('hydrates checkbox and saves on change', async () => {
    document.body.innerHTML = '<input type="checkbox" data-pref-overlay />';
    const ctx = createDashboardContext();
    bindExtensionPreferences(ctx);
    const input = ctx.dom.overlayPreference!;
    await vi.waitFor(() => {
      expect(input.checked).toBe(true);
    });
    input.checked = false;
    input.dispatchEvent(new Event('change'));
    expect(saveSpy).toHaveBeenCalledWith({ showPageOverlayTimer: false });
  });

  it('hydrates Twitch watch layout checkbox and saves on change', async () => {
    document.body.innerHTML = '<input type="checkbox" data-pref-twitch-watch-layout />';
    const ctx = createDashboardContext();
    bindExtensionPreferences(ctx);
    const input = ctx.dom.twitchWatchLayoutPreference!;
    await vi.waitFor(() => {
      expect(input.checked).toBe(true);
    });
    input.checked = false;
    input.dispatchEvent(new Event('change'));
    expect(saveSpy).toHaveBeenCalledWith({ twitchWatchLayoutEnabled: false });
  });

  it('hydrates channel points bonus checkbox and saves on change', async () => {
    document.body.innerHTML = '<input type="checkbox" data-pref-twitch-channel-points-bonus />';
    const ctx = createDashboardContext();
    bindExtensionPreferences(ctx);
    const input = ctx.dom.twitchChannelPointsBonusPreference!;
    await vi.waitFor(() => {
      expect(input.checked).toBe(false);
    });
    input.checked = true;
    input.dispatchEvent(new Event('change'));
    expect(saveSpy).toHaveBeenCalledWith({ twitchChannelPointsBonusEnabled: true });
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
