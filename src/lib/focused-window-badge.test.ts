import { describe, expect, it } from 'vitest';
import {
  badgeTextFromComputation,
  collectNextFireTimesForTabSet,
  computeBadgeComputation,
  formatBadgeCountdown,
  nearestTime,
} from './focused-window-badge';
import type { AppState } from './types';

const emptyState = (): AppState => ({
  schemaVersion: 1,
  globalGroups: [],
  individualJobs: [],
});

describe('collectNextFireTimesForTabSet', () => {
  it('includes individual job when tab is in set', () => {
    const state: AppState = {
      ...emptyState(),
      individualJobs: [
        {
          id: 'a',
          target: { tabId: 5, windowId: 1, targetUrl: 'https://a.test' },
          baseIntervalSec: 10,
          jitterSec: 0,
          enabled: true,
          nextFireAt: 1000,
        },
      ],
    };
    expect(collectNextFireTimesForTabSet(state, new Set([5]))).toEqual([1000]);
    expect(collectNextFireTimesForTabSet(state, new Set([9]))).toEqual([]);
  });

  it('includes global group when any target tab is in set', () => {
    const state: AppState = {
      ...emptyState(),
      globalGroups: [
        {
          id: 'g',
          name: 'G',
          targets: [
            { tabId: 1, windowId: 1, targetUrl: 'https://a/' },
            { tabId: 2, windowId: 1, targetUrl: 'https://b/' },
          ],
          baseIntervalSec: 10,
          jitterSec: 0,
          enabled: true,
          nextFireAt: 500,
        },
      ],
    };
    expect(collectNextFireTimesForTabSet(state, new Set([2]))).toEqual([500]);
    expect(collectNextFireTimesForTabSet(state, new Set([3]))).toEqual([]);
  });
});

describe('nearestTime', () => {
  it('returns undefined for empty', () => {
    expect(nearestTime([])).toBeUndefined();
  });
});

describe('computeBadgeComputation', () => {
  it('picks nearest nextFire in focused window', () => {
    const state: AppState = {
      ...emptyState(),
      individualJobs: [
        {
          id: 'a',
          target: { tabId: 1, windowId: 1, targetUrl: 'https://a/' },
          baseIntervalSec: 10,
          jitterSec: 0,
          enabled: true,
          nextFireAt: 10_000,
        },
        {
          id: 'b',
          target: { tabId: 2, windowId: 2, targetUrl: 'https://b/' },
          baseIntervalSec: 10,
          jitterSec: 0,
          enabled: true,
          nextFireAt: 3000,
        },
      ],
    };
    const c = computeBadgeComputation(state, 0, new Set([1]), { fallbackWhenFocusedEmpty: true });
    expect(c).toEqual({ kind: 'countdown', remainMs: 10_000, source: 'focused' });
  });

  it('uses fallback when focused window has no jobs', () => {
    const state: AppState = {
      ...emptyState(),
      individualJobs: [
        {
          id: 'b',
          target: { tabId: 2, windowId: 2, targetUrl: 'https://b/' },
          baseIntervalSec: 10,
          jitterSec: 0,
          enabled: true,
          nextFireAt: 8000,
        },
      ],
    };
    const c = computeBadgeComputation(state, 0, new Set([99]), { fallbackWhenFocusedEmpty: true });
    expect(c).toEqual({ kind: 'countdown', remainMs: 8000, source: 'fallback' });
  });

  it('idle when nothing scheduled and no fallback match', () => {
    expect(
      computeBadgeComputation(emptyState(), 0, new Set([1]), { fallbackWhenFocusedEmpty: true })
    ).toEqual({ kind: 'idle' });
  });

  it('idle when focused empty and fallback disabled', () => {
    const state: AppState = {
      ...emptyState(),
      individualJobs: [
        {
          id: 'b',
          target: { tabId: 2, windowId: 2, targetUrl: 'https://b/' },
          baseIntervalSec: 10,
          jitterSec: 0,
          enabled: true,
          nextFireAt: 8000,
        },
      ],
    };
    const c = computeBadgeComputation(state, 0, new Set([99]), { fallbackWhenFocusedEmpty: false });
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
