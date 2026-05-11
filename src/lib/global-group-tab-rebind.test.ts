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
      tabNextFireAt: { '1': 100 },
    };
    expect(rebindGlobalGroupTabIds(g, 1, 1, 0)).toEqual(g);
  });

  it('moves tabNextFireAt and updates targets and pausedTabIds', () => {
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
      tabNextFireAt: { '10': 5000, '20': 6000 },
      pausedTabIds: [10],
    };
    const out = rebindGlobalGroupTabIds(g, 10, 99, 2);
    expect(out.targets[0]).toMatchObject({ tabId: 99, windowId: 2 });
    expect(out.tabNextFireAt).toEqual({ '99': 5000, '20': 6000 });
    expect(out.pausedTabIds).toEqual([99]);
  });

  it('merges tabNextFireAt when new key already exists', () => {
    const g = {
      id: 'a',
      name: 'G',
      targets: [{ tabId: 10, windowId: 0, targetUrl: 'https://x/' }],
      baseIntervalSec: 1,
      jitterSec: 0,
      enabled: true,
      tabNextFireAt: { '10': 9000, '99': 8000 },
    };
    const out = rebindGlobalGroupTabIds(g, 10, 99, 0);
    expect(out.tabNextFireAt?.['99']).toBe(8000);
  });
});
