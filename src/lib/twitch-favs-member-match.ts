/**
 * Match a live Twitch channel tab to a TwitchFavs member (targets + urlPatterns).
 */
import { memberKeyFromTargetUrl, pageMatchesExplicitTarget } from './member-url';
import type { GlobalGroup } from './types';
import {
  canonicalTwitchChannelUrl,
  isTwitchFavsGroupName,
  tabUrlMatchesTwitchFavsFavorite,
  twitchChannelLoginFromUrl,
} from './twitch-favs';
import { isTwitchChannelRootUrl } from './twitch-live-detect';

export type TwitchFavsMemberHit = {
  memberKey: string;
  targetUrl: string;
};

export function findTwitchFavsMemberForPageUrl(
  group: GlobalGroup,
  tabUrl: string | undefined
): TwitchFavsMemberHit | undefined {
  if (!tabUrl || !isTwitchFavsGroupName(group.name) || !isTwitchChannelRootUrl(tabUrl)) {
    return undefined;
  }

  for (const t of group.targets) {
    if (!pageMatchesExplicitTarget(tabUrl, t.targetUrl)) {
      continue;
    }
    const mk = memberKeyFromTargetUrl(t.targetUrl);
    if (mk) {
      return { memberKey: mk, targetUrl: t.targetUrl.trim() };
    }
  }

  const login = twitchChannelLoginFromUrl(tabUrl);
  if (!login) {
    return undefined;
  }
  for (const pattern of group.urlPatterns ?? []) {
    const p = pattern.trim();
    if (!p || !tabUrlMatchesTwitchFavsFavorite(tabUrl, p)) {
      continue;
    }
    const targetUrl = canonicalTwitchChannelUrl(login);
    const mk = memberKeyFromTargetUrl(targetUrl);
    if (mk) {
      return { memberKey: mk, targetUrl };
    }
  }

  return undefined;
}
