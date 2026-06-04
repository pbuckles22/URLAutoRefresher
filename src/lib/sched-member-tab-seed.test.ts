import { describe, expect, it, vi } from 'vitest';
import {
  clearSchedTabHints,
  getSchedHintForTab,
  rememberSchedTabId,
} from './sched-member-tab-hint';
import { maybeRememberSchedTabFromFavHome } from './sched-member-tab-seed';
import * as storageMod from './storage';

describe('maybeRememberSchedTabFromFavHome', () => {
  it('seeds sched hint when tab opens a TwitchFavs target channel', async () => {
    clearSchedTabHints();
    vi.spyOn(storageMod, 'loadAppState').mockResolvedValue({
      schemaVersion: 3,
      globalGroups: [
        {
          id: 'g-tw',
          name: 'TwitchFavs',
          targets: [{ targetUrl: 'https://www.twitch.tv/djsonnyd' }],
          urlPatterns: ['https://www.twitch.tv/djsonnyd'],
          baseIntervalSec: 500,
          jitterSec: 30,
          enabled: true,
        },
      ],
      individualJobs: [],
    });

    await maybeRememberSchedTabFromFavHome(77, 'https://www.twitch.tv/djsonnyd');

    expect(getSchedHintForTab(77)).toMatchObject({
      groupId: 'g-tw',
      memberKey: 'twitch.tv/djsonnyd',
      tabId: 77,
    });
  });

  it('does not overwrite an existing home hint when landing on another fav channel', async () => {
    clearSchedTabHints();
    rememberSchedTabId('g-tw', 'twitch.tv/djsonnyd', 77, 'https://www.twitch.tv/djsonnyd');
    vi.spyOn(storageMod, 'loadAppState').mockResolvedValue({
      schemaVersion: 3,
      globalGroups: [
        {
          id: 'g-tw',
          name: 'TwitchFavs',
          targets: [
            { targetUrl: 'https://www.twitch.tv/djsonnyd' },
            { targetUrl: 'https://www.twitch.tv/otherfav' },
          ],
          urlPatterns: ['https://www.twitch.tv/djsonnyd', 'https://www.twitch.tv/otherfav'],
          baseIntervalSec: 500,
          jitterSec: 30,
          enabled: true,
        },
      ],
      individualJobs: [],
    });

    await maybeRememberSchedTabFromFavHome(77, 'https://www.twitch.tv/otherfav?referrer=raid');

    expect(getSchedHintForTab(77)).toMatchObject({
      memberKey: 'twitch.tv/djsonnyd',
      targetUrl: 'https://www.twitch.tv/djsonnyd',
    });
  });
});
