/**
 * Epic 13.B3 — individual-job tab picker: cached open tabs, select population, search filter,
 * target URL sync when a tab is chosen.
 */
import { resolvePreferredPinTabId } from '../lib/preferred-pin-tab';
import { defaultTargetUrlForTab, pinTabIdFirst } from '../lib/window-tab-browser';
import type { DashboardContext } from './dashboard-shell';

export type TabWithIds = chrome.tabs.Tab & { id: number; windowId: number };

export type IndividualTabPickerCache = {
  tabs: TabWithIds[];
};

export function createIndividualTabPickerCache(): IndividualTabPickerCache {
  return { tabs: [] };
}

export async function refreshIndividualTabPickerCache(
  cache: IndividualTabPickerCache
): Promise<void> {
  const [tabs, pinId] = await Promise.all([chrome.tabs.query({}), resolvePreferredPinTabId()]);
  const withIds = tabs.filter(
    (t): t is TabWithIds => typeof t.id === 'number' && typeof t.windowId === 'number'
  );
  withIds.sort((a, b) => a.windowId - b.windowId || (a.index ?? 0) - (b.index ?? 0));
  cache.tabs = pinTabIdFirst(withIds, pinId);
}

export function applyIndividualTabSelectFilter(
  ctx: DashboardContext,
  cache: IndividualTabPickerCache
): void {
  const { tabSelect, jobTabSearch } = ctx.dom;
  if (!tabSelect) {
    return;
  }
  const q = (jobTabSearch?.value ?? '').trim().toLowerCase();
  const prev = tabSelect.value;
  tabSelect.innerHTML = '<option value="">Select a tab…</option>';
  for (const t of cache.tabs) {
    const label = t.title?.trim() || t.url || `Tab ${t.id}`;
    const url = t.url ?? '';
    const hay = `${label} (${t.id}) ${url}`.toLowerCase();
    if (q !== '' && !hay.includes(q)) {
      continue;
    }
    const opt = document.createElement('option');
    opt.value = String(t.id);
    opt.textContent = `${label} (${t.id})`;
    tabSelect.appendChild(opt);
  }
  const stillValid = prev !== '' && [...tabSelect.options].some((o) => o.value === prev);
  tabSelect.value = stillValid ? prev : '';
}

export async function populateIndividualTabSelect(
  ctx: DashboardContext,
  cache: IndividualTabPickerCache
): Promise<void> {
  await refreshIndividualTabPickerCache(cache);
  if (!ctx.dom.tabSelect) {
    return;
  }
  applyIndividualTabSelectFilter(ctx, cache);
}

/**
 * When the user picks a tab, default Target URL to that tab’s current http(s) URL (from cache).
 * Uses synchronous cache so we don’t race with user edits; use “Refresh tab list” if tabs moved.
 */
export function syncIndividualTargetUrlFromSelectedTab(
  ctx: DashboardContext,
  cache: IndividualTabPickerCache
): void {
  const { tabSelect, urlInput } = ctx.dom;
  if (!tabSelect || !urlInput) {
    return;
  }
  const raw = tabSelect.value;
  if (raw === '') {
    return;
  }
  const tabId = Number(raw);
  if (!Number.isInteger(tabId) || tabId < 1) {
    return;
  }
  const tab = cache.tabs.find((t) => t.id === tabId);
  if (tab) {
    urlInput.value = defaultTargetUrlForTab(tab.url ?? '');
    return;
  }
  void chrome.tabs.get(tabId).then((t) => {
    if (tabSelect?.value !== String(tabId) || !urlInput) {
      return;
    }
    urlInput.value = defaultTargetUrlForTab(t.url ?? '');
  });
}

export function bindIndividualTabPickerUi(
  ctx: DashboardContext,
  cache: IndividualTabPickerCache,
  options?: { afterTabListRefresh?: () => void }
): void {
  const { jobTabSearch, jobTabRefresh, tabSelect } = ctx.dom;

  if (jobTabSearch && jobTabSearch.dataset.filterBound !== '1') {
    jobTabSearch.dataset.filterBound = '1';
    jobTabSearch.addEventListener('input', () => applyIndividualTabSelectFilter(ctx, cache));
  }

  if (jobTabRefresh) {
    jobTabRefresh.addEventListener(
      'click',
      () =>
        void populateIndividualTabSelect(ctx, cache).then(() => options?.afterTabListRefresh?.())
    );
  }

  if (tabSelect && tabSelect.dataset.targetSyncBound !== '1') {
    tabSelect.dataset.targetSyncBound = '1';
    tabSelect.addEventListener('change', () => syncIndividualTargetUrlFromSelectedTab(ctx, cache));
  }
}
