import { describe, it, expect } from 'vitest';
import { applyTabRemoved } from './tab-lifecycle';
import { DEFAULT_STATE } from './state';

describe('applyTabRemoved', () => {
  it('disables individual job for removed tab', () => {
    const state = {
      ...DEFAULT_STATE,
      individualJobs: [
        {
          id: 'i1',
          target: { tabId: 5, windowId: 1, targetUrl: 'https://a.com' },
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: true,
        },
      ],
    };
    const next = applyTabRemoved(state, 5);
    expect(next.individualJobs[0].enabled).toBe(false);
  });

  it('removes target from global and disables group when empty', () => {
    const state = {
      ...DEFAULT_STATE,
      globalGroups: [
        {
          id: 'g1',
          name: 'G',
          targets: [{ tabId: 9, windowId: 1, targetUrl: 'https://b.com' }],
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: true,
        },
      ],
    };
    const next = applyTabRemoved(state, 9);
    expect(next.globalGroups[0].targets).toHaveLength(0);
    expect(next.globalGroups[0].enabled).toBe(false);
  });
});
