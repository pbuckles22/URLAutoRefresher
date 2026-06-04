import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_STATE } from './state';
import {
  formatOverlayDebugLines,
  getPageOverlaySnapBackDebug,
  type OverlayDebugDeps,
} from './page-overlay-debug';

describe('getPageOverlaySnapBackDebug', () => {
  const deps: OverlayDebugDeps = {
    resolveLiveTabId: vi.fn(async () => 99),
    queryTabs: vi.fn(async () => [
      { id: 4, url: 'https://www.twitch.tv/ninja' },
      { id: 99, url: 'https://www.twitch.tv/ninja/' },
    ]),
  };

  it('returns debug for global member matched by page URL', async () => {
    const state = {
      ...DEFAULT_STATE,
      globalGroups: [
        {
          id: 'g1',
          name: 'TwitchFavs',
          targets: [{ targetUrl: 'https://www.twitch.tv/ninja' }],
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: true,
        },
      ],
    };
    const d = await getPageOverlaySnapBackDebug(state, 4, 'https://www.twitch.tv/ninja', deps);
    expect(d).toMatchObject({
      thisTabId: 4,
      refreshTargetUrl: 'https://www.twitch.tv/ninja',
      schedulerTabId: 99,
      schedulerUsesThisTab: false,
      pageMatchesTarget: true,
      memberKey: 'twitch.tv/ninja',
      matchingOpenTabIds: [4, 99],
    });
  });

  it('marks schedulerUsesThisTab when pick matches sender', async () => {
    const pickDeps: OverlayDebugDeps = {
      ...deps,
      resolveLiveTabId: vi.fn(async () => 4),
    };
    const state = {
      ...DEFAULT_STATE,
      individualJobs: [
        {
          id: 'j1',
          target: { targetUrl: 'https://a.test/' },
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: true,
        },
      ],
    };
    const d = await getPageOverlaySnapBackDebug(state, 4, 'https://a.test/x', pickDeps);
    expect(d?.schedulerUsesThisTab).toBe(true);
    expect(d?.memberKey).toBeUndefined();
  });
});

describe('formatOverlayDebugLines', () => {
  it('includes snap-live hint and drift line', () => {
    const lines = formatOverlayDebugLines({
      thisTabId: 4,
      pageUrl: 'https://www.twitch.tv/other',
      refreshTargetUrl: 'https://www.twitch.tv/ninja',
      schedulerTabId: 99,
      schedulerUsesThisTab: false,
      pageMatchesTarget: false,
      memberKey: 'twitch.tv/ninja',
      matchingOpenTabIds: [4, 99],
    });
    expect(lines[0]).toContain('Tab 4');
    expect(lines[0]).toContain('Sched 99');
    expect(lines[0]).toContain('other tab');
    expect(lines.some((l) => l.includes('Page URL'))).toBe(true);
  });
});
