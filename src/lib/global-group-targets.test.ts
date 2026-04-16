import { describe, expect, it, vi } from 'vitest';
import { resolveGlobalGroupTargets } from './global-group-targets';
import type { GlobalGroup } from './types';

describe('resolveGlobalGroupTargets', () => {
  it('merges explicit targets with pattern-matched tabs', async () => {
    const group: GlobalGroup = {
      id: 'g',
      name: 'G',
      targets: [{ tabId: 1, windowId: 0, targetUrl: 'https://a.test/x' }],
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

  it('explicit target wins URL over pattern for same tab', async () => {
    const group: GlobalGroup = {
      id: 'g',
      name: 'G',
      targets: [{ tabId: 2, windowId: 0, targetUrl: 'https://saved.example/' }],
      urlPatterns: ['*twitch.tv*'],
      baseIntervalSec: 60,
      jitterSec: 0,
      enabled: true,
    };
    const queryTabs = vi.fn().mockResolvedValue([
      { id: 2, windowId: 0, url: 'https://www.twitch.tv/foo' },
    ]);
    const got = await resolveGlobalGroupTargets(group, queryTabs);
    expect(got).toHaveLength(1);
    expect(got[0]!.targetUrl).toBe('https://saved.example/');
  });
});
