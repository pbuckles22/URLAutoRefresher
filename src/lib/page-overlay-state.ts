import type { ExtensionPrefs } from './prefs';
import { resolveGlobalGroupTargets } from './global-group-targets';
import type { AppState } from './types';
import { pageMatchesExplicitTarget } from './member-url';

export { pageMatchesExplicitTarget } from './member-url';

export type PageOverlayVm =
  | { show: false }
  | {
      show: true;
      mode: 'timer';
      nextFireAt: number | undefined;
      globalGroupId?: string;
      individualJobId?: string;
    }
  | { show: true; mode: 'paused'; globalGroupId: string }
  | { show: true; mode: 'paused'; individualJobId: string };

/**
 * Overlay visibility + mode for a tab (individual job wins over global groups).
 * Pass `tabUrl` from the sender tab so global groups still match when the stored member tabId
 * differs from the live tab (same channel in a new tab / after navigation).
 */
export async function getPageOverlayVmForTab(
  state: AppState,
  prefs: ExtensionPrefs,
  tabId: number,
  tabUrl?: string
): Promise<PageOverlayVm> {
  if (!prefs.showPageOverlayTimer) {
    return { show: false };
  }

  for (const j of state.individualJobs) {
    if (!j.enabled || j.target.tabId !== tabId) {
      continue;
    }
    if (j.overlayPaused) {
      return { show: true, mode: 'paused', individualJobId: j.id };
    }
    return { show: true, mode: 'timer', nextFireAt: j.nextFireAt, individualJobId: j.id };
  }

  for (const g of state.globalGroups) {
    if (!g.enabled) {
      continue;
    }
    const resolved = await resolveGlobalGroupTargets(g);
    const directMember = resolved.some((t) => t.tabId === tabId);
    let scheduleTabId = tabId;

    if (!directMember) {
      const hit = g.targets.find((t) => pageMatchesExplicitTarget(tabUrl, t.targetUrl));
      if (!hit) {
        continue;
      }
      scheduleTabId = hit.tabId;
    }

    if (g.pausedTabIds?.includes(tabId) || g.pausedTabIds?.includes(scheduleTabId)) {
      return { show: true, mode: 'paused', globalGroupId: g.id };
    }
    const next = g.tabNextFireAt?.[String(scheduleTabId)] ?? g.nextFireAt;
    return { show: true, mode: 'timer', nextFireAt: next, globalGroupId: g.id };
  }

  return { show: false };
}
