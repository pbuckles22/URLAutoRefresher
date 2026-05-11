/**
 * Epic 10.2 — move stored global-group keys when the live tab id for a member changes.
 */

import type { GlobalGroup } from './types';

/**
 * Rewire `targets`, `tabNextFireAt`, and `pausedTabIds` from `oldTabId` to `newTabId`.
 */
export function rebindGlobalGroupTabIds(
  group: GlobalGroup,
  oldTabId: number,
  newTabId: number,
  newWindowId: number
): GlobalGroup {
  if (oldTabId === newTabId) {
    return group;
  }

  const oldKey = String(oldTabId);
  const newKey = String(newTabId);

  let tabNextFireAt = { ...(group.tabNextFireAt ?? {}) };
  const fireOld = tabNextFireAt[oldKey];
  if (fireOld !== undefined) {
    delete tabNextFireAt[oldKey];
    const existingNew = tabNextFireAt[newKey];
    tabNextFireAt[newKey] =
      existingNew === undefined ? fireOld : Math.min(existingNew, fireOld);
  }

  let pausedTabIds = group.pausedTabIds;
  if (pausedTabIds?.length) {
    pausedTabIds = pausedTabIds.map((id) => (id === oldTabId ? newTabId : id));
    pausedTabIds = [...new Set(pausedTabIds)];
  }

  const targets = group.targets.map((t) =>
    t.tabId === oldTabId ? { ...t, tabId: newTabId, windowId: newWindowId } : t
  );

  return {
    ...group,
    targets,
    tabNextFireAt: Object.keys(tabNextFireAt).length > 0 ? tabNextFireAt : undefined,
    pausedTabIds: pausedTabIds && pausedTabIds.length > 0 ? pausedTabIds : undefined,
  };
}
