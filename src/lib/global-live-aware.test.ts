import { describe, expect, it } from 'vitest';
import { DEFAULT_STATE } from './state';
import {
  applyStreamLiveUserToggle,
  findGlobalMemberKeyForTwitchPageUrl,
  getEffectiveMemberStreamLive,
  globalGroupLiveAwareEnabled,
  isGlobalMemberLivePaused,
  patchGlobalGroupsForTwitchLiveReport,
  patchGlobalGroupStreamLive,
  patchGlobalMemberAfterSuccessfulRefresh,
  patchGlobalMemberStreamLiveOverride,
  shouldForceRefreshDespiteLivePause,
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
  it('stores live and treats unknown as offline', () => {
    const mk = 'twitch.tv/streamer_a';
    const live = patchGlobalGroupStreamLive(twitchFavsGroup, mk, true, 1_000)!;
    expect(live.memberStreamLive?.[mk]).toBe(true);
    const offline = patchGlobalGroupStreamLive(live, mk, null, 1_000)!;
    expect(offline.memberStreamLive?.[mk]).toBe(false);
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

  it('is false when auto live but user toggled off (override cleared + auto offline)', () => {
    expect(
      isGlobalMemberLivePaused(
        applyStreamLiveUserToggle(
          {
            ...twitchFavsGroup,
            memberStreamLive: { 'twitch.tv/streamer_a': true },
          },
          'twitch.tv/streamer_a',
          false,
          1_000,
          60_000
        ),
        'twitch.tv/streamer_a'
      )
    ).toBe(false);
  });

  it('is true when user toggled on', () => {
    expect(
      isGlobalMemberLivePaused(
        patchGlobalMemberStreamLiveOverride(twitchFavsGroup, 'twitch.tv/streamer_a', true),
        'twitch.tv/streamer_a'
      )
    ).toBe(true);
  });
});

describe('patchGlobalMemberAfterSuccessfulRefresh', () => {
  it('clears manual on and stale auto signal after refresh', () => {
    const mk = 'twitch.tv/streamer_a';
    const g = {
      ...twitchFavsGroup,
      memberStreamLive: { [mk]: false },
      memberStreamLiveOverride: { [mk]: true },
      memberLastRefreshAt: { [mk]: 1 },
    };
    const next = patchGlobalMemberAfterSuccessfulRefresh(g, mk, 9_000);
    expect(next.memberLastRefreshAt?.[mk]).toBe(9_000);
    expect(next.memberStreamLiveOverride).toBeUndefined();
    expect(next.memberStreamLive?.[mk]).toBeUndefined();
    expect(getEffectiveMemberStreamLive(next, mk)).toBe(false);
  });
});

describe('applyStreamLiveUserToggle', () => {
  it('off clears manual override, snaps auto offline, and restarts timer', () => {
    const mk = 'twitch.tv/streamer_a';
    const on = patchGlobalMemberStreamLiveOverride(
      { ...twitchFavsGroup, memberStreamLive: { [mk]: true } },
      mk,
      true
    );
    const off = applyStreamLiveUserToggle(on, mk, false, 1_000, 90_000);
    expect(off.memberStreamLiveOverride).toBeUndefined();
    expect(off.memberStreamLive?.[mk]).toBe(false);
    expect(off.memberNextFireAt?.[mk]).toBe(91_000);
    expect(getEffectiveMemberStreamLive(off, mk)).toBe(false);
  });
});

describe('shouldForceRefreshDespiteLivePause', () => {
  it('returns true after 45 min since last refresh while live', () => {
    const mk = 'twitch.tv/streamer_a';
    const now = 1_000_000;
    const g = {
      ...twitchFavsGroup,
      memberStreamLive: { [mk]: true },
      memberLastRefreshAt: { [mk]: now - 46 * 60 * 1000 },
    };
    expect(shouldForceRefreshDespiteLivePause(g, mk, now)).toBe(true);
  });

  it('returns false when last refresh was recent', () => {
    const mk = 'twitch.tv/streamer_a';
    const now = 1_000_000;
    const g = {
      ...twitchFavsGroup,
      memberStreamLive: { [mk]: true },
      memberLastRefreshAt: { [mk]: now - 10 * 60 * 1000 },
    };
    expect(shouldForceRefreshDespiteLivePause(g, mk, now)).toBe(false);
  });

  it('returns false when never refreshed (interval handles offline path)', () => {
    const mk = 'twitch.tv/streamer_a';
    const g = {
      ...twitchFavsGroup,
      memberStreamLive: { [mk]: true },
    };
    expect(shouldForceRefreshDespiteLivePause(g, mk, 1_000_000)).toBe(false);
  });
});
