import {
  pickBestOpenTabForMemberTarget,
  type TabPickCandidate,
} from './member-url';
import type { GlobalGroup, ResolvedMemberTab } from './types';
import { isTwitchFavsGroupName, tabUrlMatchesTwitchFavsFavorite } from './twitch-favs';
import { urlMatchesGlob } from './url-glob';

function isHttpUrl(u: string | undefined): boolean {
  if (!u) {
    return false;
  }
  return u.startsWith('http://') || u.startsWith('https://');
}

export type QueryTabsFn = () => Promise<chrome.tabs.Tab[]>;

function tabsToCandidates(tabs: chrome.tabs.Tab[]): TabPickCandidate[] {
  return tabs.map((t) => ({
    id: t.id,
    windowId: t.windowId,
    url: t.url,
    active: t.active,
    index: t.index,
  }));
}

/**
 * Explicit targets (URL-only rows) plus any open http(s) tabs whose URL matches a stored pattern.
 * Each explicit row picks at most one live tab via {@link pickBestOpenTabForMemberTarget}.
 */
export async function resolveGlobalGroupTargets(
  group: GlobalGroup,
  queryTabs: QueryTabsFn = () => chrome.tabs.query({})
): Promise<ResolvedMemberTab[]> {
  let tabs: chrome.tabs.Tab[];
  try {
    tabs = await queryTabs();
  } catch {
    tabs = [];
  }

  const candidates = tabsToCandidates(tabs);

  let lastFocusedWindowId: number | undefined;
  try {
    const w = await chrome.windows.getLastFocused();
    lastFocusedWindowId = w.id;
  } catch {
    lastFocusedWindowId = undefined;
  }

  const byId = new Map<number, ResolvedMemberTab>();

  for (const member of group.targets) {
    const pickedId = pickBestOpenTabForMemberTarget(candidates, member.targetUrl, {
      lastFocusedWindowId,
    });
    if (pickedId === undefined) {
      continue;
    }
    const tab = tabs.find((x) => x.id === pickedId);
    const wid = tab?.windowId;
    const url = tab?.url;
    if (wid === undefined || !isHttpUrl(url)) {
      continue;
    }
    byId.set(pickedId, {
      tabId: pickedId,
      windowId: wid,
      targetUrl: member.targetUrl,
    });
  }

  const patterns = group.urlPatterns?.filter((p) => p.trim()) ?? [];
  if (patterns.length === 0) {
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
      const match = isTwitchFavsGroupName(group.name)
        ? tabUrlMatchesTwitchFavsFavorite(url, pattern)
        : urlMatchesGlob(url, pattern);
      if (match) {
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
