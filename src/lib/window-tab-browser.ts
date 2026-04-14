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
 * One row per tab with a numeric id, sorted by window id then tab index (multi-window browse order).
 */
export function tabRowsFromWindowsSnapshot(windows: ReadonlyArray<WindowTabSnapshot>): TabBrowserRow[] {
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
  return rows;
}
