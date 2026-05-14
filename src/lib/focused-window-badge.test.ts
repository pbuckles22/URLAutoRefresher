import { describe, expect, it, vi } from 'vitest';
import * as globalGroupTargets from './global-group-targets';
import { memberKeyFromTargetUrl } from './member-url';
import {
  badgeTextFromComputation,
  collectNextFireTimesForTabSet,
  computeBadgeComputation,
  formatBadgeCountdown,
  nearestTime,
} from './focused-window-badge';
import type { AppState } from './types';

const emptyState = (): AppState => ({
  schemaVersion: 3,
  globalGroups: [],
  individualJobs: [],
});

describe('collectNextFireTimesForTabSet', () => {
  it('includes individual job when a focused tab URL matches the job target', async () => {
    const state: AppState = {
      ...emptyState(),
      individualJobs: [
        {
          id: 'a',
          target: { targetUrl: 'https://a.test/' },
          baseIntervalSec: 10,
          jitterSec: 0,
          enabled: true,
          nextFireAt: 1000,
        },
      ],
    };
    await expect(
      collectNextFireTimesForTabSet(state, new Set(['https://a.test/page']))
    ).resolves.toEqual([1000]);
    await expect(
      collectNextFireTimesForTabSet(state, new Set(['https://other.test/']))
    ).resolves.toEqual([]);
  });

  it('includes global group per-member next fire when a resolved tab URL matches', async () => {
    const resolvedMemberUrl = 'https://b/subpath';
    const mk = memberKeyFromTargetUrl(resolvedMemberUrl);
    expect(mk).toBeTruthy();
    vi.spyOn(globalGroupTargets, 'resolveGlobalGroupTargets').mockResolvedValue([
      { tabId: 1, windowId: 1, targetUrl: resolvedMemberUrl },
    ]);
    const state: AppState = {
      ...emptyState(),
      globalGroups: [
        {
          id: 'g',
          name: 'G',
          targets: [{ targetUrl: 'https://a/' }, { targetUrl: 'https://b/' }],
          baseIntervalSec: 10,
          jitterSec: 0,
          enabled: true,
          memberNextFireAt: { [mk!]: 500 },
        },
      ],
    };
    await expect(
      collectNextFireTimesForTabSet(state, new Set(['https://b/subpath']))
    ).resolves.toEqual([500]);
    await expect(collectNextFireTimesForTabSet(state, new Set(['https://c/']))).resolves.toEqual(
      []
    );
    vi.restoreAllMocks();
  });
});

describe('nearestTime', () => {
  it('returns undefined for empty', () => {
    expect(nearestTime([])).toBeUndefined();
  });
});

describe('computeBadgeComputation', () => {
  it('picks nearest nextFire in focused window', async () => {
    const state: AppState = {
      ...emptyState(),
      individualJobs: [
        {
          id: 'a',
          target: { targetUrl: 'https://a/' },
          baseIntervalSec: 10,
          jitterSec: 0,
          enabled: true,
          nextFireAt: 10_000,
        },
        {
          id: 'b',
          target: { targetUrl: 'https://b/' },
          baseIntervalSec: 10,
          jitterSec: 0,
          enabled: true,
          nextFireAt: 3000,
        },
      ],
    };
    const c = await computeBadgeComputation(state, 0, new Set(['https://a/x']), {
      fallbackWhenFocusedEmpty: true,
    });
    expect(c).toEqual({ kind: 'countdown', remainMs: 10_000, source: 'focused' });
  });

  it('uses fallback when focused window has no jobs', async () => {
    const state: AppState = {
      ...emptyState(),
      individualJobs: [
        {
          id: 'b',
          target: { targetUrl: 'https://b/' },
          baseIntervalSec: 10,
          jitterSec: 0,
          enabled: true,
          nextFireAt: 8000,
        },
      ],
    };
    const c = await computeBadgeComputation(state, 0, new Set(['https://other/']), {
      fallbackWhenFocusedEmpty: true,
    });
    expect(c).toEqual({ kind: 'countdown', remainMs: 8000, source: 'fallback' });
  });

  it('idle when nothing scheduled and no fallback match', async () => {
    await expect(
      computeBadgeComputation(emptyState(), 0, new Set(['https://x/']), {
        fallbackWhenFocusedEmpty: true,
      })
    ).resolves.toEqual({ kind: 'idle' });
  });

  it('idle when focused empty and fallback disabled', async () => {
    const state: AppState = {
      ...emptyState(),
      individualJobs: [
        {
          id: 'b',
          target: { targetUrl: 'https://b/' },
          baseIntervalSec: 10,
          jitterSec: 0,
          enabled: true,
          nextFireAt: 8000,
        },
      ],
    };
    const c = await computeBadgeComputation(state, 0, new Set(['https://other/']), {
      fallbackWhenFocusedEmpty: false,
    });
    expect(c).toEqual({ kind: 'idle' });
  });
});

describe('formatBadgeCountdown', () => {
  it('formats sub-10-minute as m:ss', () => {
    expect(formatBadgeCountdown(65_000)).toBe('1:05');
    expect(formatBadgeCountdown(599_000)).toBe('9:59');
  });

  it('formats 10+ minutes as Nm', () => {
    expect(formatBadgeCountdown(600_000)).toBe('10m');
    expect(formatBadgeCountdown(3600_000)).toBe('60m');
    expect(formatBadgeCountdown(99 * 60_000)).toBe('99m');
  });

  it('caps minutes at 99', () => {
    expect(formatBadgeCountdown(120 * 60_000)).toBe('99m');
  });
});

describe('badgeTextFromComputation', () => {
  it('uses × when idle', () => {
    expect(badgeTextFromComputation({ kind: 'idle' })).toBe('×');
  });
});
