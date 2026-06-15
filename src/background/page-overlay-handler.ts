import {
  BLIP_REFRESH_REQUEST,
  GLOBAL_GROUP_TAB_PAUSE,
  INDIVIDUAL_JOB_OVERLAY_PAUSE,
  PAGE_OVERLAY_GET_STATE,
  TWITCH_LIVE_MANUAL_OVERRIDE,
  type GlobalGroupTabPauseMessage,
  type IndividualJobOverlayPauseMessage,
  type PageOverlayStateResponse,
  type TwitchLiveManualOverrideMessage,
} from '../lib/messages';
import { getBlipWatchForTab } from '../lib/blip-tab-state';
import { getPageOverlaySnapBackDebug } from '../lib/page-overlay-debug';
import { resolveGlobalGroupTargets } from '../lib/global-group-targets';
import { memberKeyFromTargetUrl, pageMatchesExplicitTarget } from '../lib/member-url';
import { getPageOverlayVmForTab } from '../lib/page-overlay-state';
import { applyStreamLiveUserToggle, isGlobalMemberLivePaused } from '../lib/global-live-aware';
import { computeNextDelayMs } from '../lib/schedule';
import { baseAndJitterMs } from './scheduler-align-state';
import { loadExtensionPrefs } from '../lib/prefs';
import { loadAppState, saveAppState } from '../lib/storage';
import { refreshActionBadge } from './badge';
import { getSchedHintForTab, rememberSchedTabId } from '../lib/sched-member-tab-hint';
import { observeMemberTabNavigation, syncAlarmsWithState } from './scheduler';

const blipRefreshHits = new Map<number, number[]>();

function replaceAt<T>(arr: T[], i: number, v: T): T[] {
  const next = [...arr];
  next[i] = v;
  return next;
}

function pruneBlipHits(ts: readonly number[], now: number): number[] {
  const cutoff = now - 60_000;
  return ts.filter((t) => t > cutoff);
}

async function handleBlipRefreshRequest(sender: chrome.runtime.MessageSender): Promise<boolean> {
  const tabId = sender.tab?.id;
  const tabUrl = sender.tab?.url;
  if (tabId === undefined || !tabUrl) {
    return false;
  }
  const state = await loadAppState();
  const job = state.individualJobs.find(
    (j) =>
      j.enabled &&
      pageMatchesExplicitTarget(tabUrl, j.target.targetUrl) &&
      ((j.blipWatchPhrases?.length ?? 0) > 0 || !!(j.blipWatchRegex && j.blipWatchRegex.trim()))
  );
  if (!job) {
    return false;
  }
  const max =
    job.blipMaxPerMinute !== undefined && Number.isInteger(job.blipMaxPerMinute)
      ? Math.min(30, Math.max(1, job.blipMaxPerMinute))
      : 8;
  const now = Date.now();
  const arr = pruneBlipHits(blipRefreshHits.get(tabId) ?? [], now);
  if (arr.length >= max) {
    return false;
  }
  arr.push(now);
  blipRefreshHits.set(tabId, arr);
  try {
    await chrome.tabs.update(tabId, { url: job.target.targetUrl });
  } catch {
    return false;
  }
  await refreshActionBadge();
  return true;
}

async function handleIndividualJobOverlayPause(
  tabId: number,
  jobId: string,
  paused: boolean
): Promise<boolean> {
  let tabUrl: string | undefined;
  try {
    const t = await chrome.tabs.get(tabId);
    tabUrl = t.url;
  } catch {
    return false;
  }
  let state = await loadAppState();
  const idx = state.individualJobs.findIndex((j) => j.id === jobId);
  if (idx < 0) {
    return false;
  }
  const j = state.individualJobs[idx];
  if (!j.enabled || !tabUrl || !pageMatchesExplicitTarget(tabUrl, j.target.targetUrl)) {
    return false;
  }
  let nextJ = { ...j, overlayPaused: paused };
  if (paused) {
    nextJ = { ...nextJ, nextFireAt: undefined };
  } else if (j.liveAwareRefresh && (j.streamLiveOverride === true || j.streamLive === true)) {
    const { baseMs, jitterMs } = baseAndJitterMs(j);
    nextJ = {
      ...nextJ,
      streamLive: false,
      nextFireAt: Date.now() + computeNextDelayMs(baseMs, jitterMs),
    };
    delete nextJ.streamLiveOverride;
  }
  state = { ...state, individualJobs: replaceAt(state.individualJobs, idx, nextJ) };
  await saveAppState(state);
  await syncAlarmsWithState(state);
  await refreshActionBadge();
  return true;
}

async function handleGlobalGroupTabPause(
  tabId: number,
  groupId: string,
  paused: boolean
): Promise<boolean> {
  let state = await loadAppState();
  const gIdx = state.globalGroups.findIndex((g) => g.id === groupId);
  if (gIdx < 0) {
    return false;
  }
  const g = state.globalGroups[gIdx];
  if (!g.enabled) {
    return false;
  }
  const resolved = await resolveGlobalGroupTargets(g);
  const hit = resolved.find((t) => t.tabId === tabId);
  if (!hit) {
    return false;
  }
  const mk = memberKeyFromTargetUrl(hit.targetUrl);
  if (!mk) {
    return false;
  }
  const set = new Set(g.pausedMemberKeys ?? []);
  if (paused) {
    set.add(mk);
  } else {
    set.delete(mk);
  }
  const pausedMemberKeys = [...set].sort();
  let nextG: typeof g = {
    ...g,
    pausedMemberKeys: pausedMemberKeys.length > 0 ? pausedMemberKeys : undefined,
  };
  if (!paused && isGlobalMemberLivePaused(g, mk)) {
    const { baseMs, jitterMs } = baseAndJitterMs(g);
    nextG = applyStreamLiveUserToggle(
      nextG,
      mk,
      false,
      Date.now(),
      computeNextDelayMs(baseMs, jitterMs)
    );
  }
  state = { ...state, globalGroups: replaceAt(state.globalGroups, gIdx, nextG) };
  await saveAppState(state);
  await syncAlarmsWithState(state);
  await refreshActionBadge();
  return true;
}

async function handleTwitchLiveManualOverride(
  tabId: number,
  message: TwitchLiveManualOverrideMessage
): Promise<boolean> {
  const { groupId, jobId, on } = message;
  if (typeof on !== 'boolean') {
    return false;
  }
  let state = await loadAppState();
  const now = Date.now();

  if (groupId) {
    const gIdx = state.globalGroups.findIndex((g) => g.id === groupId);
    if (gIdx < 0) {
      return false;
    }
    const g = state.globalGroups[gIdx];
    const resolved = await resolveGlobalGroupTargets(g);
    const hit = resolved.find((t) => t.tabId === tabId);
    if (!hit) {
      return false;
    }
    const mk = memberKeyFromTargetUrl(hit.targetUrl);
    if (!mk) {
      return false;
    }
    const { baseMs, jitterMs } = baseAndJitterMs(g);
    const nextG = applyStreamLiveUserToggle(g, mk, on, now, computeNextDelayMs(baseMs, jitterMs));
    state = { ...state, globalGroups: replaceAt(state.globalGroups, gIdx, nextG) };
  } else if (jobId) {
    const idx = state.individualJobs.findIndex((j) => j.id === jobId);
    if (idx < 0) {
      return false;
    }
    const j = state.individualJobs[idx];
    let tabUrl: string | undefined;
    try {
      tabUrl = (await chrome.tabs.get(tabId)).url;
    } catch {
      return false;
    }
    if (!tabUrl || !pageMatchesExplicitTarget(tabUrl, j.target.targetUrl)) {
      return false;
    }
    let nextJ = { ...j };
    if (on) {
      nextJ = { ...nextJ, streamLiveOverride: true };
    } else {
      const { baseMs, jitterMs } = baseAndJitterMs(j);
      nextJ = {
        ...nextJ,
        streamLive: false,
        nextFireAt: now + computeNextDelayMs(baseMs, jitterMs),
      };
      delete nextJ.streamLiveOverride;
    }
    state = { ...state, individualJobs: replaceAt(state.individualJobs, idx, nextJ) };
  } else {
    return false;
  }

  await saveAppState(state);
  await syncAlarmsWithState(state);
  await refreshActionBadge();
  return true;
}

export function attachPageOverlayMessageHandler(): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === BLIP_REFRESH_REQUEST) {
      void handleBlipRefreshRequest(sender)
        .then((ok) => sendResponse({ ok }))
        .catch(() => sendResponse({ ok: false }));
      return true;
    }

    if (message?.type === GLOBAL_GROUP_TAB_PAUSE) {
      const tabId = sender.tab?.id;
      const { groupId, paused } = message as GlobalGroupTabPauseMessage;
      if (tabId === undefined || typeof groupId !== 'string' || typeof paused !== 'boolean') {
        sendResponse({ ok: false });
        return true;
      }
      void handleGlobalGroupTabPause(tabId, groupId, paused)
        .then((ok) => sendResponse({ ok }))
        .catch(() => sendResponse({ ok: false }));
      return true;
    }

    if (message?.type === INDIVIDUAL_JOB_OVERLAY_PAUSE) {
      const tabId = sender.tab?.id;
      const { jobId, paused } = message as IndividualJobOverlayPauseMessage;
      if (tabId === undefined || typeof jobId !== 'string' || typeof paused !== 'boolean') {
        sendResponse({ ok: false });
        return true;
      }
      void handleIndividualJobOverlayPause(tabId, jobId, paused)
        .then((ok) => sendResponse({ ok }))
        .catch(() => sendResponse({ ok: false }));
      return true;
    }

    if (message?.type === TWITCH_LIVE_MANUAL_OVERRIDE) {
      const tabId = sender.tab?.id;
      if (tabId === undefined) {
        sendResponse({ ok: false });
        return true;
      }
      void handleTwitchLiveManualOverride(tabId, message as TwitchLiveManualOverrideMessage)
        .then((ok) => sendResponse({ ok }))
        .catch(() => sendResponse({ ok: false }));
      return true;
    }

    if (message?.type !== PAGE_OVERLAY_GET_STATE) {
      return;
    }
    const tabId = sender.tab?.id;
    if (tabId === undefined) {
      return;
    }
    let tabUrl = sender.tab?.url;

    void (async () => {
      if (!tabUrl) {
        try {
          tabUrl = (await chrome.tabs.get(tabId)).url;
        } catch {
          tabUrl = undefined;
        }
      }
      if (tabUrl) {
        try {
          await observeMemberTabNavigation(tabId, tabUrl);
        } catch {
          /* transient tab or storage errors during nav observation */
        }
      }
      let response: PageOverlayStateResponse;
      try {
        const [state, prefs] = await Promise.all([loadAppState(), loadExtensionPrefs()]);
        const vm = await getPageOverlayVmForTab(state, prefs, tabId, tabUrl);
        const blip = getBlipWatchForTab(state, tabUrl);
        let debug: Awaited<ReturnType<typeof getPageOverlaySnapBackDebug>>;
        if (prefs.showOverlaySnapBackDebug && tabUrl) {
          try {
            debug = await getPageOverlaySnapBackDebug(state, tabId, tabUrl);
          } catch {
            debug = undefined;
          }
        }
        if (
          debug?.schedulerTabId !== undefined &&
          debug.memberKey &&
          vm.show &&
          'globalGroupId' in vm &&
          vm.globalGroupId
        ) {
          // Do not let a tab sitting on a *different* fav channel (raid/detour) re-bind its
          // home hint to that channel — that poisons snap-back. Only confirm/refresh the
          // binding when this tab has no home yet or is still on its established home.
          const existingHint = getSchedHintForTab(debug.schedulerTabId);
          const wouldChangeHome =
            existingHint !== undefined && existingHint.memberKey !== debug.memberKey;
          if (!wouldChangeHome) {
            rememberSchedTabId(
              vm.globalGroupId,
              debug.memberKey,
              debug.schedulerTabId,
              debug.refreshTargetUrl
            );
          }
        }
        if (!vm.show) {
          response = blip ? { ok: true, show: false, blip } : { ok: true, show: false };
        } else if (vm.mode === 'paused') {
          const livePaused = vm.livePaused === true ? { livePaused: true as const } : {};
          response =
            'individualJobId' in vm
              ? {
                  ok: true,
                  show: true,
                  mode: 'paused',
                  individualJobId: vm.individualJobId,
                  ...livePaused,
                  ...(blip ? { blip } : {}),
                  ...(debug ? { debug } : {}),
                }
              : {
                  ok: true,
                  show: true,
                  mode: 'paused',
                  globalGroupId: vm.globalGroupId,
                  ...livePaused,
                  ...(blip ? { blip } : {}),
                  ...(debug ? { debug } : {}),
                };
        } else {
          response = {
            ok: true,
            show: true,
            mode: 'timer',
            nextFireAt: vm.nextFireAt,
            ...(vm.globalGroupId !== undefined ? { globalGroupId: vm.globalGroupId } : {}),
            ...(vm.individualJobId !== undefined ? { individualJobId: vm.individualJobId } : {}),
            ...(blip ? { blip } : {}),
            ...(debug ? { debug } : {}),
          };
        }
      } catch {
        response = { ok: false };
      }
      sendResponse(response);
    })();

    return true;
  });
}
