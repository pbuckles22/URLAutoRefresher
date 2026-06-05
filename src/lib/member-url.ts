/**
 * Epic 10 — URL-first membership: canonical keys and tab picking from live query results.
 * @see doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md — Epic 10.1
 */

import { urlMatchesGlob } from './url-glob';

/**
 * Stable string identity for a member row derived from `targetUrl` (http/https only).
 * Host is lowercased and stripped of leading `www.`; path is lowercased with trailing `/` removed.
 * Used for storage keys in later stories — align overlay matching via {@link pageMatchesExplicitTarget}.
 */
export function memberKeyFromTargetUrl(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      return null;
    }
    const host = u.hostname.replace(/^www\./i, '').toLowerCase();
    const path = u.pathname.replace(/\/$/, '').toLowerCase();
    return `${host}${path}`;
  } catch {
    return null;
  }
}

/** True when the live tab URL matches a stored explicit member target (handles tabId drift). */
export function pageMatchesExplicitTarget(pageUrl: string | undefined, targetUrl: string): boolean {
  const p = pageUrl?.trim();
  const t = targetUrl.trim();
  if (!p || !t || !/^https?:\/\//i.test(p)) {
    return false;
  }
  if (urlMatchesGlob(p, t)) {
    return true;
  }
  const kp = memberKeyFromTargetUrl(p);
  const kt = memberKeyFromTargetUrl(t);
  if (kp === null || kt === null) {
    return false;
  }
  if (kp === kt) {
    return true;
  }
  /*
   * Site root (e.g. twitch.tv homepage → key `twitch.tv`) must not prefix-match channels.
   * When both sides have a path, only match if one key is a strict path-prefix of the other
   * (channel home ↔ /videos subpath). Unrelated paths (e.g. /videos vs /ninja) do not match.
   */
  const kpHasPath = kp.includes('/');
  const ktHasPath = kt.includes('/');
  if (!kpHasPath || !ktHasPath) {
    return false;
  }
  return kp.startsWith(`${kt}/`) || kt.startsWith(`${kp}/`);
}

/** Minimal tab shape from `chrome.tabs.query` — pure helpers avoid needing the extension runtime in tests. */
export type TabPickCandidate = {
  id?: number;
  windowId?: number;
  url?: string | undefined;
  active?: boolean;
  index?: number;
};

/**
 * Pick one tab id for refresh when several open tabs match the same stored member `targetUrl`.
 *
 * **Rule (Epic 10 product decision, documented for scheduler):**
 * 1. Keep tabs whose URL matches `memberTargetUrl` via {@link pageMatchesExplicitTarget}.
 * 2. If `lastFocusedWindowId` is set and at least one match is in that window, restrict to that window.
 * 3. Prefer the **active** tab in the remaining pool (focus indicator).
 * 4. Otherwise prefer the **lowest `index`** (leftmost tab), then **lowest `tabId`** for a deterministic tie-break.
 *
 * @returns `undefined` when no candidate matches the member URL or no tab has a defined `id`.
 */
export function pickBestOpenTabForMemberTarget(
  candidates: TabPickCandidate[],
  memberTargetUrl: string,
  context?: { lastFocusedWindowId?: number }
): number | undefined {
  const matched = candidates.filter(
    (t) => t.url != null && pageMatchesExplicitTarget(t.url, memberTargetUrl)
  );
  if (matched.length === 0) {
    return undefined;
  }
  if (matched.length === 1) {
    return matched[0].id;
  }

  const wid = context?.lastFocusedWindowId;
  let pool = matched;
  if (wid !== undefined) {
    const inWin = matched.filter((t) => t.windowId === wid);
    if (inWin.length > 0) {
      pool = inWin;
    }
  }

  const withId = pool.filter((t) => t.id !== undefined);
  if (withId.length === 0) {
    return undefined;
  }

  const activeTabs = withId.filter((t) => t.active === true);
  if (activeTabs.length === 1) {
    return activeTabs[0].id;
  }
  const poolForSort = activeTabs.length > 1 ? activeTabs : withId;
  const sorted = [...poolForSort].sort((a, b) => {
    const ia = a.index ?? Number.MAX_SAFE_INTEGER;
    const ib = b.index ?? Number.MAX_SAFE_INTEGER;
    if (ia !== ib) {
      return ia - ib;
    }
    return (a.id ?? Number.MAX_SAFE_INTEGER) - (b.id ?? Number.MAX_SAFE_INTEGER);
  });
  return sorted[0]?.id;
}
