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

export { syncAlarmsWithState };

const STORAGE_DEBOUNCE_MS = 150;
const MEMBER_TAB_RESCHEDULE_DEBOUNCE_MS = 300;

let storageDebounce: ReturnType<typeof setTimeout> | undefined;
let memberTabRescheduleDebounce: ReturnType<typeof setTimeout> | undefined;

/** Align memberNextFireAt when a schedulable member tab is open (seeds missing countdown keys). */
export async function rescheduleIfMemberTabOpen(tabUrl: string): Promise<void> {
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

  try {
    await dispatchSchedulerAlarm(parsed);
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

async function onMemberTabNavigation(tabId: number, tabUrl: string): Promise<void> {
  await rehydrateSchedHintsFromSession();
  const url = tabUrl.trim();
  const previousTabUrl = getLastTabUrl(tabId);

  if (isTwitchBrowseUrl(url)) {
    forgetSchedTabId(tabId);
    noteTabUrl(tabId, url);
    return;
  }

  await maybeSnapBackRaidDetour(tabId, url, previousTabUrl);
  noteTabUrl(tabId, url);
  await maybeRememberSchedTabFromFavHome(tabId, url);
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
      void onMemberTabNavigation(tabId, urlFromEvent).catch(() => {
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
      void bootstrapScheduling();
    }, STORAGE_DEBOUNCE_MS);
  });
}
