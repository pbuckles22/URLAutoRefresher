/**
 * Epic 10.2 — resolve live browser tab id for a stored member URL before refresh.
 */

import {
  pickBestOpenTabForMemberTarget,
  pageMatchesExplicitTarget,
  type TabPickCandidate,
} from './member-url';

export function tabsToPickCandidates(tabs: chrome.tabs.Tab[]): TabPickCandidate[] {
  return tabs.map((t) => ({
    id: t.id,
    windowId: t.windowId,
    url: t.url,
    active: t.active,
    index: t.index,
  }));
}

async function getLastFocusedWindowId(): Promise<number | undefined> {
  try {
    const w = await chrome.windows.getLastFocused();
    return w.id;
  } catch {
    return undefined;
  }
}

/**
 * Find the tab that should receive `tabs.update` for this member `targetUrl`.
 * Uses the same pick rule as {@link pickBestOpenTabForMemberTarget}. If no pick matches,
 * returns `fallbackTabId` when that tab is still open and its URL matches the member URL.
 */
export async function resolveLiveTabIdForTargetUrl(
  memberTargetUrl: string,
  fallbackTabId: number
): Promise<number | undefined> {
  let tabs: chrome.tabs.Tab[];
  try {
    tabs = await chrome.tabs.query({});
  } catch {
    return undefined;
  }
  const candidates = tabsToPickCandidates(tabs);
  const lastFocusedWindowId = await getLastFocusedWindowId();
  const picked = pickBestOpenTabForMemberTarget(candidates, memberTargetUrl, {
    lastFocusedWindowId,
  });
  if (picked !== undefined) {
    return picked;
  }
  const fallback = candidates.find((c) => c.id === fallbackTabId);
  if (fallback?.url && pageMatchesExplicitTarget(fallback.url, memberTargetUrl)) {
    return fallbackTabId;
  }
  return undefined;
}
