import type { PageOverlayBlipPack } from './messages';
import { pageMatchesExplicitTarget } from './member-url';
import type { AppState } from './types';
import { BLIP_MAX_REGEX_LEN } from './blip-match';

/** Enabled individual job on this page URL with at least one blip trigger configured (Epic 9). */
export function getBlipWatchForTab(state: AppState, tabUrl: string | undefined): PageOverlayBlipPack | undefined {
  if (!tabUrl) {
    return undefined;
  }
  for (const j of state.individualJobs) {
    if (!j.enabled || !pageMatchesExplicitTarget(tabUrl, j.target.targetUrl)) {
      continue;
    }
    const phrases = j.blipWatchPhrases ?? [];
    const rx = j.blipWatchRegex?.trim();
    if (phrases.length === 0 && !rx) {
      return undefined;
    }
    const maxPerMinute = j.blipMaxPerMinute;
    const capped =
      typeof maxPerMinute === 'number' && Number.isInteger(maxPerMinute)
        ? Math.min(30, Math.max(1, maxPerMinute))
        : 8;
    return {
      phrases: [...phrases],
      ...(rx ? { regex: rx.slice(0, BLIP_MAX_REGEX_LEN) } : {}),
      targetUrl: j.target.targetUrl,
      maxPerMinute: capped,
    };
  }
  return undefined;
}
