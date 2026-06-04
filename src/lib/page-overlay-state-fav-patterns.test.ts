import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS } from './prefs';
import { DEFAULT_STATE } from './state';
import { getPageOverlayVmForTab } from './page-overlay-state';

describe('getPageOverlayVmForTab TwitchFavs urlPatterns', () => {
  it('shows overlay for a fav pattern match before targets row is upserted', async () => {
    const state = {
      ...DEFAULT_STATE,
      globalGroups: [
        {
          id: 'g1',
          name: 'TwitchFavs',
          targets: [],
          urlPatterns: ['https://www.twitch.tv/sandmansoundfactory'],
          baseIntervalSec: 500,
          jitterSec: 30,
          enabled: true,
          memberNextFireAt: { 'twitch.tv/sandmansoundfactory': 9_999_000 },
        },
      ],
    };
    const vm = await getPageOverlayVmForTab(
      state,
      DEFAULT_PREFS,
      55,
      'https://www.twitch.tv/sandmansoundfactory'
    );
    expect(vm).toEqual({
      show: true,
      mode: 'timer',
      nextFireAt: 9_999_000,
      globalGroupId: 'g1',
    });
  });
});
