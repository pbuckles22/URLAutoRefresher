import { describe, expect, it } from 'vitest';
import { rebindGlobalGroupTabIds } from './global-group-tab-rebind';

describe('rebindGlobalGroupTabIds', () => {
  it('is noop when ids equal', () => {
    const g = {
      id: 'a',
      name: 'G',
      targets: [{ tabId: 1, windowId: 0, targetUrl: 'https://x/' }],
      baseIntervalSec: 1,
      jitterSec: 0,
      enabled: true,
      memberNextFireAt: { x: 100 },
      pausedMemberKeys: ['x'],
    };
    expect(rebindGlobalGroupTabIds(g, 1, 1, 0)).toEqual(g);
  });

  it('updates targets only; member-key schedule and pause unchanged (Epic 10.3)', () => {
    const g = {
      id: 'a',
      name: 'G',
      targets: [
        { tabId: 10, windowId: 1, targetUrl: 'https://twitch.tv/a' },
        { tabId: 20, windowId: 1, targetUrl: 'https://twitch.tv/b' },
      ],
      baseIntervalSec: 1,
      jitterSec: 0,
      enabled: true,
      memberNextFireAt: { 'twitch.tv/a': 5000, 'twitch.tv/b': 6000 },
      pausedMemberKeys: ['twitch.tv/a'],
    };
    const out = rebindGlobalGroupTabIds(g, 10, 99, 2);
    expect(out.targets[0]).toMatchObject({ tabId: 99, windowId: 2 });
    expect(out.memberNextFireAt).toEqual(g.memberNextFireAt);
    expect(out.pausedMemberKeys).toEqual(g.pausedMemberKeys);
  });
});
