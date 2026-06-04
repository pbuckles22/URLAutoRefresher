/**
 * Epic 10.6 — reconcile TwitchFavs explicit targets when a Twitch channel tab updates.
 */
import { applyTwitchFavsUpsertFromTabUrl } from '../lib/twitch-favs';
import { isTwitchChannelRootUrl } from '../lib/twitch-live-detect';
import { loadAppState, saveAppState } from '../lib/storage';
import type { AppState } from '../lib/types';
import { rescheduleIfMemberTabOpen } from './scheduler';

let twitchFavsDebounce: ReturnType<typeof setTimeout> | undefined;

/** Injected in tests; production uses `defaultTwitchFavsPersistDeps`. */
export type TwitchFavsPersistDeps = {
  loadAppState: () => Promise<AppState>;
  saveAppState: (state: AppState) => Promise<void>;
  rescheduleIfMemberTabOpen: (tabUrl: string) => Promise<void>;
};

export const defaultTwitchFavsPersistDeps: TwitchFavsPersistDeps = {
  loadAppState,
  saveAppState,
  rescheduleIfMemberTabOpen,
};

/**
 * Load → upsert from tab URL → save + reschedule when membership changed.
 * @returns whether storage was updated
 */
export async function persistTwitchFavsUpsertFromTabUrl(
  tabUrl: string,
  deps: TwitchFavsPersistDeps
): Promise<boolean> {
  const state = await deps.loadAppState();
  const { next, changed } = applyTwitchFavsUpsertFromTabUrl(state, tabUrl);
  if (changed) {
    await deps.saveAppState(next);
  }
  await deps.rescheduleIfMemberTabOpen(tabUrl);
  return changed;
}

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
          await persistTwitchFavsUpsertFromTabUrl(url, defaultTwitchFavsPersistDeps);
        } catch {
          /* storage or alarm APIs may fail transiently */
        }
      })();
    }, 300);
  });
}
