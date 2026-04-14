"use strict";
(() => {
  // src/lib/prefs.ts
  var PREFS_STORAGE_KEY = "urlAutoRefresher_prefs_v1";
  var DEFAULT_PREFS = {
    showPageOverlayTimer: true
  };
  function parsePrefs(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { ...DEFAULT_PREFS };
    }
    const o = raw;
    const show = typeof o.showPageOverlayTimer === "boolean" ? o.showPageOverlayTimer : DEFAULT_PREFS.showPageOverlayTimer;
    return { showPageOverlayTimer: show };
  }
  async function loadExtensionPrefs() {
    const data = await chrome.storage.local.get(PREFS_STORAGE_KEY);
    const raw = data[PREFS_STORAGE_KEY];
    return parsePrefs(raw);
  }
  async function saveExtensionPrefs(prefs) {
    await chrome.storage.local.set({ [PREFS_STORAGE_KEY]: prefs });
  }

  // src/dashboard/dashboard.ts
  var title = document.querySelector("[data-app-title]");
  if (title) {
    title.textContent = chrome.runtime.getManifest().name;
  }
  var overlayPref = document.querySelector("[data-pref-overlay]");
  if (overlayPref) {
    void loadExtensionPrefs().then((p) => {
      overlayPref.checked = p.showPageOverlayTimer;
    });
    overlayPref.addEventListener("change", () => {
      void saveExtensionPrefs({ showPageOverlayTimer: overlayPref.checked });
    });
  }
})();
