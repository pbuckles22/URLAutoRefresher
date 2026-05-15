/**
 * Pick a “pin” tab id for dashboard tab lists: prefer the active http(s) tab in the
 * last-focused window, else the first schedulable http(s) tab there (Epic 5 / shared UI).
 */

export function isSchedulableWebUrl(url: string | undefined): boolean {
  const u = (url ?? '').trim();
  return u.startsWith('http://') || u.startsWith('https://');
}

/** Active tab in last-focused window when it is a normal page; else first http(s) tab in that window. */
export async function resolvePreferredPinTabId(): Promise<number | undefined> {
  try {
    const win = await chrome.windows.getLastFocused({ populate: true });
    const tabs = win.tabs ?? [];
    const active = tabs.find((t) => t.active);
    if (active?.id !== undefined && isSchedulableWebUrl(active.url)) {
      return active.id;
    }
    const sorted = [...tabs].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
    for (const t of sorted) {
      if (t.id !== undefined && isSchedulableWebUrl(t.url)) {
        return t.id;
      }
    }
  } catch {
    /* ignore */
  }
  return undefined;
}
