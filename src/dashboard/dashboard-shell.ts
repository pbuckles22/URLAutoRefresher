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
    },
  };
}

export function bindOverlayPreference(ctx: DashboardContext): void {
  const overlayPref = ctx.dom.overlayPreference;
  if (!overlayPref) {
    return;
  }
  void loadExtensionPrefs().then((p) => {
    overlayPref.checked = p.showPageOverlayTimer;
  });
  overlayPref.addEventListener('change', () => {
    void saveExtensionPrefs({ showPageOverlayTimer: overlayPref.checked });
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
