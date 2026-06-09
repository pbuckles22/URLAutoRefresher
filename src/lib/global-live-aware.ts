/**
 * Epic 8 extension — live-aware refresh for global groups / TwitchFavs.
 */
import { LIVE_AWARE_RESUME_SOON_MS } from './live-aware-constants';
import { memberKeyFromTargetUrl, pageMatchesExplicitTarget } from './member-url';
import { findTwitchFavsMemberForPageUrl } from './twitch-favs-member-match';
import { isTwitchChannelRootUrl } from './twitch-live-detect';
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

export function isGlobalMemberLivePaused(g: GlobalGroup, memberKey: string): boolean {
  if (!globalGroupLiveAwareEnabled(g) || g.pausedMemberKeys?.includes(memberKey)) {
    return false;
  }
  return g.memberStreamLive?.[memberKey] === true;
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
  const nextStream = live === null ? undefined : live;
  if (prev === nextStream) {
    return null;
  }

  const memberStreamLive = { ...(g.memberStreamLive ?? {}) };
  if (nextStream === undefined) {
    delete memberStreamLive[memberKey];
  } else {
    memberStreamLive[memberKey] = nextStream;
  }

  const memberNextFireAt = { ...(g.memberNextFireAt ?? {}) };
  if (prev === true && nextStream !== true && g.enabled) {
    const cap = now + LIVE_AWARE_RESUME_SOON_MS;
    const cur = memberNextFireAt[memberKey];
    memberNextFireAt[memberKey] = cur === undefined ? cap : Math.min(cur, cap);
  }

  return {
    ...g,
    memberStreamLive: Object.keys(memberStreamLive).length > 0 ? memberStreamLive : undefined,
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
    if (live === true && !g.pausedMemberKeys?.includes(mk)) {
      liveSessionActive = true;
    }
    const patched = patchGlobalGroupStreamLive(g, mk, live, now);
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
  if (live !== true) {
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
