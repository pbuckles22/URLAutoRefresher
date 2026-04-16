import type { AppState } from './types';

/**
 * When a tab closes: disable individual jobs targeting it; remove targets from globals;
 * disable empty global groups.
 */
export function applyTabRemoved(state: AppState, removedTabId: number): AppState {
  const individualJobs = state.individualJobs.map((j) =>
    j.target.tabId === removedTabId ? { ...j, enabled: false } : j
  );

  const globalGroups = state.globalGroups.map((g) => {
    const targets = g.targets.filter((t) => t.tabId !== removedTabId);
    const nextPaused =
      g.pausedTabIds === undefined
        ? undefined
        : g.pausedTabIds.filter((id) => id !== removedTabId);
    const hasPatterns = g.urlPatterns?.some((p) => p.trim()) ?? false;
    const stillHasTabs = targets.length > 0 || hasPatterns;
    const enabled = stillHasTabs ? g.enabled : false;
    const rm = String(removedTabId);
    const tabNextFireAt =
      g.tabNextFireAt === undefined
        ? undefined
        : (() => {
            const copy = { ...g.tabNextFireAt };
            delete copy[rm];
            return Object.keys(copy).length > 0 ? copy : undefined;
          })();
    return {
      ...g,
      targets,
      tabNextFireAt,
      pausedTabIds: nextPaused && nextPaused.length > 0 ? nextPaused : undefined,
      enabled,
    };
  });

  return { ...state, individualJobs, globalGroups };
}
