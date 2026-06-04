import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_PREFS } from './prefs';
import { DEFAULT_STATE } from './state';
import { clearSchedTabHints, rememberSchedTabId } from './sched-member-tab-hint';
import { getPageOverlayVmForTab } from './page-overlay-state';

describe('getPageOverlayVmForTab URL drift hint', () => {
  beforeEach(() => {
    clearSchedTabHints();
  });

  it('shows timer on raid detour tab when sched hint exists', async () => {
    rememberSchedTabId('g1', 'twitch.tv/djsonnyd', 42, 'https://www.twitch.tv/djsonnyd');
    const state = {
      ...DEFAULT_STATE,
      globalGroups: [
        {
          id: 'g1',
          name: 'TwitchFavs',
          targets: [{ targetUrl: 'https://www.twitch.tv/djsonnyd' }],
          baseIntervalSec: 500,
          jitterSec: 30,
          enabled: true,
          memberNextFireAt: { 'twitch.tv/djsonnyd': 9_999_000 },
        },
      ],
    };
    const vm = await getPageOverlayVmForTab(
      state,
      DEFAULT_PREFS,
      42,
      'https://www.twitch.tv/dj_phil_skillz?referrer=raid'
    );
    expect(vm).toEqual({
      show: true,
      mode: 'timer',
      nextFireAt: 9_999_000,
      globalGroupId: 'g1',
    });
  });

  it('hides overlay on twitch homepage even when a stale sched hint exists', async () => {
    rememberSchedTabId('g1', 'twitch.tv/nyybeats', 42, 'https://www.twitch.tv/nyybeats');
    const state = {
      ...DEFAULT_STATE,
      globalGroups: [
        {
          id: 'g1',
          name: 'TwitchFavs',
          targets: [{ targetUrl: 'https://www.twitch.tv/nyybeats' }],
          baseIntervalSec: 500,
          jitterSec: 30,
          enabled: true,
          memberNextFireAt: { 'twitch.tv/nyybeats': 9_999_000 },
        },
      ],
    };
    const vm = await getPageOverlayVmForTab(state, DEFAULT_PREFS, 42, 'https://www.twitch.tv/');
    expect(vm).toEqual({ show: false });
  });
});
