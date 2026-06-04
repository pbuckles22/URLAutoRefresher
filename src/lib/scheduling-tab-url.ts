/**
 * Decide when an open tab URL should trigger global-group alarm alignment (memberNextFireAt seeding).
 */

import { globalGroupHasSchedulableConfig } from './global-group-targets';
import { memberKeyFromTargetUrl, pageMatchesExplicitTarget } from './member-url';
import { isTwitchFavsGroupName, tabUrlMatchesTwitchFavsFavorite } from './twitch-favs';
import type { AppState } from './types';
import { urlMatchesGlob } from './url-glob';

/** True when `tabUrl` is an open, unpaused member of an enabled schedulable global group. */
export function shouldBootstrapSchedulingForTabUrl(state: AppState, tabUrl: string): boolean {
  const url = tabUrl.trim();
  if (!url) {
    return false;
  }

  for (const g of state.globalGroups) {
    if (!g.enabled || !globalGroupHasSchedulableConfig(g)) {
      continue;
    }
    const paused = new Set(g.pausedMemberKeys ?? []);

    for (const t of g.targets) {
      if (!pageMatchesExplicitTarget(url, t.targetUrl)) {
        continue;
      }
      const mk = memberKeyFromTargetUrl(t.targetUrl);
      if (mk && !paused.has(mk)) {
        return true;
      }
    }

    for (const pattern of g.urlPatterns ?? []) {
      const p = pattern.trim();
      if (!p) {
        continue;
      }
      const match = isTwitchFavsGroupName(g.name)
        ? tabUrlMatchesTwitchFavsFavorite(url, p)
        : urlMatchesGlob(url, p);
      if (!match) {
        continue;
      }
      const tabMk = memberKeyFromTargetUrl(url);
      if (tabMk && paused.has(tabMk)) {
        continue;
      }
      return true;
    }
  }

  return false;
}
