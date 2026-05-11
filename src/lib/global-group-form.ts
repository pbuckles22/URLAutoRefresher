import { memberKeyFromTargetUrl } from './member-url';
import type { GlobalGroup, TargetRef } from './types';
import type { Result } from './validation';
import { validateHttpUrl, validateIntervalSec, validateJitterSec } from './validation';

export type GlobalGroupFormInput = {
  name: string;
  baseIntervalSec: number;
  jitterSec: number;
  /** Member rows (URL-first); duplicate member URLs rejected. */
  targets: Array<{ targetUrl: string; label?: string }>;
  /** Newline-separated URL patterns with * wildcards (optional). */
  urlPatternsRaw?: string;
};

/** Edit form: explicit member tabs (add/remove allowed); patterns edited separately. */
export type GlobalGroupUpdateFormInput = {
  name: string;
  baseIntervalSec: number;
  jitterSec: number;
  /** Full membership after edit — order preserved; duplicate member URLs rejected. */
  targets: Array<{ targetUrl: string; label?: string }>;
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

  const interval = validateIntervalSec(input.baseIntervalSec);
  if (!interval.ok) {
    return interval;
  }
  const jitter = validateJitterSec(input.jitterSec);
  if (!jitter.ok) {
    return jitter;
  }

  const seenMk = new Set<string>();
  const targets: TargetRef[] = [];
  for (const t of input.targets) {
    const url = validateHttpUrl(t.targetUrl);
    if (!url.ok) {
      return url;
    }
    const mk = memberKeyFromTargetUrl(url.value);
    if (!mk) {
      return { ok: false, error: 'Invalid member URL' };
    }
    if (seenMk.has(mk)) {
      return { ok: false, error: 'Duplicate member URL in selection' };
    }
    seenMk.add(mk);
    const label = t.label?.trim();
    targets.push({
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

function filterPausedStateForTabs(
  existing: GlobalGroup,
  newTargets: TargetRef[]
): Pick<GlobalGroup, 'pausedMemberKeys' | 'memberNextFireAt'> {
  const remainingKeys = new Set<string>();
  for (const t of newTargets) {
    const mk = memberKeyFromTargetUrl(t.targetUrl);
    if (mk) {
      remainingKeys.add(mk);
    }
  }

  let pausedMemberKeys = existing.pausedMemberKeys?.filter((mk) => remainingKeys.has(mk));
  if (pausedMemberKeys?.length === 0) {
    pausedMemberKeys = undefined;
  }

  let memberNextFireAt = existing.memberNextFireAt;
  if (memberNextFireAt) {
    const next: Record<string, number> = {};
    for (const [k, v] of Object.entries(memberNextFireAt)) {
      if (remainingKeys.has(k)) {
        next[k] = v;
      }
    }
    memberNextFireAt = Object.keys(next).length > 0 ? next : undefined;
  }

  return { pausedMemberKeys, memberNextFireAt };
}

/**
 * Re-validates fields for an existing group (Epic 4.2 edit + backlog 6 add/remove members).
 * Preserves `id`, `enabled`, `nextFireAt` (legacy); filters member-key pause/schedule to remaining targets.
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

  const seenMk = new Set<string>();
  const targets: TargetRef[] = [];
  for (const t of input.targets) {
    const url = validateHttpUrl(t.targetUrl);
    if (!url.ok) {
      return url;
    }
    const mk = memberKeyFromTargetUrl(url.value);
    if (!mk) {
      return { ok: false, error: 'Invalid member URL' };
    }
    if (seenMk.has(mk)) {
      return { ok: false, error: 'Duplicate member URL in form' };
    }
    seenMk.add(mk);
    const label = t.label?.trim();
    targets.push({
      targetUrl: url.value,
      ...(label ? { label } : {}),
    });
  }

  if (targets.length < 1 && urlPatterns.length < 1) {
    return { ok: false, error: 'Keep at least one tab or one URL pattern' };
  }

  const { pausedMemberKeys, memberNextFireAt } = filterPausedStateForTabs(existing, targets);

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

  if (pausedMemberKeys !== undefined) {
    next.pausedMemberKeys = pausedMemberKeys;
  } else {
    delete next.pausedMemberKeys;
  }

  if (memberNextFireAt !== undefined) {
    next.memberNextFireAt = memberNextFireAt;
  } else {
    delete next.memberNextFireAt;
  }

  return { ok: true, value: next };
}
