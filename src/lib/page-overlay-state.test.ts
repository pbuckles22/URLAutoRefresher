import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_PREFS } from './prefs';
import { DEFAULT_STATE } from './state';
import { getPageOverlayVmForTab } from './page-overlay-state';

vi.mock('./global-group-targets', () => ({
  resolveGlobalGroupTargets: vi.fn(async (g: { id: string }) => {
    if (g.id === 'g1') {
      return [{ tabId: 4, windowId: 1, targetUrl: 'https://b.test' }];
    }
    return [];
  }),
}));

describe('getPageOverlayVmForTab', () => {
  it('returns paused when tab is in paused list', async () => {
    const state = {
      ...DEFAULT_STATE,
      globalGroups: [
        {
          id: 'g1',
          name: 'G',
          targets: [{ tabId: 4, windowId: 1, targetUrl: 'https://b.test' }],
          pausedTabIds: [4],
          baseIntervalSec: 30,
          jitterSec: 0,
          enabled: true,
          nextFireAt: 42,
        },
      ],
    };
    const vm = await getPageOverlayVmForTab(state, DEFAULT_PREFS, 4);
    expect(vm).toEqual({ show: true, mode: 'paused', globalGroupId: 'g1' });
  });

  it('returns paused for individual job when overlayPaused', async () => {
    const state = {
      ...DEFAULT_STATE,
      individualJobs: [
        {
          id: 'i1',
          target: { tabId: 4, windowId: 1, targetUrl: 'https://twitch.tv/x' },
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: true,
          overlayPaused: true,
        },
      ],
    };
    const vm = await getPageOverlayVmForTab(state, DEFAULT_PREFS, 4);
    expect(vm).toEqual({ show: true, mode: 'paused', individualJobId: 'i1' });
  });

  it('timer mode includes individualJobId for enabled individual job', async () => {
    const state = {
      ...DEFAULT_STATE,
      individualJobs: [
        {
          id: 'i1',
          target: { tabId: 4, windowId: 1, targetUrl: 'https://twitch.tv/x' },
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: true,
          nextFireAt: 99,
        },
      ],
    };
    const vm = await getPageOverlayVmForTab(state, DEFAULT_PREFS, 4);
    expect(vm).toEqual({
      show: true,
      mode: 'timer',
      nextFireAt: 99,
      individualJobId: 'i1',
    });
  });
});
