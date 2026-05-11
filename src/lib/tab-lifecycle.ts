import { memberKeyFromTargetUrl } from './member-url';
import type { AppState } from './types';

/**
 * When a tab closes: disable individual jobs targeting it; remove targets from globals;
 * disable empty global groups.
 */
export function applyTabRemoved(state: AppState, removedTabId: number): AppState {
  const individualJobs = state.individualJobs.map((j) =>
    j.target.tabId === removedTabId ? { ...j, enabled: false, nextFireAt: undefined, overlayPaused: undefined } : j
  );

  const globalGroups = state.globalGroups.map((g) => {
    const removedExplicit = g.targets.filter((t) => t.tabId === removedTabId);
    const dropMemberKeys = new Set(
      removedExplicit
        .map((t) => memberKeyFromTargetUrl(t.targetUrl))
        .filter((x): x is string => x != null)
    );

    const targets = g.targets.filter((t) => t.tabId !== removedTabId);

    let pausedMemberKeys = g.pausedMemberKeys?.filter((mk) => !dropMemberKeys.has(mk));

    let memberNextFireAt = g.memberNextFireAt;
    if (memberNextFireAt && dropMemberKeys.size > 0) {
      const copy = { ...memberNextFireAt };
      for (const k of dropMemberKeys) {
        delete copy[k];
      }
      memberNextFireAt = Object.keys(copy).length > 0 ? copy : undefined;
    }

    const hasPatterns = g.urlPatterns?.some((p) => p.trim()) ?? false;
    const stillHasTabs = targets.length > 0 || hasPatterns;
    const enabled = stillHasTabs ? g.enabled : false;
    return {
      ...g,
      targets,
      memberNextFireAt,
      pausedMemberKeys: pausedMemberKeys && pausedMemberKeys.length > 0 ? pausedMemberKeys : undefined,
      enabled,
    };
  });

  return { ...state, individualJobs, globalGroups };
}
