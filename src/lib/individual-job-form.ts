import {
  BLIP_MAX_REGEX_LEN,
  compileBlipRegex,
  normalizeBlipPhrasesFromTextarea,
} from './blip-match';
import type { IndividualJob } from './types';
import type { Result } from './validation';
import { validateHttpUrl, validateIntervalSec, validateJitterSec } from './validation';

export type AddIndividualJobInput = {
  tabId: number;
  windowId: number;
  targetUrl: string;
  baseIntervalSec: number;
  jitterSec: number;
  /** Epic 8: pause refresh while Twitch reports live (twitch.tv channel pages). */
  liveAwareRefresh?: boolean;
  /** Epic 9: newline-separated phrases (optional). */
  blipWatchPhrasesText?: string;
  /** Epic 9: optional regex pattern. */
  blipWatchRegex?: string;
};

function parseBlipFields(
  phrasesText: string | undefined,
  regexRaw: string | undefined
): Result<{ blipWatchPhrases?: string[]; blipWatchRegex?: string }> {
  const phrases = normalizeBlipPhrasesFromTextarea(phrasesText);
  const rx = regexRaw?.trim() ?? '';
  if (phrases.length === 0 && !rx) {
    return { ok: true, value: {} };
  }
  if (rx && !compileBlipRegex(rx)) {
    return { ok: false, error: 'Invalid blip regex pattern' };
  }
  const out: { blipWatchPhrases?: string[]; blipWatchRegex?: string } = {};
  if (phrases.length > 0) {
    out.blipWatchPhrases = phrases;
  }
  if (rx) {
    out.blipWatchRegex = rx.slice(0, BLIP_MAX_REGEX_LEN);
  }
  return { ok: true, value: out };
}

/**
 * Validates dashboard “add individual job” fields and returns a new job (Epic 3.1).
 * Caller merges into `AppState` and calls `saveAppState`.
 */
export function buildIndividualJobFromForm(
  input: AddIndividualJobInput,
  newId: () => string = () => crypto.randomUUID()
): Result<IndividualJob> {
  if (!Number.isInteger(input.tabId) || input.tabId < 1) {
    return { ok: false, error: 'Pick a tab' };
  }
  if (!Number.isInteger(input.windowId) || input.windowId < 0) {
    return { ok: false, error: 'Invalid window' };
  }

  const url = validateHttpUrl(input.targetUrl);
  if (!url.ok) {
    return url;
  }
  const interval = validateIntervalSec(input.baseIntervalSec);
  if (!interval.ok) {
    return interval;
  }
  const jitter = validateJitterSec(input.jitterSec);
  if (!jitter.ok) {
    return jitter;
  }

  const liveAware = Boolean(input.liveAwareRefresh);
  const blip = parseBlipFields(input.blipWatchPhrasesText, input.blipWatchRegex);
  if (!blip.ok) {
    return blip;
  }
  return {
    ok: true,
    value: {
      id: newId(),
      target: {
        tabId: input.tabId,
        windowId: input.windowId,
        targetUrl: url.value,
      },
      baseIntervalSec: interval.value,
      jitterSec: jitter.value,
      enabled: true,
      ...(liveAware ? { liveAwareRefresh: true } : {}),
      ...blip.value,
    },
  };
}

/**
 * Re-validates fields for an existing job (Epic 3.2 edit). Preserves `id`, `enabled`, and `nextFireAt`.
 */
export function buildIndividualJobUpdateFromForm(
  input: {
    targetUrl: string;
    baseIntervalSec: number;
    jitterSec: number;
    liveAwareRefresh?: boolean;
    blipWatchPhrasesText?: string;
    blipWatchRegex?: string;
  },
  existing: IndividualJob
): Result<IndividualJob> {
  const base = buildIndividualJobFromForm(
    {
      tabId: existing.target.tabId,
      windowId: existing.target.windowId,
      targetUrl: input.targetUrl,
      baseIntervalSec: input.baseIntervalSec,
      jitterSec: input.jitterSec,
      liveAwareRefresh: input.liveAwareRefresh,
      blipWatchPhrasesText: input.blipWatchPhrasesText,
      blipWatchRegex: input.blipWatchRegex,
    },
    () => existing.id
  );
  if (!base.ok) {
    return base;
  }
  const liveAware = Boolean(input.liveAwareRefresh);
  const value: IndividualJob = {
    id: base.value.id,
    target: base.value.target,
    baseIntervalSec: base.value.baseIntervalSec,
    jitterSec: base.value.jitterSec,
    enabled: existing.enabled,
    nextFireAt: existing.nextFireAt,
  };
  if (liveAware) {
    value.liveAwareRefresh = true;
    value.streamLive = existing.streamLive;
  }
  const ph = base.value.blipWatchPhrases;
  const rx = base.value.blipWatchRegex;
  if ((ph?.length ?? 0) > 0 || rx) {
    if (ph?.length) {
      value.blipWatchPhrases = ph;
    }
    if (rx) {
      value.blipWatchRegex = rx;
    }
    if (existing.blipMaxPerMinute !== undefined) {
      value.blipMaxPerMinute = existing.blipMaxPerMinute;
    }
  }
  return { ok: true, value };
}
