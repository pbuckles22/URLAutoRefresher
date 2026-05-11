import { memberKeyFromTargetUrl, pageMatchesExplicitTarget } from './member-url';
import { resolveGlobalGroupTargets } from './global-group-targets';
import type { AppState } from './types';

function focusedUrlsHitJobTarget(
  focusedTabUrls: ReadonlySet<string>,
  jobTargetUrl: string
): boolean {
  for (const u of focusedTabUrls) {
    if (pageMatchesExplicitTarget(u, jobTargetUrl)) {
      return true;
    }
  }
  return false;
}

/** Collect `nextFireAt` for enabled jobs whose targets match an http(s) URL of a tab in the focused window. */
export async function collectNextFireTimesForTabSet(
  state: AppState,
  focusedTabUrls: ReadonlySet<string>
): Promise<number[]> {
  const out: number[] = [];
  for (const job of state.individualJobs) {
    if (!job.enabled || job.nextFireAt === undefined) {
      continue;
    }
    if (focusedUrlsHitJobTarget(focusedTabUrls, job.target.targetUrl)) {
      out.push(job.nextFireAt);
    }
  }
  for (const g of state.globalGroups) {
    if (!g.enabled) {
      continue;
    }
    const tnf = g.memberNextFireAt;
    if (tnf && Object.keys(tnf).length > 0) {
      const resolved = await resolveGlobalGroupTargets(g);
      const keysForFocused = new Set<string>();
      for (const t of resolved) {
        if (focusedUrlsHitJobTarget(focusedTabUrls, t.targetUrl)) {
          const mk = memberKeyFromTargetUrl(t.targetUrl);
          if (mk) {
            keysForFocused.add(mk);
          }
        }
      }
      for (const mk of keysForFocused) {
        const nf = tnf[mk];
        if (nf !== undefined) {
          out.push(nf);
        }
      }
      continue;
    }
    if (g.nextFireAt !== undefined) {
      const resolved = await resolveGlobalGroupTargets(g);
      if (resolved.some((r) => focusedUrlsHitJobTarget(focusedTabUrls, r.targetUrl))) {
        out.push(g.nextFireAt);
      }
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
    if (!g.enabled) {
      continue;
    }
    const tnf = g.memberNextFireAt;
    if (tnf && Object.keys(tnf).length > 0) {
      out.push(...Object.values(tnf));
    } else if (g.nextFireAt !== undefined) {
      out.push(g.nextFireAt);
    }
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

export async function computeBadgeComputation(
  state: AppState,
  nowMs: number,
  focusedTabUrls: ReadonlySet<string>,
  options: { fallbackWhenFocusedEmpty: boolean }
): Promise<BadgeComputation> {
  const focusedTimes = await collectNextFireTimesForTabSet(state, focusedTabUrls);
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
