/**
 * Snap-back testing fields for the page overlay (tab id vs scheduler pick).
 */
import { memberKeyFromTargetUrl, pageMatchesExplicitTarget } from './member-url';
import { resolveLiveTabIdForTargetUrl } from './resolve-live-tab';
import { findTwitchFavsMemberForPageUrl } from './twitch-favs-member-match';
import type { AppState } from './types';

export type PageOverlaySnapBackDebug = {
  /** Chrome tab id for the page showing the overlay. */
  thisTabId: number;
  /** Current document URL (may differ from refresh target after detours). */
  pageUrl: string;
  /** Stored snap-back / refresh URL for this job or member. */
  refreshTargetUrl: string;
  /** Tab id the scheduler would refresh on the next alarm (live pick). */
  schedulerTabId: number | undefined;
  /** True when this tab is the scheduler’s chosen live tab. */
  schedulerUsesThisTab: boolean;
  /** True when the page URL still matches the refresh target. */
  pageMatchesTarget: boolean;
  /** Global member key when applicable. */
  memberKey?: string;
  /** All open tab ids whose URL matches the refresh target (sorted). */
  matchingOpenTabIds: number[];
};

export type OverlayDebugDeps = {
  resolveLiveTabId: typeof resolveLiveTabIdForTargetUrl;
  queryTabs: () => Promise<chrome.tabs.Tab[]>;
};

export const defaultOverlayDebugDeps: OverlayDebugDeps = {
  resolveLiveTabId: resolveLiveTabIdForTargetUrl,
  queryTabs: () => chrome.tabs.query({}),
};

async function listMatchingTabIds(
  targetUrl: string,
  queryTabs: () => Promise<chrome.tabs.Tab[]>
): Promise<number[]> {
  let tabs: chrome.tabs.Tab[];
  try {
    tabs = await queryTabs();
  } catch {
    return [];
  }
  return tabs
    .filter((t) => t.id !== undefined && t.url && pageMatchesExplicitTarget(t.url, targetUrl))
    .map((t) => t.id!)
    .sort((a, b) => a - b);
}

async function buildDebugForTarget(
  tabId: number,
  tabUrl: string,
  targetUrl: string,
  memberKey: string | undefined,
  deps: OverlayDebugDeps
): Promise<PageOverlaySnapBackDebug> {
  const refreshTargetUrl = targetUrl.trim();
  const schedulerTabId = await deps.resolveLiveTabId(refreshTargetUrl, tabId);
  const matchingOpenTabIds = await listMatchingTabIds(refreshTargetUrl, deps.queryTabs);
  return {
    thisTabId: tabId,
    pageUrl: tabUrl,
    refreshTargetUrl,
    schedulerTabId,
    schedulerUsesThisTab: schedulerTabId === tabId,
    pageMatchesTarget: pageMatchesExplicitTarget(tabUrl, refreshTargetUrl),
    ...(memberKey !== undefined ? { memberKey } : {}),
    matchingOpenTabIds,
  };
}

/** Debug pack for the active refresh job on this tab, if any. */
export async function getPageOverlaySnapBackDebug(
  state: AppState,
  tabId: number,
  tabUrl: string | undefined,
  deps: OverlayDebugDeps = defaultOverlayDebugDeps
): Promise<PageOverlaySnapBackDebug | undefined> {
  if (!tabUrl) {
    return undefined;
  }

  for (const j of state.individualJobs) {
    if (!j.enabled || !pageMatchesExplicitTarget(tabUrl, j.target.targetUrl)) {
      continue;
    }
    return buildDebugForTarget(tabId, tabUrl, j.target.targetUrl, undefined, deps);
  }

  for (const g of state.globalGroups) {
    if (!g.enabled) {
      continue;
    }
    const hit = g.targets.find((t) => pageMatchesExplicitTarget(tabUrl, t.targetUrl));
    if (hit) {
      const mk = memberKeyFromTargetUrl(hit.targetUrl) ?? undefined;
      return buildDebugForTarget(tabId, tabUrl, hit.targetUrl, mk, deps);
    }
    const favHit = findTwitchFavsMemberForPageUrl(g, tabUrl);
    if (favHit) {
      return buildDebugForTarget(tabId, tabUrl, favHit.targetUrl, favHit.memberKey, deps);
    }
  }

  return undefined;
}

/** Compact lines for the overlay debug strip. */
export function formatOverlayDebugLines(d: PageOverlaySnapBackDebug): string[] {
  const sched = d.schedulerTabId !== undefined ? String(d.schedulerTabId) : '—';
  const live = d.schedulerUsesThisTab ? 'LIVE' : 'other tab';
  const lines = [
    `Tab ${d.thisTabId} · Sched ${sched} · Snap ${live}`,
    `Refresh: ${d.refreshTargetUrl}`,
  ];
  if (d.matchingOpenTabIds.length > 0) {
    lines.push(`Open matches: ${d.matchingOpenTabIds.join(', ')}`);
  }
  if (d.memberKey) {
    lines.push(`Member: ${d.memberKey}`);
  }
  if (!d.pageMatchesTarget) {
    lines.push('Page URL ≠ refresh target');
  }
  return lines;
}
