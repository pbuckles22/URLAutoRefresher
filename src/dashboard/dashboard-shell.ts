/**
 * Epic 13.B — dashboard shell: cross-surface navigation, overlay preference, shared `DashboardDom`
 * queries (grows by story — e.g. 13.B1 links + overlay, 13.B2 individual list + add-job nodes).
 */

import { loadExtensionPrefs, saveExtensionPrefs } from '../lib/prefs';

/** DOM nodes owned by the shell slice (Epic 13.B); grows in later 13.B stories. */
export type DashboardDom = {
  openSidePanel: HTMLElement | null;
  openDashboardInTab: HTMLElement | null;
  overlayPreference: HTMLInputElement | null;
  overlaySnapBackDebugPreference: HTMLInputElement | null;
  twitchWatchLayoutPreference: HTMLInputElement | null;
  twitchChannelPointsBonusPreference: HTMLInputElement | null;
  /** Epic 13.B2 — individual jobs list + add-job form */
  individualSectionHeading: HTMLElement | null;
  jobsList: HTMLUListElement | null;
  addJobForm: HTMLFormElement | null;
  addJobError: HTMLElement | null;
  tabSelect: HTMLSelectElement | null;
  urlInput: HTMLInputElement | null;
  intervalInput: HTMLInputElement | null;
  jitterInput: HTMLInputElement | null;
  liveAwareInput: HTMLInputElement | null;
  blipPhrasesAdd: HTMLTextAreaElement | null;
  blipRegexAdd: HTMLInputElement | null;
  /** Epic 13.B3 — individual add-job tab search + refresh */
  jobTabSearch: HTMLInputElement | null;
  jobTabRefresh: HTMLButtonElement | null;
  /** Epic 13.B4 — global groups list, form, tab browser */
  globalSectionHeading: HTMLElement | null;
  globalGroupsList: HTMLUListElement | null;
  globalGroupForm: HTMLFormElement | null;
  globalGroupName: HTMLInputElement | null;
  globalTabBrowser: HTMLUListElement | null;
  globalRefreshTabs: HTMLButtonElement | null;
  globalTabSearch: HTMLInputElement | null;
  globalIntervalInput: HTMLInputElement | null;
  globalJitterInput: HTMLInputElement | null;
  globalUrlPatterns: HTMLTextAreaElement | null;
  globalTwitchFavsHint: HTMLElement | null;
  globalFormError: HTMLElement | null;
  /** Epic 11.5 — precision volume */
  precisionVolumeSection: HTMLElement | null;
  precisionVolumeTabSelect: HTMLSelectElement | null;
  precisionVolumeTabSearch: HTMLInputElement | null;
  precisionVolumeTabRefresh: HTMLButtonElement | null;
  precisionVolumeFader: HTMLInputElement | null;
  precisionVolumeNumeric: HTMLInputElement | null;
  precisionVolumePhaseLabel: HTMLElement | null;
  precisionVolumeApplyHint: HTMLElement | null;
};

/** Single object passed into shell binders so later extractions avoid implicit `document` scope. */
export type DashboardContext = {
  dom: DashboardDom;
};

export function createDashboardContext(): DashboardContext {
  return {
    dom: {
      openSidePanel: document.querySelector<HTMLElement>('[data-open-side-panel]'),
      openDashboardInTab: document.querySelector<HTMLElement>('[data-open-in-tab]'),
      overlayPreference: document.querySelector<HTMLInputElement>('[data-pref-overlay]'),
      overlaySnapBackDebugPreference: document.querySelector<HTMLInputElement>(
        '[data-pref-overlay-debug]'
      ),
      twitchWatchLayoutPreference: document.querySelector<HTMLInputElement>(
        '[data-pref-twitch-watch-layout]'
      ),
      twitchChannelPointsBonusPreference: document.querySelector<HTMLInputElement>(
        '[data-pref-twitch-channel-points-bonus]'
      ),
      individualSectionHeading: document.querySelector<HTMLElement>(
        '[data-individual-section-heading]'
      ),
      jobsList: document.querySelector<HTMLUListElement>('[data-individual-jobs-list]'),
      addJobForm: document.querySelector<HTMLFormElement>('[data-add-individual-form]'),
      addJobError: document.querySelector<HTMLElement>('[data-add-job-error]'),
      tabSelect: document.querySelector<HTMLSelectElement>('[data-job-tab]'),
      urlInput: document.querySelector<HTMLInputElement>('[data-job-target-url]'),
      intervalInput: document.querySelector<HTMLInputElement>('[data-job-interval]'),
      jitterInput: document.querySelector<HTMLInputElement>('[data-job-jitter]'),
      liveAwareInput: document.querySelector<HTMLInputElement>('[data-job-live-aware]'),
      blipPhrasesAdd: document.querySelector<HTMLTextAreaElement>('[data-job-blip-phrases]'),
      blipRegexAdd: document.querySelector<HTMLInputElement>('[data-job-blip-regex]'),
      jobTabSearch: document.querySelector<HTMLInputElement>('[data-job-tab-search]'),
      jobTabRefresh: document.querySelector<HTMLButtonElement>('[data-job-tab-refresh]'),
      globalSectionHeading: document.querySelector<HTMLElement>('[data-global-section-heading]'),
      globalGroupsList: document.querySelector<HTMLUListElement>('[data-global-groups-list]'),
      globalGroupForm: document.querySelector<HTMLFormElement>('[data-global-group-form]'),
      globalGroupName: document.querySelector<HTMLInputElement>('[data-global-group-name]'),
      globalTabBrowser: document.querySelector<HTMLUListElement>('[data-global-tab-browser]'),
      globalRefreshTabs: document.querySelector<HTMLButtonElement>('[data-global-refresh-tabs]'),
      globalTabSearch: document.querySelector<HTMLInputElement>('[data-global-tab-search]'),
      globalIntervalInput: document.querySelector<HTMLInputElement>('[data-global-interval]'),
      globalJitterInput: document.querySelector<HTMLInputElement>('[data-global-jitter]'),
      globalUrlPatterns: document.querySelector<HTMLTextAreaElement>('[data-global-url-patterns]'),
      globalTwitchFavsHint: document.querySelector<HTMLElement>('[data-global-twitch-favs-hint]'),
      globalFormError: document.querySelector<HTMLElement>('[data-global-form-error]'),
      precisionVolumeSection: document.querySelector<HTMLElement>(
        '[data-precision-volume-section]'
      ),
      precisionVolumeTabSelect: document.querySelector<HTMLSelectElement>(
        '[data-precision-volume-tab]'
      ),
      precisionVolumeTabSearch: document.querySelector<HTMLInputElement>(
        '[data-precision-volume-tab-search]'
      ),
      precisionVolumeTabRefresh: document.querySelector<HTMLButtonElement>(
        '[data-precision-volume-tab-refresh]'
      ),
      precisionVolumeFader: document.querySelector<HTMLInputElement>(
        '[data-precision-volume-fader]'
      ),
      precisionVolumeNumeric: document.querySelector<HTMLInputElement>(
        '[data-precision-volume-numeric]'
      ),
      precisionVolumePhaseLabel: document.querySelector<HTMLElement>(
        '[data-precision-volume-phase-label]'
      ),
      precisionVolumeApplyHint: document.querySelector<HTMLElement>(
        '[data-precision-volume-apply-hint]'
      ),
    },
  };
}

export function bindExtensionPreferences(ctx: DashboardContext): void {
  const overlayPref = ctx.dom.overlayPreference;
  const debugPref = ctx.dom.overlaySnapBackDebugPreference;
  const watchLayoutPref = ctx.dom.twitchWatchLayoutPreference;
  const channelPointsBonusPref = ctx.dom.twitchChannelPointsBonusPreference;
  if (!overlayPref && !debugPref && !watchLayoutPref && !channelPointsBonusPref) {
    return;
  }
  void loadExtensionPrefs().then((p) => {
    if (overlayPref) {
      overlayPref.checked = p.showPageOverlayTimer;
    }
    if (debugPref) {
      debugPref.checked = p.showOverlaySnapBackDebug;
    }
    if (watchLayoutPref) {
      watchLayoutPref.checked = p.twitchWatchLayoutEnabled;
    }
    if (channelPointsBonusPref) {
      channelPointsBonusPref.checked = p.twitchChannelPointsBonusEnabled;
    }
  });
  overlayPref?.addEventListener('change', () => {
    void saveExtensionPrefs({ showPageOverlayTimer: overlayPref.checked });
  });
  debugPref?.addEventListener('change', () => {
    void saveExtensionPrefs({ showOverlaySnapBackDebug: debugPref.checked });
  });
  watchLayoutPref?.addEventListener('change', () => {
    void saveExtensionPrefs({ twitchWatchLayoutEnabled: watchLayoutPref.checked });
  });
  channelPointsBonusPref?.addEventListener('change', () => {
    void saveExtensionPrefs({ twitchChannelPointsBonusEnabled: channelPointsBonusPref.checked });
  });
}

export function wireCrossSurfaceLinks(ctx: DashboardContext): void {
  const { openSidePanel, openDashboardInTab } = ctx.dom;
  if (openSidePanel) {
    openSidePanel.addEventListener('click', () => {
      void chrome.windows.getCurrent().then((w) => {
        if (w.id !== undefined) {
          void chrome.sidePanel.open({ windowId: w.id });
        }
      });
    });
  }
  if (openDashboardInTab) {
    openDashboardInTab.addEventListener('click', () => {
      void chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
    });
  }
}
