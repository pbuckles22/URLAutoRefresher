/**
 * Whether proactive raid guard should run on a Twitch tab (TwitchFavs home + sched hint).
 */
import { pageMatchesExplicitTarget } from './member-url';
import type { MemberSchedHint } from './sched-member-tab-hint';

export type TwitchRaidGuardArmedInput = {
  tabUrl: string;
  hint: MemberSchedHint | undefined;
  groupEnabled: boolean;
  isTwitchFavsGroup: boolean;
};

export function isTwitchRaidGuardArmedForTab(input: TwitchRaidGuardArmedInput): boolean {
  const { tabUrl, hint, groupEnabled, isTwitchFavsGroup } = input;
  if (!hint || !groupEnabled || !isTwitchFavsGroup) {
    return false;
  }
  return pageMatchesExplicitTarget(tabUrl.trim(), hint.targetUrl);
}
