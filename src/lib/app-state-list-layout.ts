/**
 * Detect when AppState changed only in fields that do not affect list row structure
 * (e.g. nextFireAt from the scheduler). Dashboard uses this to avoid nuking the DOM
 * on every alarm tick — Playwright and users editing <details> need stable rows.
 */
import type { AppState } from './types';

function individualJobsLayoutSignature(s: AppState): string {
  return JSON.stringify(
    s.individualJobs.map((j) => ({
      id: j.id,
      target: j.target,
      baseIntervalSec: j.baseIntervalSec,
      jitterSec: j.jitterSec,
      enabled: j.enabled,
    }))
  );
}

function globalGroupsLayoutSignature(s: AppState): string {
  return JSON.stringify(
    s.globalGroups.map((g) => ({
      id: g.id,
      name: g.name,
      targets: g.targets,
      baseIntervalSec: g.baseIntervalSec,
      jitterSec: g.jitterSec,
      enabled: g.enabled,
    }))
  );
}

/** True when both states have the same list "shape" (ignore nextFireAt, etc.). */
export function appStateListLayoutEqual(a: AppState, b: AppState): boolean {
  if (a.schemaVersion !== b.schemaVersion) {
    return false;
  }
  return (
    individualJobsLayoutSignature(a) === individualJobsLayoutSignature(b) &&
    globalGroupsLayoutSignature(a) === globalGroupsLayoutSignature(b)
  );
}

/**
 * True if the storage change only updated non-layout fields (safe to skip full list re-render).
 * When old or new is missing/invalid, returns false so callers re-render.
 */
export function onlyNonLayoutAppStateDiff(oldVal: unknown, newVal: unknown): boolean {
  if (oldVal === undefined || newVal === undefined) {
    return false;
  }
  const a = oldVal as AppState;
  const b = newVal as AppState;
  if (
    typeof a !== 'object' ||
    typeof b !== 'object' ||
    !Array.isArray(a.individualJobs) ||
    !Array.isArray(b.individualJobs) ||
    !Array.isArray(a.globalGroups) ||
    !Array.isArray(b.globalGroups)
  ) {
    return false;
  }
  return appStateListLayoutEqual(a, b);
}
