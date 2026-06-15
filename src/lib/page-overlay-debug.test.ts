import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_STATE } from './state';
import {
  formatLastRefreshLine,
  formatOverlayDebugLines,
  getPageOverlaySnapBackDebug,
  isLastRefreshOverMaxIdle,
  type OverlayDebugDeps,
} from './page-overlay-debug';
import { clearSnapBackEventsForTests } from './snap-back-events';

describe('getPageOverlaySnapBackDebug', () => {
  beforeEach(() => {
    clearSnapBackEventsForTests();
  });
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
          memberStreamLive: { 'twitch.tv/ninja': true },
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
      twitchStreamLive: true,
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
      twitchStreamLive: false,
    });
    expect(lines[0]).toContain('Tab 4');
    expect(lines[0]).toContain('Sched 99');
    expect(lines[0]).toContain('other tab');
    expect(lines[1]).toBe('Stream: offline (auto)');
    expect(lines.some((l) => l.includes('Page URL'))).toBe(true);
  });

  it('shows stream LIVE on second line when reported', () => {
    const lines = formatOverlayDebugLines({
      thisTabId: 7,
      pageUrl: 'https://www.twitch.tv/ninja',
      refreshTargetUrl: 'https://www.twitch.tv/ninja',
      schedulerTabId: 7,
      schedulerUsesThisTab: true,
      pageMatchesTarget: true,
      memberKey: 'twitch.tv/ninja',
      matchingOpenTabIds: [7],
      twitchStreamLive: true,
    });
    expect(lines[1]).toBe('Stream: LIVE (auto)');
  });

  it('shows last snap-back evidence when available', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(200_000);
    const lines = formatOverlayDebugLines({
      thisTabId: 7,
      pageUrl: 'https://www.twitch.tv/ninja',
      refreshTargetUrl: 'https://www.twitch.tv/ninja',
      schedulerTabId: 7,
      schedulerUsesThisTab: true,
      pageMatchesTarget: true,
      memberKey: 'twitch.tv/ninja',
      matchingOpenTabIds: [7],
      lastSnapBackAtMs: 170_000,
      lastSnapBackReason: 'raid-detour',
    });
    expect(lines[0]).toContain('Pick LIVE');
    expect(lines.some((l) => l.includes('Last snap-back: 30s ago (raid detour)'))).toBe(true);
    nowSpy.mockRestore();
  });

  it('shows last snap-back without reason when reason omitted', () => {
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(200_000);
    const lines = formatOverlayDebugLines({
      thisTabId: 7,
      pageUrl: 'https://www.twitch.tv/ninja',
      refreshTargetUrl: 'https://www.twitch.tv/ninja',
      schedulerTabId: 7,
      schedulerUsesThisTab: true,
      pageMatchesTarget: true,
      memberKey: 'twitch.tv/ninja',
      matchingOpenTabIds: [7],
      lastSnapBackAtMs: 170_000,
    });
    expect(lines.some((l) => l === 'Last snap-back: 30s ago')).toBe(true);
    nowSpy.mockRestore();
  });

  it('shows minutes since last refresh before the refresh URL', () => {
    const now = 1_000_000;
    const lines = formatOverlayDebugLines(
      {
        thisTabId: 7,
        pageUrl: 'https://www.twitch.tv/ninja',
        refreshTargetUrl: 'https://www.twitch.tv/ninja',
        schedulerTabId: 7,
        schedulerUsesThisTab: true,
        pageMatchesTarget: true,
        memberKey: 'twitch.tv/ninja',
        matchingOpenTabIds: [7],
        lastRefreshAtMs: now - 12 * 60_000,
      },
      now
    );
    expect(lines[2]).toBe('Last refresh: 12m ago');
    expect(lines[3]).toMatch(/^Refresh:/);
  });

  it('warns when last refresh is at or beyond 45 minutes', () => {
    const now = 1_000_000;
    const atMs = now - 45 * 60_000;
    expect(isLastRefreshOverMaxIdle(atMs, now)).toBe(true);
    expect(formatLastRefreshLine(atMs, now)).toBe('Last refresh: 45m ago');
  });
});
