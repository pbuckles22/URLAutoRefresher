import { describe, it, expect } from 'vitest';
import { applyTabRemoved } from './tab-lifecycle';
import { DEFAULT_STATE } from './state';

describe('applyTabRemoved', () => {
  it('does not mutate state (URL-first membership)', () => {
    const state = {
      ...DEFAULT_STATE,
      individualJobs: [
        {
          id: 'i1',
          target: { targetUrl: 'https://a.com' },
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: true,
        },
      ],
      globalGroups: [
        {
          id: 'g1',
          name: 'G',
          targets: [{ targetUrl: 'https://b.com' }],
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: true,
        },
      ],
    };
    expect(applyTabRemoved(state, 5)).toBe(state);
  });
});
