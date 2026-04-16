import { describe, it, expect } from 'vitest';
import { DEFAULT_STATE } from './state';
import { getNextFireAtForTab, tabHasActiveRefreshJob } from './page-overlay-schedule';

describe('page-overlay-schedule', () => {
  it('tabHasActiveRefreshJob false when no jobs', () => {
    expect(tabHasActiveRefreshJob(DEFAULT_STATE, 1)).toBe(false);
  });

  it('detects enabled individual for tab', () => {
    const state = {
      ...DEFAULT_STATE,
      individualJobs: [
        {
          id: 'j1',
          target: { tabId: 7, windowId: 1, targetUrl: 'https://a.test' },
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: true,
          nextFireAt: 1_700_000_000_000,
        },
      ],
    };
    expect(tabHasActiveRefreshJob(state, 7)).toBe(true);
    expect(getNextFireAtForTab(state, 7)).toBe(1_700_000_000_000);
  });

  it('ignores disabled individual', () => {
    const state = {
      ...DEFAULT_STATE,
      individualJobs: [
        {
          id: 'j1',
          target: { tabId: 7, windowId: 1, targetUrl: 'https://a.test' },
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: false,
          nextFireAt: 1,
        },
      ],
    };
    expect(tabHasActiveRefreshJob(state, 7)).toBe(false);
  });

  it('treats overlay-paused individual as inactive for tabHasActiveRefreshJob', () => {
    const state = {
      ...DEFAULT_STATE,
      individualJobs: [
        {
          id: 'j1',
          target: { tabId: 7, windowId: 1, targetUrl: 'https://a.test' },
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: true,
          overlayPaused: true,
          nextFireAt: 1_700_000_000_000,
        },
      ],
    };
    expect(tabHasActiveRefreshJob(state, 7)).toBe(false);
    expect(getNextFireAtForTab(state, 7)).toBe(undefined);
  });

  it('detects enabled global member tab', () => {
    const state = {
      ...DEFAULT_STATE,
      globalGroups: [
        {
          id: 'g1',
          name: 'G',
          targets: [{ tabId: 3, windowId: 1, targetUrl: 'https://b.test' }],
          baseIntervalSec: 30,
          jitterSec: 0,
          enabled: true,
          nextFireAt: 99,
        },
      ],
    };
    expect(tabHasActiveRefreshJob(state, 3)).toBe(true);
    expect(getNextFireAtForTab(state, 3)).toBe(99);
  });
});
