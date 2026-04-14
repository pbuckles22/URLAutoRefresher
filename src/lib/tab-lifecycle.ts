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
    const enabled = targets.length === 0 ? false : g.enabled;
    return { ...g, targets, enabled };
  });

  return { ...state, individualJobs, globalGroups };
}
