import { PAGE_OVERLAY_GET_STATE, type PageOverlayStateResponse } from '../lib/messages';
import { getPageOverlayUiState } from '../lib/page-overlay-ui';
import { loadAppState } from '../lib/storage';
import { loadExtensionPrefs } from '../lib/prefs';

export function attachPageOverlayMessageHandler(): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type !== PAGE_OVERLAY_GET_STATE) {
      return;
    }
    const tabId = sender.tab?.id;
    if (tabId === undefined) {
      return;
    }

    void (async () => {
      let response: PageOverlayStateResponse;
      try {
        const [state, prefs] = await Promise.all([loadAppState(), loadExtensionPrefs()]);
        const ui = getPageOverlayUiState(state, prefs, tabId);
        if (!ui.show) {
          response = { ok: true, show: false };
        } else {
          response = { ok: true, show: true, nextFireAt: ui.nextFireAt };
        }
      } catch {
        response = { ok: true, show: false };
      }
      sendResponse(response);
    })();

    return true;
  });
}
