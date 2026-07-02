/**
 * Backlog #12: push channel-points bonus auto-click armed state to Twitch content scripts.
 */
import {
  TWITCH_CHANNEL_POINTS_BONUS_PUSH,
  TWITCH_CHANNEL_POINTS_BONUS_SYNC_REQUEST,
  type TwitchChannelPointsBonusSyncRequestMessage,
} from '../lib/messages';
import { getSchedHintForTab, rehydrateSchedHintsFromSession } from '../lib/sched-member-tab-hint';
import { isTwitchChannelPointsBonusArmedForTab } from '../lib/twitch-channel-points-bonus-armed';
import { loadExtensionPrefs, PREFS_STORAGE_KEY } from '../lib/prefs';
import { loadAppState } from '../lib/storage';
import { isTwitchFavsGroupName } from '../lib/twitch-favs';
import { isTwitchChannelRootUrl } from '../lib/twitch-live-detect';

async function resolveChannelPointsBonusArmed(tabId: number, tabUrl: string): Promise<boolean> {
  await rehydrateSchedHintsFromSession();
  const url = tabUrl.trim();
  if (!url || !isTwitchChannelRootUrl(url)) {
    return false;
  }

  const hint = getSchedHintForTab(tabId);
  if (!hint) {
    return false;
  }

  const [state, prefs] = await Promise.all([loadAppState(), loadExtensionPrefs()]);
  const group = state.globalGroups.find((g) => g.id === hint.groupId);
  if (!group) {
    return false;
  }

  return isTwitchChannelPointsBonusArmedForTab({
    tabUrl: url,
    hint,
    groupEnabled: group.enabled,
    isTwitchFavsGroup: isTwitchFavsGroupName(group.name),
    channelPointsBonusEnabled: prefs.twitchChannelPointsBonusEnabled,
  });
}

async function pushChannelPointsBonusToTab(tabId: number, armed: boolean): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: TWITCH_CHANNEL_POINTS_BONUS_PUSH,
      armed,
    });
  } catch {
    /* tab may not have twitch-live-bridge yet */
  }
}

/** Recompute and push armed state for one tab. */
export async function syncTwitchChannelPointsBonusForTab(
  tabId: number,
  tabUrl?: string
): Promise<void> {
  let url = tabUrl?.trim();
  if (!url) {
    try {
      url = (await chrome.tabs.get(tabId)).url?.trim();
    } catch {
      return;
    }
  }
  if (!url) {
    await pushChannelPointsBonusToTab(tabId, false);
    return;
  }

  const armed = await resolveChannelPointsBonusArmed(tabId, url);
  await pushChannelPointsBonusToTab(tabId, armed);
}

export async function disarmTwitchChannelPointsBonusForTab(tabId: number): Promise<void> {
  await pushChannelPointsBonusToTab(tabId, false);
}

export async function syncTwitchChannelPointsBonusForAllOpenTabs(): Promise<void> {
  let tabs: chrome.tabs.Tab[] = [];
  try {
    tabs = await chrome.tabs.query({});
  } catch {
    return;
  }
  await rehydrateSchedHintsFromSession();
  for (const tab of tabs) {
    if (tab.id === undefined || !tab.url) {
      continue;
    }
    if (!tab.url.includes('twitch.tv')) {
      continue;
    }
    await syncTwitchChannelPointsBonusForTab(tab.id, tab.url);
  }
}

export function attachTwitchChannelPointsBonusListeners(): void {
  chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
    const syncReq = message as Partial<TwitchChannelPointsBonusSyncRequestMessage>;
    if (syncReq?.type === TWITCH_CHANNEL_POINTS_BONUS_SYNC_REQUEST) {
      const tabId = sender.tab?.id;
      const pageUrl = sender.tab?.url;
      if (tabId === undefined) {
        sendResponse({ ok: false });
        return;
      }
      void syncTwitchChannelPointsBonusForTab(tabId, pageUrl)
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }));
      return true;
    }
    return undefined;
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !(PREFS_STORAGE_KEY in changes)) {
      return;
    }
    void syncTwitchChannelPointsBonusForAllOpenTabs();
  });
}

/** @internal test helper */
export async function computeChannelPointsBonusArmedForTest(
  tabId: number,
  tabUrl: string
): Promise<boolean> {
  return resolveChannelPointsBonusArmed(tabId, tabUrl);
}
