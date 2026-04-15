import type { AppState } from './types';

/** Collect `nextFireAt` for enabled jobs whose targets include a tab in `tabIds`. */
export function collectNextFireTimesForTabSet(
  state: AppState,
  tabIds: ReadonlySet<number>
): number[] {
  const out: number[] = [];
  for (const job of state.individualJobs) {
    if (!job.enabled || job.nextFireAt === undefined) {
      continue;
    }
    if (tabIds.has(job.target.tabId)) {
      out.push(job.nextFireAt);
    }
  }
  for (const g of state.globalGroups) {
    if (!g.enabled || g.nextFireAt === undefined || g.targets.length === 0) {
      continue;
    }
    if (g.targets.some((t) => tabIds.has(t.tabId))) {
      out.push(g.nextFireAt);
    }
  }
  return out;
}

export function collectAllScheduledNextFireTimes(state: AppState): number[] {
  const out: number[] = [];
  for (const job of state.individualJobs) {
    if (!job.enabled || job.nextFireAt === undefined) {
      continue;
    }
    out.push(job.nextFireAt);
  }
  for (const g of state.globalGroups) {
    if (!g.enabled || g.nextFireAt === undefined || g.targets.length === 0) {
      continue;
    }
    out.push(g.nextFireAt);
  }
  return out;
}

export function nearestTime(values: readonly number[]): number | undefined {
  if (values.length === 0) {
    return undefined;
  }
  return Math.min(...values);
}

export type BadgeComputation =
  | { kind: 'idle' }
  | { kind: 'countdown'; remainMs: number; source: 'focused' | 'fallback' };

export function computeBadgeComputation(
  state: AppState,
  nowMs: number,
  tabIdsInFocusedWindow: ReadonlySet<number>,
  options: { fallbackWhenFocusedEmpty: boolean }
): BadgeComputation {
  const focusedTimes = collectNextFireTimesForTabSet(state, tabIdsInFocusedWindow);
  let next = nearestTime(focusedTimes);
  if (next !== undefined) {
    return { kind: 'countdown', remainMs: next - nowMs, source: 'focused' };
  }
  if (options.fallbackWhenFocusedEmpty) {
    const all = collectAllScheduledNextFireTimes(state);
    next = nearestTime(all);
    if (next !== undefined) {
      return { kind: 'countdown', remainMs: next - nowMs, source: 'fallback' };
    }
  }
  return { kind: 'idle' };
}

/**
 * Compact label for `chrome.action` badge (~4 visible characters).
 * Matches dashboard m:ss under 10 minutes; otherwise minutes.
 */
export function formatBadgeCountdown(remainMs: number): string {
  if (remainMs <= 0) {
    return '0:00';
  }
  const totalSec = Math.ceil(remainMs / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m < 10) {
    return `${m}:${String(s).padStart(2, '0')}`;
  }
  return `${Math.min(99, m)}m`;
}

export function badgeTextFromComputation(c: BadgeComputation): string {
  if (c.kind === 'idle') {
    return '×';
  }
  return formatBadgeCountdown(c.remainMs);
}
