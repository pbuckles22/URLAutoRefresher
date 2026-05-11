/**
 * Epic 10.2 — move stored global-group target tab ids when the live tab id for a member changes.
 * Epic 10.3 — schedule/pause are keyed by member URL (`memberNextFireAt` / `pausedMemberKeys`), so no rewiring there.
 */

import type { GlobalGroup } from './types';

/** Rewire `targets` from `oldTabId` to `newTabId`. Schedule keys stay on member URL. */
export function rebindGlobalGroupTabIds(
  group: GlobalGroup,
  oldTabId: number,
  newTabId: number,
  newWindowId: number
): GlobalGroup {
  if (oldTabId === newTabId) {
    return group;
  }

  const targets = group.targets.map((t) =>
    t.tabId === oldTabId ? { ...t, tabId: newTabId, windowId: newWindowId } : t
  );

  return {
    ...group,
    targets,
  };
}
