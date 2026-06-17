/**
 * Epic 14: push proactive raid-guard armed state to Twitch content scripts.
 */
import {
  TWITCH_RAID_BLOCK_REPORT,
  TWITCH_RAID_GUARD_PUSH,
  TWITCH_RAID_GUARD_SYNC_REQUEST,
  type TwitchRaidBlockReportMessage,
  type TwitchRaidGuardSyncRequestMessage,
} from '../lib/messages';
import { noteRaidBlockEvent } from '../lib/raid-block-events';
import { getSchedHintForTab, rehydrateSchedHintsFromSession } from '../lib/sched-member-tab-hint';
import { isTwitchRaidGuardArmedForTab } from '../lib/twitch-raid-guard-armed';
import { loadAppState } from '../lib/storage';
import { isTwitchFavsGroupName } from '../lib/twitch-favs';
import { isTwitchChannelRootUrl } from '../lib/twitch-live-detect';
import { requestPageOverlaySync } from './twitch-open-tabs-sync';

async function resolveRaidGuardArmed(tabId: number, tabUrl: string): Promise<boolean> {
  await rehydrateSchedHintsFromSession();
  const url = tabUrl.trim();
  if (!url || !isTwitchChannelRootUrl(url)) {
    return false;
  }

  const hint = getSchedHintForTab(tabId);
  if (!hint) {
    return false;
  }

  const state = await loadAppState();
  const group = state.globalGroups.find((g) => g.id === hint.groupId);
  if (!group) {
    return false;
  }

  return isTwitchRaidGuardArmedForTab({
    tabUrl: url,
    hint,
    groupEnabled: group.enabled,
    isTwitchFavsGroup: isTwitchFavsGroupName(group.name),
  });
}

async function pushRaidGuardToTab(tabId: number, armed: boolean): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: TWITCH_RAID_GUARD_PUSH,
      armed,
    });
  } catch {
    /* tab may not have twitch-live-bridge yet */
  }
}

/** Recompute and push raid-guard armed state for one tab. */
export async function syncTwitchRaidGuardForTab(tabId: number, tabUrl?: string): Promise<void> {
  let url = tabUrl?.trim();
  if (!url) {
    try {
      url = (await chrome.tabs.get(tabId)).url?.trim();
    } catch {
      return;
    }
  }
  if (!url) {
    await pushRaidGuardToTab(tabId, false);
    return;
  }

  const armed = await resolveRaidGuardArmed(tabId, url);
  await pushRaidGuardToTab(tabId, armed);
}

/** Push armed=false when hint no longer matches (e.g. browse-away). */
export async function disarmTwitchRaidGuardForTab(tabId: number): Promise<void> {
  await pushRaidGuardToTab(tabId, false);
}

export async function syncTwitchRaidGuardForAllOpenTabs(): Promise<void> {
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
    await syncTwitchRaidGuardForTab(tab.id, tab.url);
  }
}

export async function applyTwitchRaidBlockReport(tabId: number, pageUrl: string): Promise<void> {
  await rehydrateSchedHintsFromSession();
  const hint = getSchedHintForTab(tabId);
  if (!hint) {
    return;
  }
  const url = pageUrl.trim();
  if (!url) {
    return;
  }
  await noteRaidBlockEvent(hint.memberKey, {
    atMs: Date.now(),
    tabId,
    pageUrl: url,
  });
  await requestPageOverlaySync(tabId);
}

export function attachTwitchRaidGuardListeners(): void {
  chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
    const syncReq = message as Partial<TwitchRaidGuardSyncRequestMessage>;
    if (syncReq?.type === TWITCH_RAID_GUARD_SYNC_REQUEST) {
      const tabId = sender.tab?.id;
      const pageUrl = sender.tab?.url;
      if (tabId === undefined) {
        sendResponse({ ok: false });
        return;
      }
      void syncTwitchRaidGuardForTab(tabId, pageUrl)
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }));
      return true;
    }

    const m = message as Partial<TwitchRaidBlockReportMessage>;
    if (m?.type !== TWITCH_RAID_BLOCK_REPORT) {
      return;
    }
    const tabId = sender.tab?.id;
    const pageUrl = sender.tab?.url;
    if (tabId === undefined || !pageUrl) {
      sendResponse({ ok: false });
      return;
    }
    void applyTwitchRaidBlockReport(tabId, pageUrl)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  });
}

/** @internal test helper */
export async function computeRaidGuardArmedForTest(
  tabId: number,
  tabUrl: string
): Promise<boolean> {
  return resolveRaidGuardArmed(tabId, tabUrl);
}
