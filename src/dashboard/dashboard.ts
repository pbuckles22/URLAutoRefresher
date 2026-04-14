/**
 * Full-page dashboard (Epic 0 stub). Shared list UI arrives in later epics.
 */
import { loadExtensionPrefs, saveExtensionPrefs } from '../lib/prefs';

const title = document.querySelector<HTMLElement>('[data-app-title]');
if (title) {
  title.textContent = chrome.runtime.getManifest().name;
}

const overlayPref = document.querySelector<HTMLInputElement>('[data-pref-overlay]');
if (overlayPref) {
  void loadExtensionPrefs().then((p) => {
    overlayPref.checked = p.showPageOverlayTimer;
  });
  overlayPref.addEventListener('change', () => {
    void saveExtensionPrefs({ showPageOverlayTimer: overlayPref.checked });
  });
}
