/**
 * Epic 13.B1: dashboard shell — cross-surface navigation + overlay preference wiring.
 */

import { loadExtensionPrefs, saveExtensionPrefs } from '../lib/prefs';

/** DOM nodes owned by the shell slice (Epic 13.B); grows in later 13.B stories. */
export type DashboardDom = {
  openSidePanel: HTMLElement | null;
  openDashboardInTab: HTMLElement | null;
  overlayPreference: HTMLInputElement | null;
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
