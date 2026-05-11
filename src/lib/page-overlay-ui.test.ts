import { describe, it, expect, vi } from 'vitest';
import type { GlobalGroup } from './types';
import { DEFAULT_PREFS } from './prefs';
import { DEFAULT_STATE } from './state';
import { getPageOverlayUiState } from './page-overlay-ui';

vi.mock('./global-group-targets', async (importOriginal) => {
  const mod = await importOriginal<typeof import('./global-group-targets')>();
  return {
    ...mod,
    resolveGlobalGroupTargets: vi.fn(async (g: GlobalGroup) =>
      g.targets.map((t, idx) => ({
        tabId: 400 + idx,
        windowId: 1,
        targetUrl: t.targetUrl,
      }))
    ),
  };
});

describe('getPageOverlayUiState (Epic 3.0)', () => {
  it('hides overlay when pref is off even if tab has an enabled job', async () => {
    const state = {
      ...DEFAULT_STATE,
      individualJobs: [
        {
          id: 'j1',
          target: { targetUrl: 'https://a.test' },
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: true,
          nextFireAt: 123,
        },
      ],
    };
    await expect(getPageOverlayUiState(state, { showPageOverlayTimer: false }, 1, 'https://a.test')).resolves.toEqual({
      show: false,
    });
  });

  it('hides overlay when pref is on but tab has no active job', async () => {
    await expect(getPageOverlayUiState(DEFAULT_STATE, DEFAULT_PREFS, 99, 'https://none/')).resolves.toEqual({
      show: false,
    });
  });

  it('shows overlay with nextFireAt when pref on and enabled individual targets tab', async () => {
    const state = {
      ...DEFAULT_STATE,
      individualJobs: [
        {
          id: 'j1',
          target: { targetUrl: 'https://a.test' },
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: true,
          nextFireAt: 9_000_000,
        },
      ],
    };
    await expect(getPageOverlayUiState(state, DEFAULT_PREFS, 2, 'https://a.test/page')).resolves.toEqual({
      show: true,
      mode: 'timer',
      nextFireAt: 9_000_000,
      individualJobId: 'j1',
    });
  });

  it('shows overlay for enabled global member tab', async () => {
    const state = {
      ...DEFAULT_STATE,
      globalGroups: [
        {
          id: 'g1',
          name: 'G',
          targets: [{ targetUrl: 'https://b.test' }],
          baseIntervalSec: 30,
          jitterSec: 0,
          enabled: true,
          nextFireAt: 42,
        },
      ],
    };
    await expect(getPageOverlayUiState(state, DEFAULT_PREFS, 4, 'https://b.test/z')).resolves.toEqual({
      show: true,
      mode: 'timer',
      nextFireAt: 42,
      globalGroupId: 'g1',
    });
  });
});
