/**
 * Epic 8 extension — live-aware refresh for global groups / TwitchFavs.
 */
import { LIVE_AWARE_MAX_IDLE_MS, LIVE_AWARE_RESUME_SOON_MS } from './live-aware-constants';
import { memberKeyFromTargetUrl, pageMatchesExplicitTarget } from './member-url';
import { findTwitchFavsMemberForPageUrl } from './twitch-favs-member-match';
import { isTwitchChannelRootUrl, coalesceTwitchLiveSignal } from './twitch-live-detect';
import type { AppState, GlobalGroup } from './types';

/** Live-aware is on by default for global groups (opt out with `liveAwareRefresh: false`). */
export function globalGroupLiveAwareEnabled(g: GlobalGroup): boolean {
  return g.liveAwareRefresh !== false;
}

/** Member key when this Twitch channel tab belongs to an enabled, live-aware global group. */
export function findGlobalMemberKeyForTwitchPageUrl(
  g: GlobalGroup,
  tabUrl: string | undefined
): string | null {
  if (!tabUrl || !g.enabled || !globalGroupLiveAwareEnabled(g) || !isTwitchChannelRootUrl(tabUrl)) {
    return null;
  }
  const hit = g.targets.find((t) => pageMatchesExplicitTarget(tabUrl, t.targetUrl));
  if (hit) {
    return memberKeyFromTargetUrl(hit.targetUrl);
  }
  const fav = findTwitchFavsMemberForPageUrl(g, tabUrl);
  return fav?.memberKey ?? null;
}

export function getMemberStreamLiveAuto(g: GlobalGroup, memberKey: string): boolean {
  return g.memberStreamLive?.[memberKey] === true;
}

export function getMemberStreamLiveOverride(
  g: GlobalGroup,
  memberKey: string
): boolean | undefined {
  return g.memberStreamLiveOverride?.[memberKey];
}

/** Effective live signal for scheduling: manual on wins over auto detection. */
export function getEffectiveMemberStreamLive(g: GlobalGroup, memberKey: string): boolean {
  const override = getMemberStreamLiveOverride(g, memberKey);
  if (override === true) {
    return true;
  }
  return getMemberStreamLiveAuto(g, memberKey);
}

/** Clear manual on override (`undefined` = auto-detect). */
export function patchGlobalMemberStreamLiveOverride(
  g: GlobalGroup,
  memberKey: string,
  on: boolean | null
): GlobalGroup {
  const memberStreamLiveOverride = { ...(g.memberStreamLiveOverride ?? {}) };
  if (on === true) {
    memberStreamLiveOverride[memberKey] = true;
  } else {
    delete memberStreamLiveOverride[memberKey];
  }
  return {
    ...g,
    memberStreamLiveOverride:
      Object.keys(memberStreamLiveOverride).length > 0 ? memberStreamLiveOverride : undefined,
  };
}

/**
 * User stream On/Off toggle.
 * Off clears manual override (auto-detect), snaps auto signal offline, and restarts the interval timer.
 * On forces live (interval refresh paused; 45-min safety refresh still applies).
 */
export function applyStreamLiveUserToggle(
  g: GlobalGroup,
  memberKey: string,
  on: boolean,
  now: number,
  nextDelayMs: number
): GlobalGroup {
  if (on) {
    return patchGlobalMemberStreamLiveOverride(g, memberKey, true);
  }
  const memberStreamLive = { ...(g.memberStreamLive ?? {}), [memberKey]: false };
  const memberNextFireAt = { ...(g.memberNextFireAt ?? {}), [memberKey]: now + nextDelayMs };
  return {
    ...patchGlobalMemberStreamLiveOverride(
      { ...g, memberStreamLive, memberNextFireAt },
      memberKey,
      null
    ),
    memberStreamLive,
    memberNextFireAt,
  };
}

/** True when live-paused and at least 45 min since the last successful refresh. */
export function shouldForceRefreshDespiteLivePause(
  g: GlobalGroup,
  memberKey: string,
  now: number
): boolean {
  if (!getEffectiveMemberStreamLive(g, memberKey)) {
    return false;
  }
  const lastRefresh = g.memberLastRefreshAt?.[memberKey];
  return lastRefresh !== undefined && now - lastRefresh >= LIVE_AWARE_MAX_IDLE_MS;
}

export function patchGlobalMemberLastRefreshAt(
  g: GlobalGroup,
  memberKey: string,
  now: number
): GlobalGroup {
  return {
    ...g,
    memberLastRefreshAt: { ...(g.memberLastRefreshAt ?? {}), [memberKey]: now },
  };
}

/**
 * After a successful tab refresh: record time, clear manual On override, and drop stale
 * auto live signal so the content script re-detects from the reloaded page.
 */
export function patchGlobalMemberAfterSuccessfulRefresh(
  g: GlobalGroup,
  memberKey: string,
  now: number
): GlobalGroup {
  let next = patchGlobalMemberLastRefreshAt(g, memberKey, now);
  next = patchGlobalMemberStreamLiveOverride(next, memberKey, null);
  if (!next.memberStreamLive || !(memberKey in next.memberStreamLive)) {
    return next;
  }
  const memberStreamLive = { ...next.memberStreamLive };
  delete memberStreamLive[memberKey];
  return {
    ...next,
    memberStreamLive: Object.keys(memberStreamLive).length > 0 ? memberStreamLive : undefined,
  };
}

export function isGlobalMemberLivePaused(g: GlobalGroup, memberKey: string): boolean {
  if (!globalGroupLiveAwareEnabled(g) || g.pausedMemberKeys?.includes(memberKey)) {
    return false;
  }
  return getEffectiveMemberStreamLive(g, memberKey);
}

export function patchGlobalGroupStreamLive(
  g: GlobalGroup,
  memberKey: string,
  live: boolean | null,
  now: number
): GlobalGroup | null {
  if (!globalGroupLiveAwareEnabled(g)) {
    return null;
  }
  const prev = g.memberStreamLive?.[memberKey];
  const nextStream = coalesceTwitchLiveSignal(live);
  if (prev === nextStream) {
    return null;
  }

  const memberStreamLive = { ...(g.memberStreamLive ?? {}), [memberKey]: nextStream };

  const memberNextFireAt = { ...(g.memberNextFireAt ?? {}) };
  if (prev === true && !nextStream && g.enabled) {
    const cap = now + LIVE_AWARE_RESUME_SOON_MS;
    const cur = memberNextFireAt[memberKey];
    memberNextFireAt[memberKey] = cur === undefined ? cap : Math.min(cur, cap);
  }

  return {
    ...g,
    memberStreamLive,
    memberNextFireAt: Object.keys(memberNextFireAt).length > 0 ? memberNextFireAt : undefined,
  };
}

export function patchGlobalGroupsForTwitchLiveReport(
  state: AppState,
  tabUrl: string,
  live: boolean | null,
  now: number
): { next: AppState; changed: boolean; liveSessionActive: boolean } {
  let changed = false;
  let liveSessionActive = false;
  const globalGroups = state.globalGroups.map((g) => {
    const mk = findGlobalMemberKeyForTwitchPageUrl(g, tabUrl);
    if (!mk) {
      return g;
    }
    const patched = patchGlobalGroupStreamLive(g, mk, live, now);
    const nextG = patched ?? g;
    if (coalesceTwitchLiveSignal(live) && !g.pausedMemberKeys?.includes(mk)) {
      liveSessionActive = getEffectiveMemberStreamLive(nextG, mk);
    }
    if (!patched) {
      return g;
    }
    changed = true;
    return patched;
  });
  return {
    next: changed ? { ...state, globalGroups } : state,
    changed,
    liveSessionActive,
  };
}

export function isTwitchLiveWatchSessionActive(
  state: AppState,
  tabUrl: string,
  live: boolean | null
): boolean {
  if (!coalesceTwitchLiveSignal(live)) {
    return false;
  }
  for (const g of state.globalGroups) {
    const mk = findGlobalMemberKeyForTwitchPageUrl(g, tabUrl);
    if (mk && isGlobalMemberLivePaused(g, mk)) {
      return true;
    }
  }
  for (const j of state.individualJobs) {
    if (!j.enabled || !j.liveAwareRefresh || j.streamLive !== true) {
      continue;
    }
    if (pageMatchesExplicitTarget(tabUrl, j.target.targetUrl)) {
      return true;
    }
  }
  return false;
}

export function clearGlobalStreamLiveForTabUrl(state: AppState, tabUrl: string): AppState | null {
  if (isTwitchChannelRootUrl(tabUrl)) {
    return null;
  }
  let changed = false;
  const globalGroups = state.globalGroups.map((g) => {
    if (!g.memberStreamLive || Object.keys(g.memberStreamLive).length === 0) {
      return g;
    }
    let touched = false;
    const memberStreamLive = { ...g.memberStreamLive };
    for (const t of g.targets) {
      if (!pageMatchesExplicitTarget(tabUrl, t.targetUrl)) {
        continue;
      }
      const mk = memberKeyFromTargetUrl(t.targetUrl);
      if (mk && mk in memberStreamLive) {
        delete memberStreamLive[mk];
        touched = true;
      }
    }
    if (!touched) {
      return g;
    }
    changed = true;
    return {
      ...g,
      memberStreamLive: Object.keys(memberStreamLive).length > 0 ? memberStreamLive : undefined,
    };
  });
  return changed ? { ...state, globalGroups } : null;
}
