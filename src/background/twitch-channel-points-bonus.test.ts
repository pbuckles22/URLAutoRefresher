import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TWITCH_CHANNEL_POINTS_BONUS_PUSH } from '../lib/messages';
import { clearSchedTabHints, rememberSchedTabId } from '../lib/sched-member-tab-hint';
import {
  computeChannelPointsBonusArmedForTest,
  syncTwitchChannelPointsBonusForTab,
} from './twitch-channel-points-bonus';

const HOME_URL = 'https://www.twitch.tv/e2e_bonus_home';

const mockState = {
  globalGroups: [
    {
      id: 'g-tw',
      name: 'TwitchFavs',
      enabled: true,
      targets: [{ targetUrl: HOME_URL }],
      baseIntervalSec: 90,
      jitterSec: 0,
    },
  ],
  individualJobs: [],
};

vi.mock('../lib/storage', () => ({
  loadAppState: vi.fn(async () => mockState),
  saveAppState: vi.fn(),
  STORAGE_KEY: 'urlAutoRefresher_state_v1',
}));

vi.mock('../lib/prefs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/prefs')>();
  return {
    ...actual,
    loadExtensionPrefs: vi.fn(async () => ({
      ...actual.DEFAULT_PREFS,
      twitchChannelPointsBonusEnabled: true,
    })),
  };
});

describe('computeChannelPointsBonusArmedForTest', () => {
  beforeEach(() => {
    clearSchedTabHints();
    rememberSchedTabId('g-tw', 'twitch.tv/e2e_bonus_home', 42, HOME_URL);
  });

  it('arms when pref on and tab is sched home channel', async () => {
    await expect(computeChannelPointsBonusArmedForTest(42, HOME_URL)).resolves.toBe(true);
  });

  it('disarms on detour URL', async () => {
    await expect(
      computeChannelPointsBonusArmedForTest(42, 'https://www.twitch.tv/raided?referrer=raid')
    ).resolves.toBe(false);
  });

  it('disarms without sched hint', async () => {
    clearSchedTabHints();
    await expect(computeChannelPointsBonusArmedForTest(42, HOME_URL)).resolves.toBe(false);
  });
});

describe('syncTwitchChannelPointsBonusForTab', () => {
  beforeEach(() => {
    clearSchedTabHints();
    rememberSchedTabId('g-tw', 'twitch.tv/e2e_bonus_home', 42, HOME_URL);
  });

  it('pushes armed=true when sched home matches and pref on', async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('chrome', { tabs: { sendMessage } });

    await syncTwitchChannelPointsBonusForTab(42, HOME_URL);

    expect(sendMessage).toHaveBeenCalledWith(42, {
      type: TWITCH_CHANNEL_POINTS_BONUS_PUSH,
      armed: true,
    });
  });
});
