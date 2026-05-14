import type { AppState } from './types';
import { memberKeyFromTargetUrl, pageMatchesExplicitTarget } from './member-url';

/** Tab has at least one enabled individual or global refresh for this page URL. Pass `tabUrl` from the tab (http/https). */
export function tabHasActiveRefreshJob(state: AppState, tabUrl?: string): boolean {
  if (!tabUrl) {
    return false;
  }
  if (
    state.individualJobs.some(
      (j) => j.enabled && !j.overlayPaused && pageMatchesExplicitTarget(tabUrl, j.target.targetUrl)
    )
  ) {
    return true;
  }
  return state.globalGroups.some(
    (g) => g.enabled && g.targets.some((t) => pageMatchesExplicitTarget(tabUrl, t.targetUrl))
  );
}

/** Next fire time for this tab's active job (individual wins). Pass `tabUrl` from the page. */
export function getNextFireAtForTab(state: AppState, tabUrl?: string): number | undefined {
  if (!tabUrl) {
    return undefined;
  }
  for (const job of state.individualJobs) {
    if (
      job.enabled &&
      !job.overlayPaused &&
      pageMatchesExplicitTarget(tabUrl, job.target.targetUrl)
    ) {
      return job.nextFireAt;
    }
  }
  for (const group of state.globalGroups) {
    if (!group.enabled) {
      continue;
    }
    const hit = group.targets.find((t) => pageMatchesExplicitTarget(tabUrl, t.targetUrl));
    if (hit) {
      const mk = memberKeyFromTargetUrl(hit.targetUrl);
      if (!mk) {
        continue;
      }
      return group.memberNextFireAt?.[mk] ?? group.nextFireAt;
    }
  }
  return undefined;
}
