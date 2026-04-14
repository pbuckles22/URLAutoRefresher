import { PAGE_OVERLAY_GET_STATE, type PageOverlayStateResponse } from '../lib/messages';
import { loadAppState } from '../lib/storage';
import { getNextFireAtForTab, tabHasActiveRefreshJob } from '../lib/page-overlay-schedule';
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
        if (!prefs.showPageOverlayTimer || !tabHasActiveRefreshJob(state, tabId)) {
          response = { ok: true, show: false };
        } else {
          response = {
            ok: true,
            show: true,
            nextFireAt: getNextFireAtForTab(state, tabId),
          };
        }
      } catch {
        response = { ok: true, show: false };
      }
      sendResponse(response);
    })();

    return true;
  });
}
