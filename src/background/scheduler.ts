/**
 * Epic 2: chrome.alarms ↔ AppState, tabs.update on fire, nextFireAt, tab lifecycle.
 */

import { BADGE_TICK_ALARM, refreshActionBadge } from './badge';
import { dispatchSchedulerAlarm } from './scheduler-alarm-handlers';
import { syncAlarmsWithState } from './scheduler-sync-alarms';
import { parseAlarmName } from '../lib/alarm-names';
import { loadAppState, saveAppState, STORAGE_KEY } from '../lib/storage';
import { applyTabRemoved } from '../lib/tab-lifecycle';

export { syncAlarmsWithState };

const STORAGE_DEBOUNCE_MS = 150;

let storageDebounce: ReturnType<typeof setTimeout> | undefined;

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
  let state = await loadAppState();
  state = applyTabRemoved(state, tabId);
  await saveAppState(state);
  await syncAlarmsWithState(state);
  await refreshActionBadge();
}

export async function bootstrapScheduling(): Promise<void> {
  const state = await loadAppState();
  await syncAlarmsWithState(state);
  await refreshActionBadge();
}

export function attachSchedulingListeners(): void {
  chrome.alarms.onAlarm.addListener((a) => {
    void onAlarmFired(a);
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    void onTabRemoved(tabId);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !(STORAGE_KEY in changes)) {
      return;
    }
    clearTimeout(storageDebounce);
    storageDebounce = setTimeout(() => {
      void bootstrapScheduling();
    }, STORAGE_DEBOUNCE_MS);
  });
}
