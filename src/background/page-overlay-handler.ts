import {
  BLIP_REFRESH_REQUEST,
  GLOBAL_GROUP_TAB_PAUSE,
  PAGE_OVERLAY_GET_STATE,
  type GlobalGroupTabPauseMessage,
  type PageOverlayStateResponse,
} from '../lib/messages';
import { getBlipWatchForTab } from '../lib/blip-tab-state';
import { resolveGlobalGroupTargets } from '../lib/global-group-targets';
import { getPageOverlayVmForTab } from '../lib/page-overlay-state';
import { loadExtensionPrefs } from '../lib/prefs';
import { loadAppState, saveAppState } from '../lib/storage';
import { refreshActionBadge } from './badge';

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
  if (tabId === undefined) {
    return false;
  }
  const state = await loadAppState();
  const job = state.individualJobs.find(
    (j) =>
      j.enabled &&
      j.target.tabId === tabId &&
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

async function handleGlobalGroupTabPause(tabId: number, groupId: string, paused: boolean): Promise<boolean> {
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
  if (!resolved.some((t) => t.tabId === tabId)) {
    return false;
  }
  const set = new Set(g.pausedTabIds ?? []);
  if (paused) {
    set.add(tabId);
  } else {
    set.delete(tabId);
  }
  const pausedTabIds = [...set];
  const nextG = replaceAt(state.globalGroups, gIdx, {
    ...g,
    pausedTabIds: pausedTabIds.length > 0 ? pausedTabIds : undefined,
  });
  state = { ...state, globalGroups: nextG };
  await saveAppState(state);
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
        const vm = await getPageOverlayVmForTab(state, prefs, tabId);
        const blip = getBlipWatchForTab(state, tabId);
        if (!vm.show) {
          response = blip ? { ok: true, show: false, blip } : { ok: true, show: false };
        } else if (vm.mode === 'paused') {
          response = {
            ok: true,
            show: true,
            mode: 'paused',
            globalGroupId: vm.globalGroupId,
            ...(blip ? { blip } : {}),
          };
        } else {
          response = {
            ok: true,
            show: true,
            mode: 'timer',
            nextFireAt: vm.nextFireAt,
            ...(vm.globalGroupId !== undefined ? { globalGroupId: vm.globalGroupId } : {}),
            ...(blip ? { blip } : {}),
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
