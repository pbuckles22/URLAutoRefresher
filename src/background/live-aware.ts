import { TWITCH_LIVE_REPORT, type TwitchLiveReportMessage } from '../lib/messages';
import { LIVE_AWARE_RESUME_SOON_MS } from '../lib/live-aware-constants';
import { loadAppState, saveAppState } from '../lib/storage';
import { isTwitchChannelRootUrl } from '../lib/twitch-live-detect';
import type { AppState } from '../lib/types';
import { refreshActionBadge } from './badge';
import { syncAlarmsWithState } from './scheduler';

function patchJobsForTwitchReport(state: AppState, tabId: number, live: boolean | null): AppState | null {
  const now = Date.now();
  const nextStream = live === null ? undefined : live;
  let changed = false;

  const individualJobs = state.individualJobs.map((j) => {
    if (j.target.tabId !== tabId || !j.liveAwareRefresh) {
      return j;
    }
    const prev = j.streamLive;
    if (prev === nextStream) {
      return j;
    }
    changed = true;
    let nextFireAt = j.nextFireAt;
    if (prev === true && nextStream !== true && j.enabled) {
      const cap = now + LIVE_AWARE_RESUME_SOON_MS;
      nextFireAt = nextFireAt === undefined ? cap : Math.min(nextFireAt, cap);
    }
    return { ...j, streamLive: nextStream, nextFireAt };
  });

  return changed ? { ...state, individualJobs } : null;
}

function patchJobsClearSignalWhenNotOnChannelRoot(state: AppState, tabId: number, tabUrl: string): AppState | null {
  const onRoot = isTwitchChannelRootUrl(tabUrl);
  if (onRoot) {
    return null;
  }
  let changed = false;
  const individualJobs = state.individualJobs.map((j) => {
    if (j.target.tabId !== tabId || !j.liveAwareRefresh) {
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

export async function applyTwitchLiveReport(tabId: number, live: boolean | null): Promise<void> {
  const state = await loadAppState();
  const next = patchJobsForTwitchReport(state, tabId, live);
  if (!next) {
    return;
  }
  await saveAppState(next);
  await syncAlarmsWithState(next);
  await refreshActionBadge();
}

export async function clearLiveAwareIfTabLeftChannelRoot(tabId: number, tabUrl: string | undefined): Promise<void> {
  if (tabUrl === undefined) {
    return;
  }
  const state = await loadAppState();
  const next = patchJobsClearSignalWhenNotOnChannelRoot(state, tabId, tabUrl);
  if (!next) {
    return;
  }
  await saveAppState(next);
  await syncAlarmsWithState(next);
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
