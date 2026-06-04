/**
 * Reconcile open Twitch channel tabs with TwitchFavs (targets + sched hints).
 *
 * Re-injecting `page-overlay.js` must run only after install/update/reload — not on every
 * MV3 service-worker wake (re-inject resets module state while DOM hosts persist → attachShadow errors).
 */
import { PAGE_OVERLAY_SYNC_REQUEST } from '../lib/messages';
import { maybeRememberSchedTabFromFavHome } from '../lib/sched-member-tab-seed';
import { isTwitchChannelRootUrl } from '../lib/twitch-live-detect';
import {
  defaultTwitchFavsPersistDeps,
  persistTwitchFavsUpsertFromTabUrl,
} from './twitch-favs-sync';

const TWITCH_TAB_QUERY = ['*://*.twitch.tv/*', '*://twitch.tv/*'] as const;

export type SyncOpenTwitchFavsTabsOptions = {
  /** After extension install/update/reload — inject overlay only when the tab has no live listener. */
  reinjectOverlays?: boolean;
};

async function nudgeOverlayTab(tabId: number, reinjectOverlays: boolean): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, { type: PAGE_OVERLAY_SYNC_REQUEST });
    return;
  } catch {
    /* stale content script after extension reload */
  }
  if (!reinjectOverlays) {
    return;
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['dist/page-overlay.js'],
    });
  } catch {
    /* restricted or discarded tabs */
  }
}

export async function syncAllOpenTwitchFavsTabs(
  options: SyncOpenTwitchFavsTabsOptions = {}
): Promise<void> {
  const reinjectOverlays = options.reinjectOverlays === true;
  let tabs: chrome.tabs.Tab[];
  try {
    tabs = await chrome.tabs.query({ url: [...TWITCH_TAB_QUERY] });
  } catch {
    return;
  }

  for (const tab of tabs) {
    const tabId = tab.id;
    const tabUrl = tab.url?.trim();
    if (tabId === undefined || !tabUrl) {
      continue;
    }

    if (isTwitchChannelRootUrl(tabUrl)) {
      try {
        await persistTwitchFavsUpsertFromTabUrl(tabUrl, defaultTwitchFavsPersistDeps);
        await maybeRememberSchedTabFromFavHome(tabId, tabUrl);
      } catch {
        /* storage or tab APIs may fail transiently */
      }
    }

    await nudgeOverlayTab(tabId, reinjectOverlays);
  }
}
