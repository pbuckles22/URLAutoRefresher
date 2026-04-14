import type { IndividualJob } from './types';
import type { Result } from './validation';
import { validateHttpUrl, validateIntervalSec, validateJitterSec } from './validation';

export type AddIndividualJobInput = {
  tabId: number;
  windowId: number;
  targetUrl: string;
  baseIntervalSec: number;
  jitterSec: number;
};

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
    },
  };
}

/**
 * Re-validates fields for an existing job (Epic 3.2 edit). Preserves `id`, `enabled`, and `nextFireAt`.
 */
export function buildIndividualJobUpdateFromForm(
  input: { targetUrl: string; baseIntervalSec: number; jitterSec: number },
  existing: IndividualJob
): Result<IndividualJob> {
  const base = buildIndividualJobFromForm(
    {
      tabId: existing.target.tabId,
      windowId: existing.target.windowId,
      targetUrl: input.targetUrl,
      baseIntervalSec: input.baseIntervalSec,
      jitterSec: input.jitterSec,
    },
    () => existing.id
  );
  if (!base.ok) {
    return base;
  }
  return {
    ok: true,
    value: {
      ...base.value,
      enabled: existing.enabled,
      nextFireAt: existing.nextFireAt,
    },
  };
}
