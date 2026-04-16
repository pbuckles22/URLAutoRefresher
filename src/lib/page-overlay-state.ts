import type { ExtensionPrefs } from './prefs';
import { resolveGlobalGroupTargets } from './global-group-targets';
import type { AppState } from './types';

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
 */
export async function getPageOverlayVmForTab(
  state: AppState,
  prefs: ExtensionPrefs,
  tabId: number
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
    if (!resolved.some((t) => t.tabId === tabId)) {
      continue;
    }
    if (g.pausedTabIds?.includes(tabId)) {
      return { show: true, mode: 'paused', globalGroupId: g.id };
    }
    const next =
      g.tabNextFireAt?.[String(tabId)] ?? g.nextFireAt;
    return { show: true, mode: 'timer', nextFireAt: next, globalGroupId: g.id };
  }

  return { show: false };
}
