import {
  TWITCH_LIVE_REPORT,
  TWITCH_LIVE_STATE_PUSH,
  type TwitchLiveReportMessage,
} from '../lib/messages';
import { LIVE_AWARE_RESUME_SOON_MS } from '../lib/live-aware-constants';
import {
  clearGlobalStreamLiveForTabUrl,
  isTwitchLiveWatchSessionActive,
  patchGlobalGroupsForTwitchLiveReport,
} from '../lib/global-live-aware';
import { pageMatchesExplicitTarget } from '../lib/member-url';
import { loadAppState, saveAppState } from '../lib/storage';
import { coalesceTwitchLiveSignal, isTwitchChannelRootUrl } from '../lib/twitch-live-detect';
import type { AppState } from '../lib/types';
import { refreshActionBadge } from './badge';
import { syncAlarmsWithState } from './scheduler';

async function pushTwitchLiveStateToTab(
  tabId: number,
  payload: { live: boolean | null; liveSessionActive: boolean }
): Promise<void> {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: TWITCH_LIVE_STATE_PUSH,
      live: payload.live,
      liveSessionActive: payload.liveSessionActive,
    });
  } catch {
    /* tab may not have content scripts yet */
  }
}

async function patchJobsForTwitchReport(
  state: AppState,
  tabId: number,
  live: boolean | null
): Promise<AppState | null> {
  let tabUrl: string | undefined;
  try {
    const t = await chrome.tabs.get(tabId);
    tabUrl = t.url;
  } catch {
    return null;
  }
  if (!tabUrl || (!tabUrl.startsWith('http://') && !tabUrl.startsWith('https://'))) {
    return null;
  }

  const nextStream = coalesceTwitchLiveSignal(live);
  const now = Date.now();
  let changed = false;

  const individualJobs = state.individualJobs.map((j) => {
    if (!j.liveAwareRefresh || !pageMatchesExplicitTarget(tabUrl!, j.target.targetUrl)) {
      return j;
    }
    const prev = j.streamLive;
    if (prev === nextStream) {
      return j;
    }
    changed = true;
    let nextFireAt = j.nextFireAt;
    if (prev === true && !nextStream && j.enabled) {
      const cap = now + LIVE_AWARE_RESUME_SOON_MS;
      nextFireAt = nextFireAt === undefined ? cap : Math.min(nextFireAt, cap);
    }
    return { ...j, streamLive: nextStream, nextFireAt };
  });

  return changed ? { ...state, individualJobs } : null;
}

function patchGlobalsForTwitchReport(
  state: AppState,
  tabUrl: string,
  live: boolean | null
): { next: AppState; changed: boolean; liveSessionActive: boolean } {
  return patchGlobalGroupsForTwitchLiveReport(state, tabUrl, live, Date.now());
}

function patchJobsClearSignalWhenNotOnChannelRoot(
  state: AppState,
  tabUrl: string
): AppState | null {
  const onRoot = isTwitchChannelRootUrl(tabUrl);
  if (onRoot) {
    return null;
  }
  let changed = false;
  const individualJobs = state.individualJobs.map((j) => {
    if (!j.liveAwareRefresh || !pageMatchesExplicitTarget(tabUrl, j.target.targetUrl)) {
      return j;
    }
    if (j.streamLive === undefined) {
      return j;
    }
    changed = true;
    return { ...j, streamLive: undefined };
  });
  return changed ? { ...state, individualJobs } : null;
}

function patchGlobalsClearSignalWhenNotOnChannelRoot(
  state: AppState,
  tabUrl: string
): AppState | null {
  return clearGlobalStreamLiveForTabUrl(state, tabUrl);
}

export async function applyTwitchLiveReport(tabId: number, live: boolean | null): Promise<void> {
  let tabUrl: string | undefined;
  try {
    tabUrl = (await chrome.tabs.get(tabId)).url;
  } catch {
    return;
  }
  if (!tabUrl) {
    return;
  }

  let state = await loadAppState();
  const jobPatch = await patchJobsForTwitchReport(state, tabId, live);
  const globalPatch = patchGlobalsForTwitchReport(state, tabUrl, live);
  if (!jobPatch && !globalPatch.changed) {
    return;
  }
  state = globalPatch.next;
  if (jobPatch) {
    state = { ...state, individualJobs: jobPatch.individualJobs };
  }
  await saveAppState(state);
  await syncAlarmsWithState(state);
  await refreshActionBadge();
  await pushTwitchLiveStateToTab(tabId, {
    live,
    liveSessionActive: isTwitchLiveWatchSessionActive(state, tabUrl, live),
  });
}

export async function clearLiveAwareIfTabLeftChannelRoot(
  tabId: number,
  tabUrl: string | undefined
): Promise<void> {
  if (tabUrl === undefined) {
    return;
  }
  const state = await loadAppState();
  const jobNext = patchJobsClearSignalWhenNotOnChannelRoot(state, tabUrl);
  const globalNext = patchGlobalsClearSignalWhenNotOnChannelRoot(state, tabUrl);
  if (!jobNext && !globalNext) {
    return;
  }
  const merged =
    jobNext && globalNext
      ? { ...globalNext, individualJobs: jobNext.individualJobs }
      : (jobNext ?? globalNext ?? state);
  await saveAppState(merged);
  await syncAlarmsWithState(merged);
  await refreshActionBadge();
}

export function attachLiveAwareListeners(): void {
  chrome.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
    const m = message as Partial<TwitchLiveReportMessage>;
    if (m?.type !== TWITCH_LIVE_REPORT) {
      return;
    }
    const tabId = sender.tab?.id;
    if (tabId === undefined) {
      return;
    }
    void applyTwitchLiveReport(tabId, m.live ?? null)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url === undefined && changeInfo.status !== 'complete') {
      return;
    }
    void clearLiveAwareIfTabLeftChannelRoot(tabId, tab.url);
  });
}
