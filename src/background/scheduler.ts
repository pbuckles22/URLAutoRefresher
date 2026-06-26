/**
 * Epic 2: chrome.alarms ↔ AppState, tabs.update on fire, nextFireAt, tab lifecycle.
 */

import { BADGE_TICK_ALARM, refreshActionBadge } from './badge';
import { dispatchSchedulerAlarm } from './scheduler-alarm-handlers';
import { syncAlarmsWithState } from './scheduler-sync-alarms';
import { parseAlarmName } from '../lib/alarm-names';
import { PREFS_STORAGE_KEY } from '../lib/prefs';
import { clearSchedulerDebugCache } from '../lib/scheduler-debug';
import { shouldBootstrapSchedulingForTabUrl } from '../lib/scheduling-tab-url';
import { loadAppState, saveAppState, STORAGE_KEY } from '../lib/storage';
import { applyTabRemoved } from '../lib/tab-lifecycle';
import { maybeRememberSchedTabFromFavHome } from '../lib/sched-member-tab-seed';
import { forgetSchedTabId, rehydrateSchedHintsFromSession } from '../lib/sched-member-tab-hint';
import { forgetLastTabUrl, getLastTabUrl, noteTabUrl } from '../lib/sched-tab-nav-context';
import { isTwitchBrowseUrl } from '../lib/twitch-live-detect';
import { maybeSnapBackRaidDetour } from './scheduler-snap-back-detour';
import {
  syncTwitchRaidGuardForTab,
  disarmTwitchRaidGuardForTab,
  syncTwitchRaidGuardForAllOpenTabs,
} from './twitch-raid-guard';

export { syncAlarmsWithState };

const STORAGE_DEBOUNCE_MS = 150;
const MEMBER_TAB_RESCHEDULE_DEBOUNCE_MS = 300;

let storageDebounce: ReturnType<typeof setTimeout> | undefined;
let memberTabRescheduleDebounce: ReturnType<typeof setTimeout> | undefined;

/**
 * Alarm handler serialization: prevents concurrent onAlarm handlers from
 * racing on loadAppState/saveAppState/syncAlarmsWithState when multiple alarms
 * fire at once (e.g. SW wakes with a pile of pending alarms after screen switch).
 *
 * Without this, all N handlers read the same stale state, each saves only its
 * own member's nextFireAt (overwriting the others), and syncAlarmsWithState
 * recreates alarms with past timestamps → SOON_MS (250 ms) retry → multi-refresh storm.
 */
let alarmHandlerChain: Promise<void> = Promise.resolve();
let activeAlarmHandlerCount = 0;

/** True while at least one alarm handler dispatch is in-flight. */
export function isAlarmHandlerActive(): boolean {
  return activeAlarmHandlerCount > 0;
}

/** Align memberNextFireAt when a schedulable member tab is open (seeds missing countdown keys). */
export async function rescheduleIfMemberTabOpen(tabUrl: string): Promise<void> {
  // Skip if alarm handlers are in-flight: they haven't all saved their nextFireAt yet,
  // so bootstrapScheduling would read partial state and reschedule unprocessed members
  // to SOON_MS (250 ms), restarting the refresh storm.
  if (isAlarmHandlerActive()) {
    return;
  }
  const state = await loadAppState();
  if (!shouldBootstrapSchedulingForTabUrl(state, tabUrl)) {
    return;
  }
  await bootstrapScheduling();
}

export function debouncedRescheduleIfMemberTabOpen(tabUrl: string): void {
  clearTimeout(memberTabRescheduleDebounce);
  memberTabRescheduleDebounce = setTimeout(() => {
    void rescheduleIfMemberTabOpen(tabUrl).catch(() => {
      /* storage or alarm APIs may fail transiently */
    });
  }, MEMBER_TAB_RESCHEDULE_DEBOUNCE_MS);
}

async function onAlarmFired(alarm: chrome.alarms.Alarm): Promise<void> {
  if (alarm.name === BADGE_TICK_ALARM) {
    await refreshActionBadge();
    return;
  }

  const parsed = parseAlarmName(alarm.name);
  if (!parsed) {
    return;
  }

  // Serialize: queue this handler behind any already-running alarm handler.
  // Prevents concurrent reads/writes to AppState and interleaved clearOurAlarms
  // + alarm recreation calls when multiple alarms fire simultaneously.
  const mySlot = alarmHandlerChain.then(async () => {
    activeAlarmHandlerCount++;
    try {
      await dispatchSchedulerAlarm(parsed);
    } finally {
      activeAlarmHandlerCount--;
    }
  });
  // Advance the chain; swallow errors so a failed handler doesn't block the queue.
  alarmHandlerChain = mySlot.catch(() => {});

  try {
    await mySlot;
  } catch {
    // dispatchSchedulerAlarm error: already logged inside; don't propagate.
  } finally {
    await refreshActionBadge();
  }
}

export async function onTabRemoved(tabId: number): Promise<void> {
  forgetSchedTabId(tabId);
  forgetLastTabUrl(tabId);
  let state = await loadAppState();
  state = applyTabRemoved(state, tabId);
  await saveAppState(state);
  await syncAlarmsWithState(state);
  await refreshActionBadge();
}

export async function bootstrapScheduling(): Promise<void> {
  await rehydrateSchedHintsFromSession();
  const state = await loadAppState();
  await syncAlarmsWithState(state);
  await refreshActionBadge();
}

export async function observeMemberTabNavigation(tabId: number, tabUrl: string): Promise<void> {
  await rehydrateSchedHintsFromSession();
  const url = tabUrl.trim();
  const previousTabUrl = getLastTabUrl(tabId);
  if (!url || previousTabUrl === url) {
    return;
  }

  if (isTwitchBrowseUrl(url)) {
    forgetSchedTabId(tabId);
    noteTabUrl(tabId, url);
    void disarmTwitchRaidGuardForTab(tabId);
    return;
  }

  const snappedBack = await maybeSnapBackRaidDetour(tabId, url, previousTabUrl);
  if (snappedBack) {
    // Do not stamp the detour as last URL; wait for the redirected home navigation event.
    void disarmTwitchRaidGuardForTab(tabId);
    return;
  }
  noteTabUrl(tabId, url);
  await maybeRememberSchedTabFromFavHome(tabId, url);
  void syncTwitchRaidGuardForTab(tabId, url);
}

export function attachSchedulingListeners(): void {
  chrome.alarms.onAlarm.addListener((a) => {
    void onAlarmFired(a);
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    void onTabRemoved(tabId);
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    const urlFromEvent = changeInfo.url ?? (changeInfo.status === 'complete' ? tab.url : undefined);
    if (urlFromEvent) {
      void observeMemberTabNavigation(tabId, urlFromEvent).catch(() => {
        /* transient tab API errors */
      });
    }
    const url = changeInfo.url ?? tab.url;
    if (url) {
      debouncedRescheduleIfMemberTabOpen(url);
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && PREFS_STORAGE_KEY in changes) {
      clearSchedulerDebugCache();
    }
    if (area !== 'local' || !(STORAGE_KEY in changes)) {
      return;
    }
    clearTimeout(storageDebounce);
    storageDebounce = setTimeout(() => {
      // Skip bootstrapScheduling if alarm handlers are still in-flight: they will
      // call syncAlarmsWithState themselves and reading state now would see an
      // incomplete picture, recreating alarms with near-zero delays.
      if (isAlarmHandlerActive()) {
        return;
      }
      void bootstrapScheduling().then(() => syncTwitchRaidGuardForAllOpenTabs());
    }, STORAGE_DEBOUNCE_MS);
  });
}
