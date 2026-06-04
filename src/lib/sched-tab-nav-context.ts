/** Last committed navigation URL per tab (in-memory; used for raid vs browse-away). */

const lastTabUrlById = new Map<number, string>();

export function getLastTabUrl(tabId: number): string | undefined {
  return lastTabUrlById.get(tabId);
}

export function noteTabUrl(tabId: number, tabUrl: string): void {
  lastTabUrlById.set(tabId, tabUrl.trim());
}

export function forgetLastTabUrl(tabId: number): void {
  lastTabUrlById.delete(tabId);
}

/** @internal test helper */
export function clearLastTabUrls(): void {
  lastTabUrlById.clear();
}
