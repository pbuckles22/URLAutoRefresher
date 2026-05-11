import type { ExtensionPrefs } from './prefs';
import { resolveGlobalGroupTargets } from './global-group-targets';
import type { AppState } from './types';
import { memberKeyFromTargetUrl, pageMatchesExplicitTarget } from './member-url';

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
 * Pass `tabUrl` from the sender tab so membership matches without persisted tab ids (Epic 10.4).
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
    if (!j.enabled || !tabUrl || !pageMatchesExplicitTarget(tabUrl, j.target.targetUrl)) {
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

    let memberKey: string | null = null;
    const hitResolved = resolved.find((t) => t.tabId === tabId);
    if (hitResolved) {
      memberKey = memberKeyFromTargetUrl(hitResolved.targetUrl);
    } else {
      const hit = g.targets.find((t) => pageMatchesExplicitTarget(tabUrl, t.targetUrl));
      if (!hit) {
        continue;
      }
      memberKey = memberKeyFromTargetUrl(hit.targetUrl);
    }
    if (!memberKey) {
      continue;
    }

    if (g.pausedMemberKeys?.includes(memberKey)) {
      return { show: true, mode: 'paused', globalGroupId: g.id };
    }
    const next = g.memberNextFireAt?.[memberKey] ?? g.nextFireAt;
    return { show: true, mode: 'timer', nextFireAt: next, globalGroupId: g.id };
  }

  return { show: false };
}
