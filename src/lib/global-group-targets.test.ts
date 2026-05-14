import { describe, expect, it, vi } from 'vitest';
import { resolveGlobalGroupTargets } from './global-group-targets';
import { canonicalTwitchChannelUrl } from './twitch-favs';
import type { GlobalGroup } from './types';

describe('resolveGlobalGroupTargets', () => {
  it('merges explicit targets with pattern-matched tabs', async () => {
    const group: GlobalGroup = {
      id: 'g',
      name: 'G',
      targets: [{ targetUrl: 'https://a.test/x' }],
      urlPatterns: ['*twitch.tv*'],
      baseIntervalSec: 60,
      jitterSec: 0,
      enabled: true,
    };
    const queryTabs = vi.fn().mockResolvedValue([
      { id: 1, windowId: 0, url: 'https://a.test/x' },
      { id: 2, windowId: 0, url: 'https://www.twitch.tv/foo' },
    ]);
    const got = await resolveGlobalGroupTargets(group, queryTabs);
    expect(got.map((t) => t.tabId).sort()).toEqual([1, 2]);
    expect(got.find((t) => t.tabId === 2)?.targetUrl).toContain('twitch.tv');
  });

  it('explicit target wins stored URL over pattern for the same tab id', async () => {
    const group: GlobalGroup = {
      id: 'g',
      name: 'G',
      targets: [{ targetUrl: 'https://saved.example/' }],
      urlPatterns: ['*saved.example*'],
      baseIntervalSec: 60,
      jitterSec: 0,
      enabled: true,
    };
    const queryTabs = vi
      .fn()
      .mockResolvedValue([{ id: 2, windowId: 0, url: 'https://saved.example/video' }]);
    const got = await resolveGlobalGroupTargets(group, queryTabs);
    expect(got).toHaveLength(1);
    expect(got[0]!.targetUrl).toBe('https://saved.example/');
  });

  it('TwitchFavs: canonical favorite matches twitch.tv and www tab URLs', async () => {
    const group: GlobalGroup = {
      id: 'g',
      name: 'TwitchFavs',
      targets: [],
      urlPatterns: [canonicalTwitchChannelUrl('ninja')],
      baseIntervalSec: 60,
      jitterSec: 0,
      enabled: true,
    };
    const queryTabs = vi
      .fn()
      .mockResolvedValue([
        { id: 1, windowId: 0, url: 'https://twitch.tv/Ninja', active: false, index: 0 },
      ]);
    const got = await resolveGlobalGroupTargets(group, queryTabs);
    expect(got).toHaveLength(1);
    expect(got[0]!.tabId).toBe(1);
    expect(got[0]!.targetUrl).toContain('twitch.tv');
  });
});
