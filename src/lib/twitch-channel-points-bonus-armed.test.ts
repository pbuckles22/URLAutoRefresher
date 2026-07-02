import { describe, expect, it } from 'vitest';
import { isTwitchChannelPointsBonusArmedForTab } from './twitch-channel-points-bonus-armed';

const HOME_URL = 'https://www.twitch.tv/streamer';

describe('isTwitchChannelPointsBonusArmedForTab', () => {
  it('arms when pref on and tab matches TwitchFavs home', () => {
    expect(
      isTwitchChannelPointsBonusArmedForTab({
        tabUrl: HOME_URL,
        hint: { groupId: 'g1', memberKey: 'twitch.tv/streamer', targetUrl: HOME_URL },
        groupEnabled: true,
        isTwitchFavsGroup: true,
        channelPointsBonusEnabled: true,
      })
    ).toBe(true);
  });

  it('disarms when pref off', () => {
    expect(
      isTwitchChannelPointsBonusArmedForTab({
        tabUrl: HOME_URL,
        hint: { groupId: 'g1', memberKey: 'twitch.tv/streamer', targetUrl: HOME_URL },
        groupEnabled: true,
        isTwitchFavsGroup: true,
        channelPointsBonusEnabled: false,
      })
    ).toBe(false);
  });

  it('disarms on detour URL', () => {
    expect(
      isTwitchChannelPointsBonusArmedForTab({
        tabUrl: 'https://www.twitch.tv/other',
        hint: { groupId: 'g1', memberKey: 'twitch.tv/streamer', targetUrl: HOME_URL },
        groupEnabled: true,
        isTwitchFavsGroup: true,
        channelPointsBonusEnabled: true,
      })
    ).toBe(false);
  });
});
