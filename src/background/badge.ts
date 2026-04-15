/**
 * Epic 6: focus-aware toolbar badge — nearest nextFireAt for tabs in the focused window,
 * with optional fallback to any job; sub-minute refresh via a dedicated chrome.alarm (no tight loops).
 */

import {
  badgeTextFromComputation,
  computeBadgeComputation,
  type BadgeComputation,
} from '../lib/focused-window-badge';
import { loadAppState } from '../lib/storage';

export const BADGE_TICK_ALARM = 'urlar:badge:tick' as const;

const BADGE_TICK_DELAY_MIN = 1 / 60;

async function collectTabIdsForWindow(windowId: number): Promise<Set<number>> {
  const tabs = await chrome.tabs.query({ windowId });
  const ids = new Set<number>();
  for (const t of tabs) {
    if (t.id !== undefined) {
      ids.add(t.id);
    }
  }
  return ids;
}

async function tabIdsForLastFocusedWindow(): Promise<Set<number>> {
  try {
    const w = await chrome.windows.getLastFocused();
    if (w.id === undefined || w.id === chrome.windows.WINDOW_ID_NONE) {
      return new Set();
    }
    return collectTabIdsForWindow(w.id);
  } catch {
    return new Set();
  }
}

async function syncBadgeTickAlarm(comp: BadgeComputation): Promise<void> {
  await chrome.alarms.clear(BADGE_TICK_ALARM);
  if (comp.kind === 'idle') {
    return;
  }
  await chrome.alarms.create(BADGE_TICK_ALARM, { delayInMinutes: BADGE_TICK_DELAY_MIN });
}

export async function refreshActionBadge(): Promise<void> {
  const state = await loadAppState();
  const now = Date.now();
  const tabIds = await tabIdsForLastFocusedWindow();
  const comp = computeBadgeComputation(state, now, tabIds, { fallbackWhenFocusedEmpty: true });
  const text = badgeTextFromComputation(comp);
  await chrome.action.setBadgeText({ text });
  await syncBadgeTickAlarm(comp);
}

export function attachBadgeListeners(): void {
  chrome.windows.onFocusChanged.addListener(() => {
    void refreshActionBadge();
  });
  chrome.tabs.onAttached.addListener(() => {
    void refreshActionBadge();
  });
  chrome.tabs.onDetached.addListener(() => {
    void refreshActionBadge();
  });
}
