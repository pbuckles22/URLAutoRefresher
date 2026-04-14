import type { GlobalGroup } from './types';
import type { Result } from './validation';
import { validateHttpUrl, validateIntervalSec, validateJitterSec } from './validation';

export type GlobalGroupFormInput = {
  name: string;
  baseIntervalSec: number;
  jitterSec: number;
  /** One entry per selected tab; duplicate tabId rejected. */
  targets: Array<{ tabId: number; windowId: number; targetUrl: string; label?: string }>;
};

/**
 * Validates dashboard “add global group” from the window/tab browser (Epic 4.1).
 */
export function buildGlobalGroupFromForm(
  input: GlobalGroupFormInput,
  newId: () => string = () => crypto.randomUUID()
): Result<GlobalGroup> {
  const name = input.name.trim();
  if (!name) {
    return { ok: false, error: 'Enter a group name' };
  }
  if (input.targets.length < 1) {
    return { ok: false, error: 'Select at least one tab' };
  }

  const seen = new Set<number>();
  for (const t of input.targets) {
    if (!Number.isInteger(t.tabId) || t.tabId < 1) {
      return { ok: false, error: 'Invalid tab' };
    }
    if (!Number.isInteger(t.windowId) || t.windowId < 0) {
      return { ok: false, error: 'Invalid window' };
    }
    if (seen.has(t.tabId)) {
      return { ok: false, error: `Duplicate tab ${t.tabId} in selection` };
    }
    seen.add(t.tabId);
  }

  const interval = validateIntervalSec(input.baseIntervalSec);
  if (!interval.ok) {
    return interval;
  }
  const jitter = validateJitterSec(input.jitterSec);
  if (!jitter.ok) {
    return jitter;
  }

  const targets: GlobalGroup['targets'] = [];
  for (const t of input.targets) {
    const url = validateHttpUrl(t.targetUrl);
    if (!url.ok) {
      return url;
    }
    const label = t.label?.trim();
    targets.push({
      tabId: t.tabId,
      windowId: t.windowId,
      targetUrl: url.value,
      ...(label ? { label } : {}),
    });
  }

  return {
    ok: true,
    value: {
      id: newId(),
      name,
      targets,
      baseIntervalSec: interval.value,
      jitterSec: jitter.value,
      enabled: true,
    },
  };
}
