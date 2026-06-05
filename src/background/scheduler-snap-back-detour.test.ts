import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearSchedTabHints, rememberSchedTabId } from '../lib/sched-member-tab-hint';
import { clearSnapBackEventsForTests } from '../lib/snap-back-events';
import * as prefsMod from '../lib/prefs';
import * as storageMod from '../lib/storage';
import { maybeSnapBackRaidDetour } from './scheduler-snap-back-detour';

describe('maybeSnapBackRaidDetour', () => {
  beforeEach(() => {
    clearSchedTabHints();
    clearSnapBackEventsForTests();
    vi.restoreAllMocks();
    global.chrome = global.chrome ?? {};
    global.chrome.tabs = global.chrome.tabs ?? {};
    global.chrome.tabs.update = vi.fn().mockResolvedValue({});
  });

  it('restores home URL when sched tab lands on a raid detour', async () => {
    vi.spyOn(prefsMod, 'loadExtensionPrefs').mockResolvedValue({
      showPageOverlayTimer: true,
      showOverlaySnapBackDebug: false,
    });
    vi.spyOn(storageMod, 'loadAppState').mockResolvedValue({
      schemaVersion: 3,
      globalGroups: [
        {
          id: 'g-tw',
          name: 'TwitchFavs',
          targets: [{ targetUrl: 'https://www.twitch.tv/djsonnyd' }],
          baseIntervalSec: 500,
          jitterSec: 30,
          enabled: true,
        },
      ],
      individualJobs: [],
    });
    rememberSchedTabId('g-tw', 'twitch.tv/djsonnyd', 42, 'https://www.twitch.tv/djsonnyd');

    await maybeSnapBackRaidDetour(
      42,
      'https://www.twitch.tv/dj_phil_skillz?referrer=raid',
      'https://www.twitch.tv/djsonnyd'
    );

    expect(chrome.tabs.update).toHaveBeenCalledWith(42, {
      url: 'https://www.twitch.tv/djsonnyd',
    });
  });

  it('snaps on channel change when sched hint exists even without referrer=raid', async () => {
    vi.spyOn(prefsMod, 'loadExtensionPrefs').mockResolvedValue({
      showPageOverlayTimer: true,
      showOverlaySnapBackDebug: false,
    });
    vi.spyOn(storageMod, 'loadAppState').mockResolvedValue({
      schemaVersion: 3,
      globalGroups: [
        {
          id: 'g-tw',
          name: 'TwitchFavs',
          targets: [{ targetUrl: 'https://www.twitch.tv/djsonnyd' }],
          baseIntervalSec: 500,
          jitterSec: 30,
          enabled: true,
        },
      ],
      individualJobs: [],
    });
    rememberSchedTabId('g-tw', 'twitch.tv/djsonnyd', 42, 'https://www.twitch.tv/djsonnyd');

    await maybeSnapBackRaidDetour(
      42,
      'https://www.twitch.tv/dj_phil_skillz',
      'https://www.twitch.tv/djsonnyd'
    );

    expect(chrome.tabs.update).toHaveBeenCalledWith(42, {
      url: 'https://www.twitch.tv/djsonnyd',
    });
  });

  it('snaps back when detour target is another TwitchFavs channel', async () => {
    vi.spyOn(prefsMod, 'loadExtensionPrefs').mockResolvedValue({
      showPageOverlayTimer: true,
      showOverlaySnapBackDebug: false,
    });
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
          baseIntervalSec: 500,
          jitterSec: 30,
          enabled: true,
        },
      ],
      individualJobs: [],
    });
    rememberSchedTabId('g-tw', 'twitch.tv/djsonnyd', 42, 'https://www.twitch.tv/djsonnyd');

    await maybeSnapBackRaidDetour(
      42,
      'https://www.twitch.tv/otherfav?referrer=raid',
      'https://www.twitch.tv/djsonnyd'
    );

    expect(chrome.tabs.update).toHaveBeenCalledWith(42, {
      url: 'https://www.twitch.tv/djsonnyd',
    });
  });

  it('does not snap when navigating from twitch homepage (browse away)', async () => {
    rememberSchedTabId('g-tw', 'twitch.tv/nyybeats', 42, 'https://www.twitch.tv/nyybeats');
    await maybeSnapBackRaidDetour(
      42,
      'https://www.twitch.tv/otherstreamer',
      'https://www.twitch.tv/'
    );
    expect(chrome.tabs.update).not.toHaveBeenCalled();
  });

  it('does not snap when no sched hint exists', async () => {
    await maybeSnapBackRaidDetour(
      42,
      'https://www.twitch.tv/dj_phil_skillz?referrer=raid',
      undefined
    );
    expect(chrome.tabs.update).not.toHaveBeenCalled();
  });
});
