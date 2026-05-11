/**
 * Epic 10.6 — reconcile TwitchFavs explicit targets when a Twitch channel tab updates.
 */
import { applyTwitchFavsUpsertFromTabUrl } from '../lib/twitch-favs';
import { isTwitchChannelRootUrl } from '../lib/twitch-live-detect';
import { loadAppState, saveAppState } from '../lib/storage';
import { bootstrapScheduling } from './scheduler';

let twitchFavsDebounce: ReturnType<typeof setTimeout> | undefined;

export function attachTwitchFavsTabListener(): void {
  chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
    const url = changeInfo.url ?? tab.url;
    if (!url || !isTwitchChannelRootUrl(url)) {
      return;
    }

    clearTimeout(twitchFavsDebounce);
    twitchFavsDebounce = setTimeout(() => {
      void (async () => {
        try {
          const state = await loadAppState();
          const { next, changed } = applyTwitchFavsUpsertFromTabUrl(state, url);
          if (!changed) {
            return;
          }
          await saveAppState(next);
          await bootstrapScheduling();
        } catch {
          /* storage or alarm APIs may fail transiently */
        }
      })();
    }, 300);
  });
}
