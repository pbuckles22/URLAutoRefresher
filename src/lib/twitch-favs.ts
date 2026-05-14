/**
 * Epic 10.6 — TwitchFavs managed membership (reserved group name).
 * @see doc/requirements/twitch-favs-managed-membership.md
 */

import { memberKeyFromTargetUrl } from './member-url';
import type { AppState, GlobalGroup, TargetRef } from './types';
import type { Result } from './validation';

const RESERVED = 'twitchfavs';
const MAX_TWITCH_FAVS_TOKENS = 20;
const MAX_TOKEN_LEN = 200;

/** Short help for dashboard pattern textarea (TF.8). */
export const TWITCH_FAVS_PATTERN_HINT =
  'TwitchFavs: enter streamer logins or full Twitch URLs (comma or newline). Each becomes https://www.twitch.tv/… for matching.';

export function isTwitchFavsGroupName(name: string): boolean {
  return name.trim().toLowerCase() === RESERVED;
}

/** First path segment of a twitch.tv channel root URL, lowercased, or null. */
export function twitchChannelLoginFromUrl(url: string): string | null {
  try {
    const u = new URL(url.trim());
    if (!/(^|\.)twitch\.tv$/i.test(u.hostname)) {
      return null;
    }
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length !== 1) {
      return null;
    }
    const login = parts[0]!;
    if (!/^[\w]+$/i.test(login)) {
      return null;
    }
    return login.toLowerCase();
  } catch {
    return null;
  }
}

export function canonicalTwitchChannelUrl(loginLower: string): string {
  return `https://www.twitch.tv/${loginLower}`;
}

/** Live tab URL matches a stored TwitchFavs favorite line (canonical https URL). */
export function tabUrlMatchesTwitchFavsFavorite(
  tabUrl: string,
  favoriteCanonicalUrl: string
): boolean {
  const a = twitchChannelLoginFromUrl(tabUrl);
  const b = twitchChannelLoginFromUrl(favoriteCanonicalUrl);
  return a !== null && b !== null && a === b;
}

function expandTwitchFavsToken(token: string): Result<string> {
  const t = token.trim();
  if (!t) {
    return { ok: false, error: 'Empty streamer token' };
  }
  if (t.length > MAX_TOKEN_LEN) {
    return { ok: false, error: `Each entry must be at most ${MAX_TOKEN_LEN} characters` };
  }
  if (/^https?:\/\//i.test(t)) {
    const login = twitchChannelLoginFromUrl(t);
    if (!login) {
      return {
        ok: false,
        error: 'Twitch URL must be a channel root (e.g. https://www.twitch.tv/streamername)',
      };
    }
    return { ok: true, value: canonicalTwitchChannelUrl(login) };
  }
  if (!/^[\w]+$/i.test(t)) {
    return { ok: false, error: 'Streamer names must use letters, numbers, or underscores only' };
  }
  return { ok: true, value: canonicalTwitchChannelUrl(t.toLowerCase()) };
}

/**
 * Parse "names or URLs" textarea: commas and newlines; expand to canonical Twitch URLs; max 20.
 */
export function parseTwitchFavsUrlPatternsRaw(raw: string | undefined): Result<string[]> {
  const tokens: string[] = [];
  for (const line of (raw ?? '').split(/\r?\n/)) {
    for (const part of line.split(',')) {
      const segment = part.trim();
      if (!segment) {
        continue;
      }
      tokens.push(segment);
      if (tokens.length > MAX_TWITCH_FAVS_TOKENS) {
        return { ok: false, error: `At most ${MAX_TWITCH_FAVS_TOKENS} streamers or URLs` };
      }
    }
  }
  if (tokens.length === 0) {
    return { ok: true, value: [] };
  }
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const tok of tokens) {
    const ex = expandTwitchFavsToken(tok);
    if (!ex.ok) {
      return ex;
    }
    const mk = memberKeyFromTargetUrl(ex.value);
    if (!mk) {
      return { ok: false, error: 'Invalid expanded Twitch URL' };
    }
    if (seen.has(mk)) {
      continue;
    }
    seen.add(mk);
    urls.push(ex.value);
  }
  return { ok: true, value: urls };
}

export function twitchFavsFavoriteMemberKeys(canonicalUrls: readonly string[]): Set<string> {
  const keys = new Set<string>();
  for (const u of canonicalUrls) {
    const mk = memberKeyFromTargetUrl(u.trim());
    if (mk) {
      keys.add(mk);
    }
  }
  return keys;
}

function targetRowSig(t: TargetRef): string {
  const mk = memberKeyFromTargetUrl(t.targetUrl.trim()) ?? t.targetUrl.trim();
  return `${mk}\t${t.targetUrl.trim()}\t${(t.label ?? '').trim()}`;
}

function targetListsShallowEqual(a: TargetRef[], b: TargetRef[]): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const sa = [...a].map(targetRowSig).sort();
  const sb = [...b].map(targetRowSig).sort();
  return sa.every((v, i) => v === sb[i]);
}

/**
 * Prune targets not in favorites; dedupe by member key; normalize Twitch URLs to the canonical favorite URL.
 */
export function reconcileTwitchFavsTargets(
  targets: TargetRef[],
  favoriteCanonicalUrls: readonly string[]
): TargetRef[] {
  const favKeys = twitchFavsFavoriteMemberKeys(favoriteCanonicalUrls);
  const canonicalByKey = new Map<string, string>();
  for (const u of favoriteCanonicalUrls) {
    const mk = memberKeyFromTargetUrl(u.trim());
    if (mk && !canonicalByKey.has(mk)) {
      canonicalByKey.set(mk, u.trim());
    }
  }

  const byKey = new Map<string, TargetRef>();
  for (const t of targets) {
    const mk = memberKeyFromTargetUrl(t.targetUrl.trim());
    if (!mk || !favKeys.has(mk)) {
      continue;
    }
    const canon = canonicalByKey.get(mk) ?? t.targetUrl.trim();
    if (!byKey.has(mk)) {
      byKey.set(mk, {
        targetUrl: canon,
        ...(t.label?.trim() ? { label: t.label.trim() } : {}),
      });
    }
  }
  return [...byKey.values()];
}

/**
 * When a tab navigates to a Twitch channel in the managed list, ensure one explicit
 * `TargetRef` per channel (canonical URL). Only **enabled** groups are mutated.
 */
export function applyTwitchFavsUpsertFromTabUrl(
  state: AppState,
  tabUrl: string
): { next: AppState; changed: boolean } {
  const login = twitchChannelLoginFromUrl(tabUrl);
  if (!login) {
    return { next: state, changed: false };
  }

  let changed = false;
  const nextGroups: GlobalGroup[] = [];

  for (const g of state.globalGroups) {
    if (!isTwitchFavsGroupName(g.name) || !g.enabled) {
      nextGroups.push(g);
      continue;
    }

    const patterns = g.urlPatterns ?? [];
    if (patterns.length === 0) {
      nextGroups.push(g);
      continue;
    }

    const favKeys = twitchFavsFavoriteMemberKeys(patterns);
    const canon = canonicalTwitchChannelUrl(login);
    const tabMk = memberKeyFromTargetUrl(canon);
    if (!tabMk || !favKeys.has(tabMk)) {
      nextGroups.push(g);
      continue;
    }

    const mk = tabMk;
    const filtered = g.targets.filter((t) => memberKeyFromTargetUrl(t.targetUrl.trim()) !== mk);
    const nextTargets = [...filtered, { targetUrl: canon }];

    if (targetListsShallowEqual(nextTargets, g.targets)) {
      nextGroups.push(g);
    } else {
      changed = true;
      nextGroups.push({ ...g, targets: nextTargets });
    }
  }

  if (!changed) {
    return { next: state, changed: false };
  }
  return { next: { ...state, globalGroups: nextGroups }, changed: true };
}
