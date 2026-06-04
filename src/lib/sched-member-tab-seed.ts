/**
 * Seed sched-tab hints when a tab navigates to a TwitchFavs home channel (not only via overlay).
 */
import { memberKeyFromTargetUrl, pageMatchesExplicitTarget } from './member-url';
import { getSchedHintForTab, rememberSchedTabId } from './sched-member-tab-hint';
import { loadAppState } from './storage';
import {
  canonicalTwitchChannelUrl,
  isTwitchFavsGroupName,
  tabUrlMatchesTwitchFavsFavorite,
  twitchChannelLoginFromUrl,
} from './twitch-favs';
import { isTwitchChannelRootUrl } from './twitch-live-detect';

export async function maybeRememberSchedTabFromFavHome(
  tabId: number,
  tabUrl: string
): Promise<void> {
  const url = tabUrl.trim();
  if (!url || !isTwitchChannelRootUrl(url)) {
    return;
  }

  const existing = getSchedHintForTab(tabId);
  if (existing && !pageMatchesExplicitTarget(url, existing.targetUrl)) {
    return;
  }

  const state = await loadAppState();
  for (const g of state.globalGroups) {
    if (!g.enabled || !isTwitchFavsGroupName(g.name)) {
      continue;
    }
    const paused = new Set(g.pausedMemberKeys ?? []);

    for (const t of g.targets) {
      if (!pageMatchesExplicitTarget(url, t.targetUrl)) {
        continue;
      }
      const mk = memberKeyFromTargetUrl(t.targetUrl);
      if (!mk || paused.has(mk)) {
        continue;
      }
      rememberSchedTabId(g.id, mk, tabId, t.targetUrl);
      return;
    }

    const login = twitchChannelLoginFromUrl(url);
    if (!login) {
      continue;
    }
    const patterns = g.urlPatterns ?? [];
    for (const pattern of patterns) {
      const p = pattern.trim();
      if (!p || !tabUrlMatchesTwitchFavsFavorite(url, p)) {
        continue;
      }
      const canon = canonicalTwitchChannelUrl(login);
      const mk = memberKeyFromTargetUrl(canon);
      if (!mk || paused.has(mk)) {
        continue;
      }
      rememberSchedTabId(g.id, mk, tabId, canon);
      return;
    }
  }
}
