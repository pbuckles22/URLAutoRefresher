/**
 * Epic 4.1 — flatten `windows.getAll({ populate: true })` into stable tab rows for the dashboard browser.
 */

export type TabBrowserRow = {
  tabId: number;
  windowId: number;
  index: number;
  title: string;
  url: string;
};

/** Plain snapshot shape for unit tests (no `chrome.*` types required). */
export type WindowTabSnapshot = Readonly<{
  id?: number;
  tabs?: ReadonlyArray<{
    id?: number;
    index?: number;
    title?: string;
    url?: string;
  }>;
}>;

/**
 * Default refresh URL for a tab row: use the tab URL when it is http(s); otherwise empty (user must fill).
 */
export function defaultTargetUrlForTab(url: string): string {
  const u = url.trim();
  if (u.startsWith('http://') || u.startsWith('https://')) {
    return u;
  }
  return '';
}

/**
 * Move an item with `id === pinTabId` to the front (stable relative order otherwise).
 */
export function pinTabIdFirst<T extends { id: number }>(items: readonly T[], pinTabId?: number): T[] {
  if (pinTabId === undefined || pinTabId < 1 || items.length < 2) {
    return [...items];
  }
  const idx = items.findIndex((t) => t.id === pinTabId);
  if (idx <= 0) {
    return [...items];
  }
  const next = [...items];
  const [pinned] = next.splice(idx, 1);
  next.unshift(pinned);
  return next;
}

/**
 * One row per tab with a numeric id, sorted by window id then tab index (multi-window browse order).
 * When `pinTabId` is set and matches a row, that row is listed first (e.g. active tab in last-focused window).
 */
export function tabRowsFromWindowsSnapshot(
  windows: ReadonlyArray<WindowTabSnapshot>,
  pinTabId?: number
): TabBrowserRow[] {
  const rows: TabBrowserRow[] = [];
  for (const w of windows) {
    const wid = w.id;
    if (typeof wid !== 'number' || wid < 0) {
      continue;
    }
    const tabs = w.tabs ?? [];
    for (const tab of tabs) {
      const tid = tab.id;
      if (typeof tid !== 'number') {
        continue;
      }
      rows.push({
        tabId: tid,
        windowId: wid,
        index: typeof tab.index === 'number' ? tab.index : 0,
        title: tab.title?.trim() ?? '',
        url: tab.url ?? '',
      });
    }
  }
  rows.sort((a, b) => a.windowId - b.windowId || a.index - b.index);
  if (pinTabId === undefined || pinTabId < 1) {
    return rows;
  }
  const pinIdx = rows.findIndex((r) => r.tabId === pinTabId);
  if (pinIdx <= 0) {
    return rows;
  }
  const next = [...rows];
  const [pinned] = next.splice(pinIdx, 1);
  next.unshift(pinned);
  return next;
}
