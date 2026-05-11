import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS } from './prefs';
import { DEFAULT_STATE } from './state';
import { memberKeyFromTargetUrl } from './member-url';
import { getPageOverlayVmForTab, pageMatchesExplicitTarget } from './page-overlay-state';

describe('pageMatchesExplicitTarget', () => {
  it('matches twitch with and without www', () => {
    const withWww = 'https://www.twitch.tv/sandmansoundfactory';
    const noWww = 'https://twitch.tv/sandmansoundfactory';
    expect(memberKeyFromTargetUrl(withWww)).toBe(memberKeyFromTargetUrl(noWww));
    expect(pageMatchesExplicitTarget(withWww, noWww)).toBe(true);
    expect(
      pageMatchesExplicitTarget(
        'https://twitch.tv/sandmansoundfactory/videos',
        'https://www.twitch.tv/sandmansoundfactory'
      )
    ).toBe(true);
  });
});

describe('getPageOverlayVmForTab URL drift', () => {
  it('shows global timer when live tab id differs but URL matches explicit target', async () => {
    const state = {
      ...DEFAULT_STATE,
      globalGroups: [
        {
          id: 'g1',
          name: 'Twitch',
          targets: [
            {
              tabId: 111,
              windowId: 1,
              targetUrl: 'https://www.twitch.tv/sandmansoundfactory',
            },
          ],
          baseIntervalSec: 300,
          jitterSec: 30,
          enabled: true,
          tabNextFireAt: { '111': 9_999_000 },
        },
      ],
    };
    const vm = await getPageOverlayVmForTab(
      state,
      DEFAULT_PREFS,
      222,
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
