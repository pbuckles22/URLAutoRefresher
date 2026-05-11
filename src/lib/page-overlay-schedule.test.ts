import { describe, it, expect } from 'vitest';
import { DEFAULT_STATE } from './state';
import { getNextFireAtForTab, tabHasActiveRefreshJob } from './page-overlay-schedule';

const tabA = 'https://a.test/';
const tabB = 'https://b.test/';

describe('page-overlay-schedule', () => {
  it('tabHasActiveRefreshJob false when no jobs', () => {
    expect(tabHasActiveRefreshJob(DEFAULT_STATE, tabA)).toBe(false);
  });

  it('detects enabled individual for tab URL', () => {
    const state = {
      ...DEFAULT_STATE,
      individualJobs: [
        {
          id: 'j1',
          target: { targetUrl: tabA },
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: true,
          nextFireAt: 1_700_000_000_000,
        },
      ],
    };
    expect(tabHasActiveRefreshJob(state, tabA)).toBe(true);
    expect(getNextFireAtForTab(state, tabA)).toBe(1_700_000_000_000);
  });

  it('ignores disabled individual', () => {
    const state = {
      ...DEFAULT_STATE,
      individualJobs: [
        {
          id: 'j1',
          target: { targetUrl: tabA },
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: false,
          nextFireAt: 1,
        },
      ],
    };
    expect(tabHasActiveRefreshJob(state, tabA)).toBe(false);
  });

  it('treats overlay-paused individual as inactive for tabHasActiveRefreshJob', () => {
    const state = {
      ...DEFAULT_STATE,
      individualJobs: [
        {
          id: 'j1',
          target: { targetUrl: tabA },
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: true,
          overlayPaused: true,
          nextFireAt: 1_700_000_000_000,
        },
      ],
    };
    expect(tabHasActiveRefreshJob(state, tabA)).toBe(false);
    expect(getNextFireAtForTab(state, tabA)).toBe(undefined);
  });

  it('detects enabled global member by URL', () => {
    const state = {
      ...DEFAULT_STATE,
      globalGroups: [
        {
          id: 'g1',
          name: 'G',
          targets: [{ targetUrl: tabB }],
          baseIntervalSec: 30,
          jitterSec: 0,
          enabled: true,
          nextFireAt: 99,
        },
      ],
    };
    expect(tabHasActiveRefreshJob(state, tabB)).toBe(true);
    expect(getNextFireAtForTab(state, tabB)).toBe(99);
  });
});
