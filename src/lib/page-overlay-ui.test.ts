import { describe, it, expect } from 'vitest';
import { DEFAULT_PREFS } from './prefs';
import { DEFAULT_STATE } from './state';
import { getPageOverlayUiState } from './page-overlay-ui';

describe('getPageOverlayUiState (Epic 3.0)', () => {
  it('hides overlay when pref is off even if tab has an enabled job', () => {
    const state = {
      ...DEFAULT_STATE,
      individualJobs: [
        {
          id: 'j1',
          target: { tabId: 1, windowId: 1, targetUrl: 'https://a.test' },
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: true,
          nextFireAt: 123,
        },
      ],
    };
    expect(getPageOverlayUiState(state, { showPageOverlayTimer: false }, 1)).toEqual({ show: false });
  });

  it('hides overlay when pref is on but tab has no active job', () => {
    expect(getPageOverlayUiState(DEFAULT_STATE, DEFAULT_PREFS, 99)).toEqual({ show: false });
  });

  it('shows overlay with nextFireAt when pref on and enabled individual targets tab', () => {
    const state = {
      ...DEFAULT_STATE,
      individualJobs: [
        {
          id: 'j1',
          target: { tabId: 2, windowId: 1, targetUrl: 'https://a.test' },
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: true,
          nextFireAt: 9_000_000,
        },
      ],
    };
    expect(getPageOverlayUiState(state, DEFAULT_PREFS, 2)).toEqual({
      show: true,
      nextFireAt: 9_000_000,
    });
  });

  it('shows overlay for enabled global member tab', () => {
    const state = {
      ...DEFAULT_STATE,
      globalGroups: [
        {
          id: 'g1',
          name: 'G',
          targets: [{ tabId: 4, windowId: 1, targetUrl: 'https://b.test' }],
          baseIntervalSec: 30,
          jitterSec: 0,
          enabled: true,
          nextFireAt: 42,
        },
      ],
    };
    expect(getPageOverlayUiState(state, DEFAULT_PREFS, 4)).toEqual({ show: true, nextFireAt: 42 });
  });
});
