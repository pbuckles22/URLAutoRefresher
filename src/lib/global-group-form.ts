import type { GlobalGroup, TargetRef } from './types';
import type { Result } from './validation';
import { validateHttpUrl, validateIntervalSec, validateJitterSec } from './validation';

export type GlobalGroupFormInput = {
  name: string;
  baseIntervalSec: number;
  jitterSec: number;
  /** One entry per selected tab; duplicate tabId rejected. */
  targets: Array<{ tabId: number; windowId: number; targetUrl: string; label?: string }>;
  /** Newline-separated URL patterns with * wildcards (optional). */
  urlPatternsRaw?: string;
};

/** Edit form: one row per existing explicit tab; patterns edited separately. */
export type GlobalGroupUpdateFormInput = {
  name: string;
  baseIntervalSec: number;
  jitterSec: number;
  targets: Array<{ tabId: number; windowId: number; targetUrl: string; label?: string }>;
  urlPatternsRaw?: string;
};

function parseUrlPatternsRaw(raw: string | undefined): Result<string[]> {
  if (raw === undefined || !raw.trim()) {
    return { ok: true, value: [] };
  }
  const lines = raw.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (!t) {
      continue;
    }
    if (t.length > 200) {
      return { ok: false, error: 'Each URL pattern line must be at most 200 characters' };
    }
    out.push(t);
    if (out.length > 20) {
      return { ok: false, error: 'At most 20 URL patterns' };
    }
  }
  return { ok: true, value: out };
}

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

  const patternsResult = parseUrlPatternsRaw(input.urlPatternsRaw);
  if (!patternsResult.ok) {
    return patternsResult;
  }
  const urlPatterns = patternsResult.value;

  if (input.targets.length < 1 && urlPatterns.length < 1) {
    return { ok: false, error: 'Select at least one tab or add at least one URL pattern' };
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

  const targets: TargetRef[] = [];
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
      ...(urlPatterns.length > 0 ? { urlPatterns } : {}),
      baseIntervalSec: interval.value,
      jitterSec: jitter.value,
      enabled: true,
    },
  };
}

/**
 * Re-validates fields for an existing group (Epic 4.2 edit). Preserves `id`, `enabled`, `nextFireAt`, `pausedTabIds`.
 */
export function buildGlobalGroupUpdateFromForm(
  input: GlobalGroupUpdateFormInput,
  existing: GlobalGroup
): Result<GlobalGroup> {
  const name = input.name.trim();
  if (!name) {
    return { ok: false, error: 'Enter a group name' };
  }

  const patternsResult = parseUrlPatternsRaw(input.urlPatternsRaw);
  if (!patternsResult.ok) {
    return patternsResult;
  }
  const urlPatterns = patternsResult.value;

  const interval = validateIntervalSec(input.baseIntervalSec);
  if (!interval.ok) {
    return interval;
  }
  const jitter = validateJitterSec(input.jitterSec);
  if (!jitter.ok) {
    return jitter;
  }

  const inputByTab = new Map(input.targets.map((t) => [t.tabId, t] as const));
  if (inputByTab.size !== input.targets.length) {
    return { ok: false, error: 'Duplicate tab in form' };
  }

  if (existing.targets.length !== input.targets.length) {
    return { ok: false, error: 'Each tab target must be provided once' };
  }

  const targets: TargetRef[] = [];
  for (const ex of existing.targets) {
    const row = inputByTab.get(ex.tabId);
    if (!row) {
      return { ok: false, error: 'Each tab target must be provided once' };
    }
    const url = validateHttpUrl(row.targetUrl);
    if (!url.ok) {
      return url;
    }
    const label = row.label?.trim();
    targets.push({
      tabId: ex.tabId,
      windowId: ex.windowId,
      targetUrl: url.value,
      ...(label ? { label } : {}),
    });
  }

  if (targets.length < 1 && urlPatterns.length < 1) {
    return { ok: false, error: 'Keep at least one tab or one URL pattern' };
  }

  const next: GlobalGroup = {
    ...existing,
    name,
    targets,
    baseIntervalSec: interval.value,
    jitterSec: jitter.value,
  };

  if (urlPatterns.length > 0) {
    next.urlPatterns = urlPatterns;
  } else {
    delete next.urlPatterns;
  }

  return { ok: true, value: next };
}
