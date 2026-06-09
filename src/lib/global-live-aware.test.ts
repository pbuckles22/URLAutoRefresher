import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE } from './state';
import {
  findGlobalMemberKeyForTwitchPageUrl,
  globalGroupLiveAwareEnabled,
  isGlobalMemberLivePaused,
  patchGlobalGroupsForTwitchLiveReport,
  patchGlobalGroupStreamLive,
} from './global-live-aware';

const twitchFavsGroup = {
  id: 'g1',
  name: 'TwitchFavs',
  targets: [{ targetUrl: 'https://www.twitch.tv/streamer_a' }],
  urlPatterns: ['https://www.twitch.tv/streamer_b'],
  baseIntervalSec: 300,
  jitterSec: 0,
  enabled: true,
};

describe('globalGroupLiveAwareEnabled', () => {
  it('defaults to enabled when flag is unset', () => {
    expect(globalGroupLiveAwareEnabled(twitchFavsGroup)).toBe(true);
  });

  it('respects explicit false', () => {
    expect(globalGroupLiveAwareEnabled({ ...twitchFavsGroup, liveAwareRefresh: false })).toBe(
      false
    );
  });
});

describe('findGlobalMemberKeyForTwitchPageUrl', () => {
  it('matches explicit target rows', () => {
    expect(
      findGlobalMemberKeyForTwitchPageUrl(twitchFavsGroup, 'https://www.twitch.tv/streamer_a')
    ).toBe('twitch.tv/streamer_a');
  });

  it('matches TwitchFavs urlPatterns', () => {
    expect(
      findGlobalMemberKeyForTwitchPageUrl(twitchFavsGroup, 'https://www.twitch.tv/streamer_b')
    ).toBe('twitch.tv/streamer_b');
  });
});

describe('patchGlobalGroupStreamLive', () => {
  it('stores live and clears on unknown', () => {
    const mk = 'twitch.tv/streamer_a';
    const live = patchGlobalGroupStreamLive(twitchFavsGroup, mk, true, 1_000)!;
    expect(live.memberStreamLive?.[mk]).toBe(true);
    const cleared = patchGlobalGroupStreamLive(live, mk, null, 1_000)!;
    expect(cleared.memberStreamLive?.[mk]).toBeUndefined();
  });

  it('caps memberNextFireAt when stream goes offline', () => {
    const mk = 'twitch.tv/streamer_a';
    const withLive = {
      ...twitchFavsGroup,
      memberStreamLive: { [mk]: true },
      memberNextFireAt: { [mk]: 9_999_000 },
    };
    const now = 1_000_000;
    const next = patchGlobalGroupStreamLive(withLive, mk, false, now)!;
    expect(next.memberStreamLive?.[mk]).toBe(false);
    expect(next.memberNextFireAt?.[mk]).toBeLessThanOrEqual(now + 3_000);
  });
});

describe('patchGlobalGroupsForTwitchLiveReport', () => {
  it('updates matching group and reports live session active', () => {
    const state = { ...DEFAULT_STATE, globalGroups: [twitchFavsGroup] };
    const { next, changed, liveSessionActive } = patchGlobalGroupsForTwitchLiveReport(
      state,
      'https://www.twitch.tv/streamer_a',
      true,
      1
    );
    expect(changed).toBe(true);
    expect(liveSessionActive).toBe(true);
    expect(next.globalGroups[0]?.memberStreamLive?.['twitch.tv/streamer_a']).toBe(true);
  });
});

describe('isGlobalMemberLivePaused', () => {
  it('is true when live-aware and member is live', () => {
    expect(
      isGlobalMemberLivePaused(
        {
          ...twitchFavsGroup,
          memberStreamLive: { 'twitch.tv/streamer_a': true },
        },
        'twitch.tv/streamer_a'
      )
    ).toBe(true);
  });

  it('is false when user paused the member', () => {
    expect(
      isGlobalMemberLivePaused(
        {
          ...twitchFavsGroup,
          pausedMemberKeys: ['twitch.tv/streamer_a'],
          memberStreamLive: { 'twitch.tv/streamer_a': true },
        },
        'twitch.tv/streamer_a'
      )
    ).toBe(false);
  });
});
