import { BLIP_MAX_PHRASE_LEN, BLIP_MAX_PHRASES, BLIP_MAX_REGEX_LEN, compileBlipRegex } from './blip-match';
import { memberKeyFromTargetUrl } from './member-url';
import type { AppState, GlobalGroup } from './types';
import type { Err, Ok, Result } from './validation';
import { validateHttpUrl, validateIntervalSec, validateJitterSec } from './validation';

export type { AppState, GlobalGroup, IndividualJob, TargetRef } from './types';

const CURRENT_SCHEMA = 2;

export const DEFAULT_STATE: AppState = {
  schemaVersion: CURRENT_SCHEMA,
  globalGroups: [],
  individualJobs: [],
};

function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}
function err(error: string): Err {
  return { ok: false, error };
}

function mergeMemberFireAt(map: Record<string, number>, key: string, val: number): void {
  const p = map[key];
  map[key] = p === undefined ? val : Math.min(p, val);
}

type LegacyGlobalGroup = GlobalGroup & {
  pausedTabIds?: number[];
  tabNextFireAt?: Record<string, number>;
};

/**
 * Epic 10.3: merge legacy tab-id `tabNextFireAt` / `pausedTabIds` into member-key fields; strip legacy keys.
 * Exported for unit tests.
 */
export function normalizeGlobalGroup(raw: Record<string, unknown>): GlobalGroup {
  const g = raw as LegacyGlobalGroup;
  const targets = Array.isArray(raw.targets) ? (raw.targets as GlobalGroup['targets']) : [];

  const memberNextFireAt: Record<string, number> = { ...(g.memberNextFireAt ?? {}) };

  for (const [k, v] of Object.entries(g.tabNextFireAt ?? {})) {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      continue;
    }
    if (/^\d+$/.test(k)) {
      const tid = Number(k);
      const target = targets.find((t) => t.tabId === tid);
      if (target) {
        const mk = memberKeyFromTargetUrl(target.targetUrl);
        if (mk) {
          mergeMemberFireAt(memberNextFireAt, mk, v);
        }
      }
    }
  }

  const pausedMemberKeys = new Set<string>();
  for (const s of g.pausedMemberKeys ?? []) {
    if (typeof s === 'string' && s.length > 0 && s.length <= 2048) {
      pausedMemberKeys.add(s);
    }
  }
  for (const id of g.pausedTabIds ?? []) {
    if (!Number.isInteger(id) || id < 1) {
      continue;
    }
    const target = targets.find((t) => t.tabId === id);
    if (target) {
      const mk = memberKeyFromTargetUrl(target.targetUrl);
      if (mk) {
        pausedMemberKeys.add(mk);
      }
    }
  }

  const {
    pausedTabIds: _pt,
    tabNextFireAt: _tnf,
    memberNextFireAt: _mn0,
    pausedMemberKeys: _pm0,
    targets: _tg,
    ...rest
  } = g;

  return {
    ...rest,
    targets,
    ...(Object.keys(memberNextFireAt).length > 0 ? { memberNextFireAt } : {}),
    ...(pausedMemberKeys.size > 0 ? { pausedMemberKeys: [...pausedMemberKeys].sort() } : {}),
  } as GlobalGroup;
}

/** Normalize and validate persisted JSON from chrome.storage. */
export function parseStoredPayload(value: unknown): AppState {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...DEFAULT_STATE };
  }
  const o = value as Record<string, unknown>;
  const sv = o.schemaVersion;
  if (typeof sv !== 'number' || (sv !== 1 && sv !== CURRENT_SCHEMA)) {
    return { ...DEFAULT_STATE };
  }
  if (!Array.isArray(o.globalGroups) || !Array.isArray(o.individualJobs)) {
    return { ...DEFAULT_STATE };
  }
  const globalGroups = (o.globalGroups as unknown[]).map((g) =>
    normalizeGlobalGroup(g as Record<string, unknown>)
  );
  return {
    schemaVersion: CURRENT_SCHEMA,
    globalGroups,
    individualJobs: o.individualJobs as AppState['individualJobs'],
  };
}

export function validateUniqueIds(state: AppState): Result<void> {
  const seen = new Set<string>();
  for (const g of state.globalGroups) {
    if (seen.has(g.id)) {
      return err(`Duplicate id: ${g.id}`);
    }
    seen.add(g.id);
  }
  for (const j of state.individualJobs) {
    if (seen.has(j.id)) {
      return err(`Duplicate id: ${j.id}`);
    }
    seen.add(j.id);
  }
  return ok(undefined);
}

export function validateGlobalGroupTargets(group: GlobalGroup): Result<void> {
  const tabs = new Set<number>();
  for (const t of group.targets) {
    if (tabs.has(t.tabId)) {
      return err(`Duplicate tabId ${t.tabId} in global group ${group.id}`);
    }
    tabs.add(t.tabId);
  }
  return ok(undefined);
}

/**
 * Enabled jobs only: a tab may appear in at most one enabled global group
 * or one enabled individual job, never both.
 */
export function validateEnabledEnrollment(state: AppState): Result<void> {
  const map = new Map<number, string>();

  for (const g of state.globalGroups) {
    if (!g.enabled) {
      continue;
    }
    const inner = validateGlobalGroupTargets(g);
    if (!inner.ok) {
      return inner;
    }
    for (const t of g.targets) {
      const prev = map.get(t.tabId);
      if (prev) {
        return err(
          `Tab ${t.tabId} is already in another enabled global group. Disable or remove the other group, or remove this tab from one of the groups.`
        );
      }
      map.set(t.tabId, `global "${g.id}"`);
    }
  }

  for (const j of state.individualJobs) {
    if (!j.enabled) {
      continue;
    }
    const prev = map.get(j.target.tabId);
    if (prev) {
      if (prev.startsWith('global')) {
        return err(
          `Tab ${j.target.tabId} cannot be in an enabled global group and an enabled individual job at the same time. Stop or delete one of them, or turn off one schedule, before enabling the other.`
        );
      }
      return err(
        `Tab ${j.target.tabId} already has another enabled individual refresh job. Stop or delete the other job first.`
      );
    }
    map.set(j.target.tabId, `individual "${j.id}"`);
  }

  return ok(undefined);
}

/** Validate URLs and intervals on a full state (for save / UI). */
export function validateStateFields(state: AppState): Result<void> {
  for (const g of state.globalGroups) {
    const ji = validateIntervalSec(g.baseIntervalSec);
    if (!ji.ok) {
      return err(ji.error);
    }
    const jj = validateJitterSec(g.jitterSec);
    if (!jj.ok) {
      return err(jj.error);
    }
    for (const t of g.targets) {
      const ju = validateHttpUrl(t.targetUrl);
      if (!ju.ok) {
        return err(ju.error);
      }
    }
    const pats = g.urlPatterns;
    if (pats !== undefined) {
      if (!Array.isArray(pats) || pats.length > 20) {
        return err('Invalid global group URL patterns');
      }
      for (const p of pats) {
        if (typeof p !== 'string' || p.length === 0 || p.length > 200) {
          return err('Invalid global group URL pattern');
        }
      }
    }
    const paused = g.pausedMemberKeys;
    if (paused !== undefined) {
      if (!Array.isArray(paused)) {
        return err('Invalid paused member key list');
      }
      for (const key of paused) {
        if (typeof key !== 'string' || key.length === 0 || key.length > 2048) {
          return err('Invalid paused member key');
        }
      }
    }
    const tnf = g.memberNextFireAt;
    if (tnf !== undefined) {
      if (typeof tnf !== 'object' || tnf === null || Array.isArray(tnf)) {
        return err('Invalid global group member schedule');
      }
      for (const [k, v] of Object.entries(tnf)) {
        if (typeof k !== 'string' || k.length === 0 || k.length > 2048) {
          return err('Invalid global group member schedule entry key');
        }
        if (typeof v !== 'number' || !Number.isFinite(v)) {
          return err('Invalid global group member schedule entry');
        }
      }
    }
  }
  for (const j of state.individualJobs) {
    const ji = validateIntervalSec(j.baseIntervalSec);
    if (!ji.ok) {
      return err(ji.error);
    }
    const jj = validateJitterSec(j.jitterSec);
    if (!jj.ok) {
      return err(jj.error);
    }
    const ju = validateHttpUrl(j.target.targetUrl);
    if (!ju.ok) {
      return err(ju.error);
    }
    if (j.overlayPaused !== undefined && typeof j.overlayPaused !== 'boolean') {
      return err('Invalid individual job overlay pause flag');
    }
    const phrases = j.blipWatchPhrases;
    if (phrases !== undefined) {
      if (!Array.isArray(phrases) || phrases.length > BLIP_MAX_PHRASES) {
        return err('Invalid blip phrases');
      }
      for (const p of phrases) {
        if (typeof p !== 'string' || p.length === 0 || p.length > BLIP_MAX_PHRASE_LEN) {
          return err('Invalid blip phrase');
        }
      }
    }
    const br = j.blipWatchRegex;
    if (br !== undefined && br.trim()) {
      if (typeof br !== 'string' || br.length > BLIP_MAX_REGEX_LEN) {
        return err('Invalid blip regex length');
      }
      if (!compileBlipRegex(br)) {
        return err('Invalid blip regex');
      }
    }
    const bmp = j.blipMaxPerMinute;
    if (bmp !== undefined && (!Number.isInteger(bmp) || bmp < 1 || bmp > 30)) {
      return err('Blip max per minute must be 1–30');
    }
  }
  return ok(undefined);
}
