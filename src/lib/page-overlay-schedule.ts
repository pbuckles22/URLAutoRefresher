import type { AppState } from './types';

/** Tab has at least one enabled individual or global refresh targeting it. */
export function tabHasActiveRefreshJob(state: AppState, tabId: number): boolean {
  if (
    state.individualJobs.some(
      (j) => j.enabled && !j.overlayPaused && j.target.tabId === tabId
    )
  ) {
    return true;
  }
  return state.globalGroups.some(
    (g) => g.enabled && g.targets.length > 0 && g.targets.some((t) => t.tabId === tabId)
  );
}

/** Next fire time for this tab's active job (individual wins if ever both; mutual exclusion should prevent both). */
export function getNextFireAtForTab(state: AppState, tabId: number): number | undefined {
  for (const job of state.individualJobs) {
    if (job.enabled && !job.overlayPaused && job.target.tabId === tabId) {
      return job.nextFireAt;
    }
  }
  for (const group of state.globalGroups) {
    if (!group.enabled || group.targets.length === 0) {
      continue;
    }
    if (group.targets.some((t) => t.tabId === tabId)) {
      return group.tabNextFireAt?.[String(tabId)] ?? group.nextFireAt;
    }
  }
  return undefined;
}
