import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TWITCH_RAID_GUARD_PUSH } from '../lib/messages';
import { clearSchedTabHints, rememberSchedTabId } from '../lib/sched-member-tab-hint';
import { computeRaidGuardArmedForTest, syncTwitchRaidGuardForTab } from './twitch-raid-guard';

const HOME_URL = 'https://www.twitch.tv/e2e_guard_home';

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

describe('computeRaidGuardArmedForTest', () => {
  beforeEach(() => {
    clearSchedTabHints();
    rememberSchedTabId('g-tw', 'twitch.tv/e2e_guard_home', 42, HOME_URL);
  });

  it('arms when tab is on sched home channel', async () => {
    await expect(computeRaidGuardArmedForTest(42, HOME_URL)).resolves.toBe(true);
  });

  it('disarms on raid detour URL', async () => {
    await expect(
      computeRaidGuardArmedForTest(42, 'https://www.twitch.tv/raided?referrer=raid')
    ).resolves.toBe(false);
  });

  it('disarms without sched hint', async () => {
    clearSchedTabHints();
    await expect(computeRaidGuardArmedForTest(42, HOME_URL)).resolves.toBe(false);
  });
});

describe('syncTwitchRaidGuardForTab', () => {
  beforeEach(() => {
    clearSchedTabHints();
    rememberSchedTabId('g-tw', 'twitch.tv/e2e_guard_home', 42, HOME_URL);
  });

  it('pushes armed=true to the tab when sched home matches', async () => {
    const sendMessage = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('chrome', { tabs: { sendMessage } });

    await syncTwitchRaidGuardForTab(42, HOME_URL);

    expect(sendMessage).toHaveBeenCalledWith(42, {
      type: TWITCH_RAID_GUARD_PUSH,
      armed: true,
    });
  });
});
