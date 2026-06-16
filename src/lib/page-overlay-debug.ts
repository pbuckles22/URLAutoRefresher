/**
 * Snap-back testing fields for the page overlay (tab id vs scheduler pick).
 */
import { memberKeyFromTargetUrl, pageMatchesExplicitTarget } from './member-url';
import { resolveLiveTabIdForTargetUrl } from './resolve-live-tab';
import {
  getLatestSnapBackEventForMember,
  getSnapBackCountForMember,
  type SnapBackReason,
} from './snap-back-events';
import { getRaidBlockCountForMember } from './raid-block-events';
import { findTwitchFavsMemberForPageUrl } from './twitch-favs-member-match';
import {
  getEffectiveMemberStreamLive,
  getMemberStreamLiveAuto,
  getMemberStreamLiveOverride,
} from './global-live-aware';
import { LIVE_AWARE_MAX_IDLE_MS } from './live-aware-constants';
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
  /** Last confirmed snap-back event for this member (if any). */
  lastSnapBackAtMs?: number;
  /** Reason for the last confirmed snap-back event. */
  lastSnapBackReason?: SnapBackReason;
  /** Session count of proactive raid blocks for this member. */
  raidBlockCount?: number;
  /** Session count of snap-back recoveries for this member. */
  snapBackCount?: number;
  /** Last successful scheduled refresh for this member/job (ms). */
  lastRefreshAtMs?: number;
  /** Twitch channel live signal for scheduling (`true` = live; omit or false = offline). */
  twitchStreamLive?: boolean;
  /** Auto-detected live signal before manual override. */
  twitchStreamLiveAuto?: boolean;
  /** Present when the user forced live/offline (`manual`); absent when using auto-detect. */
  twitchStreamLiveSource?: 'auto' | 'manual';
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

function twitchStreamLiveForGlobal(g: AppState['globalGroups'][0], memberKey: string): boolean {
  return getEffectiveMemberStreamLive(g, memberKey);
}

function twitchStreamLiveForJob(j: AppState['individualJobs'][0]): boolean | undefined {
  const meta = twitchStreamLiveMetaForJob(j);
  return meta?.twitchStreamLive;
}

async function buildDebugForTarget(
  tabId: number,
  tabUrl: string,
  targetUrl: string,
  memberKey: string | undefined,
  deps: OverlayDebugDeps,
  twitchStreamLive?: boolean,
  twitchMeta?: Pick<PageOverlaySnapBackDebug, 'twitchStreamLiveAuto' | 'twitchStreamLiveSource'>,
  lastRefreshAtMs?: number
): Promise<PageOverlaySnapBackDebug> {
  const refreshTargetUrl = targetUrl.trim();
  const schedulerTabId = await deps.resolveLiveTabId(refreshTargetUrl, tabId);
  const matchingOpenTabIds = await listMatchingTabIds(refreshTargetUrl, deps.queryTabs);
  const lastSnapBack = memberKey ? await getLatestSnapBackEventForMember(memberKey) : undefined;
  const raidBlockCount = memberKey ? await getRaidBlockCountForMember(memberKey) : undefined;
  const snapBackCount = memberKey ? await getSnapBackCountForMember(memberKey) : undefined;
  return {
    thisTabId: tabId,
    pageUrl: tabUrl,
    refreshTargetUrl,
    schedulerTabId,
    schedulerUsesThisTab: schedulerTabId === tabId,
    pageMatchesTarget: pageMatchesExplicitTarget(tabUrl, refreshTargetUrl),
    ...(memberKey !== undefined ? { memberKey } : {}),
    matchingOpenTabIds,
    ...(lastSnapBack
      ? { lastSnapBackAtMs: lastSnapBack.atMs, lastSnapBackReason: lastSnapBack.reason }
      : {}),
    ...(raidBlockCount !== undefined ? { raidBlockCount } : {}),
    ...(snapBackCount !== undefined ? { snapBackCount } : {}),
    ...(lastRefreshAtMs !== undefined ? { lastRefreshAtMs } : {}),
    ...(twitchStreamLive !== undefined ? { twitchStreamLive } : {}),
    ...(twitchMeta?.twitchStreamLiveAuto !== undefined
      ? { twitchStreamLiveAuto: twitchMeta.twitchStreamLiveAuto }
      : {}),
    ...(twitchMeta?.twitchStreamLiveSource
      ? { twitchStreamLiveSource: twitchMeta.twitchStreamLiveSource }
      : {}),
  };
}

function twitchStreamLiveMetaForGlobal(
  g: AppState['globalGroups'][0],
  memberKey: string
): Pick<
  PageOverlaySnapBackDebug,
  'twitchStreamLive' | 'twitchStreamLiveAuto' | 'twitchStreamLiveSource'
> {
  const manualOn = getMemberStreamLiveOverride(g, memberKey) === true;
  return {
    twitchStreamLive: getEffectiveMemberStreamLive(g, memberKey),
    twitchStreamLiveAuto: getMemberStreamLiveAuto(g, memberKey),
    twitchStreamLiveSource: manualOn ? 'manual' : 'auto',
  };
}

function twitchStreamLiveMetaForJob(
  j: AppState['individualJobs'][0]
):
  | Pick<
      PageOverlaySnapBackDebug,
      'twitchStreamLive' | 'twitchStreamLiveAuto' | 'twitchStreamLiveSource'
    >
  | undefined {
  if (!j.liveAwareRefresh) {
    return undefined;
  }
  const manualOn = j.streamLiveOverride === true;
  const auto = j.streamLive === true;
  return {
    twitchStreamLive: manualOn || auto,
    twitchStreamLiveAuto: auto,
    twitchStreamLiveSource: manualOn ? 'manual' : 'auto',
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
    return buildDebugForTarget(
      tabId,
      tabUrl,
      j.target.targetUrl,
      undefined,
      deps,
      twitchStreamLiveForJob(j),
      twitchStreamLiveMetaForJob(j),
      j.lastRefreshAt
    );
  }

  for (const g of state.globalGroups) {
    if (!g.enabled) {
      continue;
    }
    const hit = g.targets.find((t) => pageMatchesExplicitTarget(tabUrl, t.targetUrl));
    if (hit) {
      const mk = memberKeyFromTargetUrl(hit.targetUrl) ?? undefined;
      return buildDebugForTarget(
        tabId,
        tabUrl,
        hit.targetUrl,
        mk,
        deps,
        mk ? twitchStreamLiveForGlobal(g, mk) : undefined,
        mk ? twitchStreamLiveMetaForGlobal(g, mk) : undefined,
        mk ? g.memberLastRefreshAt?.[mk] : undefined
      );
    }
    const favHit = findTwitchFavsMemberForPageUrl(g, tabUrl);
    if (favHit) {
      return buildDebugForTarget(
        tabId,
        tabUrl,
        favHit.targetUrl,
        favHit.memberKey,
        deps,
        twitchStreamLiveForGlobal(g, favHit.memberKey),
        twitchStreamLiveMetaForGlobal(g, favHit.memberKey),
        g.memberLastRefreshAt?.[favHit.memberKey]
      );
    }
  }

  return undefined;
}

function formatAgeSince(tsMs: number, now = Date.now()): string {
  const deltaSec = Math.max(0, Math.floor((now - tsMs) / 1000));
  if (deltaSec < 60) {
    return `${deltaSec}s ago`;
  }
  const min = Math.floor(deltaSec / 60);
  if (min < 60) {
    return `${min}m ago`;
  }
  const hr = Math.floor(min / 60);
  return `${hr}h ago`;
}

function formatReason(reason: SnapBackReason): string {
  return reason === 'raid-detour' ? 'raid detour' : 'channel detour';
}

/** Minutes since `tsMs`; `undefined` when no refresh recorded yet. */
export function minutesSinceMs(tsMs: number | undefined, now = Date.now()): number | undefined {
  if (tsMs === undefined) {
    return undefined;
  }
  return Math.max(0, Math.floor((now - tsMs) / 60_000));
}

export function formatLastRefreshLine(
  lastRefreshAtMs: number | undefined,
  now = Date.now()
): string {
  if (lastRefreshAtMs === undefined) {
    return 'Last refresh: never';
  }
  const min = minutesSinceMs(lastRefreshAtMs, now)!;
  return `Last refresh: ${min}m ago`;
}

export function isLastRefreshOverMaxIdle(
  lastRefreshAtMs: number | undefined,
  now = Date.now()
): boolean {
  if (lastRefreshAtMs === undefined) {
    return false;
  }
  return now - lastRefreshAtMs >= LIVE_AWARE_MAX_IDLE_MS;
}

function formatTwitchStreamLiveLabel(d: PageOverlaySnapBackDebug): string {
  const status = d.twitchStreamLive === true ? 'LIVE' : 'offline';
  if (d.twitchStreamLiveSource === 'manual') {
    return `${status} (manual)`;
  }
  if (
    d.twitchStreamLiveSource === 'auto' &&
    d.twitchStreamLiveAuto !== undefined &&
    d.twitchStreamLiveAuto !== d.twitchStreamLive
  ) {
    return `${status} (auto)`;
  }
  return `${status} (auto)`;
}

/** Compact lines for the overlay debug strip. */
export function formatOverlayDebugLines(d: PageOverlaySnapBackDebug, now = Date.now()): string[] {
  const sched = d.schedulerTabId !== undefined ? String(d.schedulerTabId) : '-';
  const live = d.schedulerUsesThisTab ? 'LIVE' : 'other tab';
  const lines = [
    `Tab ${d.thisTabId} · Sched ${sched} · Pick ${live}`,
    `Stream: ${formatTwitchStreamLiveLabel(d)}`,
    formatLastRefreshLine(d.lastRefreshAtMs, now),
  ];
  if (d.raidBlockCount !== undefined || d.snapBackCount !== undefined) {
    const blocks = d.raidBlockCount ?? 0;
    const snaps = d.snapBackCount ?? 0;
    lines.push(`Raid blocks: ${blocks} · Snap-backs: ${snaps}`);
  }
  if (d.lastSnapBackAtMs !== undefined) {
    const reasonPart = d.lastSnapBackReason ? ` (${formatReason(d.lastSnapBackReason)})` : '';
    lines.push(`Last snap-back: ${formatAgeSince(d.lastSnapBackAtMs, now)}${reasonPart}`);
  }
  lines.push(`Refresh: ${d.refreshTargetUrl}`);
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
