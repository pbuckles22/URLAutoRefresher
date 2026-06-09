import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS } from './prefs';
import { DEFAULT_STATE } from './state';
import { getPageOverlayVmForTab } from './page-overlay-state';

describe('getPageOverlayVmForTab global live-aware', () => {
  it('shows live-paused overlay for TwitchFavs member when stream is live', async () => {
    const state = {
      ...DEFAULT_STATE,
      globalGroups: [
        {
          id: 'g1',
          name: 'TwitchFavs',
          targets: [{ targetUrl: 'https://www.twitch.tv/streamer_a' }],
          baseIntervalSec: 300,
          jitterSec: 0,
          enabled: true,
          memberStreamLive: { 'twitch.tv/streamer_a': true },
          memberNextFireAt: { 'twitch.tv/streamer_a': 9_999_000 },
        },
      ],
    };
    const vm = await getPageOverlayVmForTab(
      state,
      DEFAULT_PREFS,
      1,
      'https://www.twitch.tv/streamer_a'
    );
    expect(vm).toEqual({
      show: true,
      mode: 'paused',
      globalGroupId: 'g1',
      livePaused: true,
    });
  });
});
