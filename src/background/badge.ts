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

async function collectSchedulableTabUrlsForWindow(windowId: number): Promise<Set<string>> {
  const tabs = await chrome.tabs.query({ windowId });
  const urls = new Set<string>();
  for (const t of tabs) {
    const u = t.url;
    if (
      typeof u === 'string' &&
      (u.startsWith('http://') || u.startsWith('https://'))
    ) {
      urls.add(u);
    }
  }
  return urls;
}

async function tabUrlsForLastFocusedWindow(): Promise<Set<string>> {
  try {
    const w = await chrome.windows.getLastFocused();
    if (w.id === undefined || w.id === chrome.windows.WINDOW_ID_NONE) {
      return new Set();
    }
    return collectSchedulableTabUrlsForWindow(w.id);
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
  const tabUrls = await tabUrlsForLastFocusedWindow();
  const comp = await computeBadgeComputation(state, now, tabUrls, { fallbackWhenFocusedEmpty: true });
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
  chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url === undefined) {
      return;
    }
    void (async () => {
      try {
        const [tab, last] = await Promise.all([chrome.tabs.get(tabId), chrome.windows.getLastFocused()]);
        if (
          tab.windowId !== undefined &&
          last.id !== undefined &&
          last.id !== chrome.windows.WINDOW_ID_NONE &&
          tab.windowId === last.id
        ) {
          await refreshActionBadge();
        }
      } catch {
        /* ignore */
      }
    })();
  });
}
