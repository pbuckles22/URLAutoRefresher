/**
 * Immediate snap-back when a sched tab leaves its TwitchFavs home channel (raid detour).
 */
import { memberKeyFromTargetUrl, pageMatchesExplicitTarget } from '../lib/member-url';
import {
  getSchedHintForTab,
  rehydrateSchedHintsFromSession,
  rememberSchedTabId,
} from '../lib/sched-member-tab-hint';
import { noteSnapBackEvent } from '../lib/snap-back-events';
import { schedLog } from '../lib/scheduler-debug';
import { loadAppState } from '../lib/storage';
import { isTwitchFavsGroupName, twitchChannelLoginFromUrl } from '../lib/twitch-favs';
import { isTwitchChannelRootUrl } from '../lib/twitch-live-detect';

function isTwitchRaidLandingUrl(tabUrl: string): boolean {
  return /[?&]referrer=raid\b/i.test(tabUrl);
}

/**
 * If this tab was on a TwitchFavs home channel and lands on another channel root via raid
 * (or immediately after leaving home), restore the stored home URL.
 */
export async function maybeSnapBackRaidDetour(
  tabId: number,
  tabUrl: string,
  previousTabUrl: string | undefined
): Promise<boolean> {
  await rehydrateSchedHintsFromSession();

  const url = tabUrl.trim();
  if (!url || !isTwitchChannelRootUrl(url)) {
    return false;
  }

  const hint = getSchedHintForTab(tabId);
  if (!hint || pageMatchesExplicitTarget(url, hint.targetUrl)) {
    return false;
  }

  const homeLogin = twitchChannelLoginFromUrl(hint.targetUrl);
  const pageLogin = twitchChannelLoginFromUrl(url);
  if (!homeLogin || !pageLogin || homeLogin === pageLogin) {
    return false;
  }

  const isRaid = isTwitchRaidLandingUrl(url);
  const leftHome =
    previousTabUrl !== undefined && pageMatchesExplicitTarget(previousTabUrl, hint.targetUrl);
  if (!isRaid && !leftHome) {
    await schedLog('raid detour skip: browse-away (not from home)', {
      tabId,
      previousTabUrl,
      url,
      memberKey: hint.memberKey,
    });
    return false;
  }

  const state = await loadAppState();
  const group = state.globalGroups.find((g) => g.id === hint.groupId);
  if (!group?.enabled || !isTwitchFavsGroupName(group.name)) {
    return false;
  }
  const mk = memberKeyFromTargetUrl(hint.targetUrl);
  if (!mk || mk !== hint.memberKey || group.pausedMemberKeys?.includes(mk)) {
    return false;
  }

  await schedLog('raid detour snap-back', {
    tabId,
    fromUrl: url,
    toUrl: hint.targetUrl,
    memberKey: mk,
    referrerRaid: isRaid,
    leftHome,
  });

  try {
    await chrome.tabs.update(tabId, { url: hint.targetUrl });
    rememberSchedTabId(hint.groupId, hint.memberKey, tabId, hint.targetUrl);
    await noteSnapBackEvent(mk, {
      atMs: Date.now(),
      tabId,
      fromUrl: url,
      toUrl: hint.targetUrl,
      reason: isRaid ? 'raid-detour' : 'channel-detour',
    });
    return true;
  } catch {
    await schedLog('raid detour snap-back: tabs.update failed', { tabId });
    return false;
  }
}
