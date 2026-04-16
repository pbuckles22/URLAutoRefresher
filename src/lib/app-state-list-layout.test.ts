import { describe, expect, it } from 'vitest';
import { appStateListLayoutEqual, onlyNonLayoutAppStateDiff } from './app-state-list-layout';
import type { AppState } from './types';

const base: AppState = {
  schemaVersion: 1,
  globalGroups: [],
  individualJobs: [
    {
      id: 'j1',
      target: { tabId: 1, windowId: 1, targetUrl: 'https://a.test' },
      baseIntervalSec: 60,
      jitterSec: 0,
      enabled: true,
      nextFireAt: 100,
    },
  ],
};

describe('app-state-list-layout', () => {
  it('treats nextFireAt-only change as non-layout', () => {
    const next: AppState = {
      ...base,
      individualJobs: [{ ...base.individualJobs[0]!, nextFireAt: 999 }],
    };
    expect(appStateListLayoutEqual(base, next)).toBe(true);
    expect(onlyNonLayoutAppStateDiff(base, next)).toBe(true);
  });

  it('treats streamLive-only change as non-layout', () => {
    const next: AppState = {
      ...base,
      individualJobs: [{ ...base.individualJobs[0]!, liveAwareRefresh: true, streamLive: true }],
    };
    const prev: AppState = {
      ...base,
      individualJobs: [{ ...base.individualJobs[0]!, liveAwareRefresh: true, streamLive: false }],
    };
    expect(appStateListLayoutEqual(prev, next)).toBe(true);
    expect(onlyNonLayoutAppStateDiff(prev, next)).toBe(true);
  });

  it('detects targetUrl change as layout change', () => {
    const next: AppState = {
      ...base,
      individualJobs: [
        {
          ...base.individualJobs[0]!,
          target: { ...base.individualJobs[0]!.target, targetUrl: 'https://b.test' },
        },
      ],
    };
    expect(appStateListLayoutEqual(base, next)).toBe(false);
    expect(onlyNonLayoutAppStateDiff(base, next)).toBe(false);
  });

  it('returns false when old or new is undefined', () => {
    expect(onlyNonLayoutAppStateDiff(undefined, base)).toBe(false);
    expect(onlyNonLayoutAppStateDiff(base, undefined)).toBe(false);
  });
});
