import type { GlobalGroup, TargetRef } from './types';
import { urlMatchesGlob } from './url-glob';

function isHttpUrl(u: string | undefined): boolean {
  if (!u) {
    return false;
  }
  return u.startsWith('http://') || u.startsWith('https://');
}

export type QueryTabsFn = () => Promise<chrome.tabs.Tab[]>;

/**
 * Explicit targets plus any open http(s) tabs whose URL matches a stored pattern.
 * Explicit rows win when the same tabId appears both ways.
 */
export async function resolveGlobalGroupTargets(
  group: GlobalGroup,
  queryTabs: QueryTabsFn = () => chrome.tabs.query({})
): Promise<TargetRef[]> {
  const byId = new Map<number, TargetRef>();
  for (const t of group.targets) {
    byId.set(t.tabId, t);
  }

  const patterns = group.urlPatterns?.filter((p) => p.trim()) ?? [];
  if (patterns.length === 0) {
    return [...byId.values()];
  }

  let tabs: chrome.tabs.Tab[];
  try {
    tabs = await queryTabs();
  } catch {
    return [...byId.values()];
  }

  for (const tab of tabs) {
    const id = tab.id;
    const wid = tab.windowId;
    const url = tab.url;
    if (id === undefined || wid === undefined || byId.has(id) || !isHttpUrl(url)) {
      continue;
    }
    for (const pattern of patterns) {
      if (urlMatchesGlob(url, pattern)) {
        byId.set(id, { tabId: id, windowId: wid, targetUrl: url });
        break;
      }
    }
  }

  return [...byId.values()];
}

/** True if the group can be scheduled (explicit tabs and/or URL patterns). */
export function globalGroupHasSchedulableConfig(g: GlobalGroup): boolean {
  return g.targets.length > 0 || (g.urlPatterns?.some((p) => p.trim()) ?? false);
}
