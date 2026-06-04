import { describe, expect, it } from 'vitest';
import type { GlobalGroup } from './types';
import { findTwitchFavsMemberForPageUrl } from './twitch-favs-member-match';

function twitchGroup(overrides: Partial<GlobalGroup> = {}): GlobalGroup {
  return {
    id: 'g-tw',
    name: 'TwitchFavs',
    targets: [],
    urlPatterns: ['https://www.twitch.tv/co1azo'],
    baseIntervalSec: 500,
    jitterSec: 30,
    enabled: true,
    ...overrides,
  };
}

describe('findTwitchFavsMemberForPageUrl', () => {
  it('matches urlPatterns when no explicit target row exists yet', () => {
    const hit = findTwitchFavsMemberForPageUrl(twitchGroup(), 'https://www.twitch.tv/co1azo');
    expect(hit).toEqual({
      memberKey: 'twitch.tv/co1azo',
      targetUrl: 'https://www.twitch.tv/co1azo',
    });
  });

  it('does not match twitch homepage', () => {
    expect(findTwitchFavsMemberForPageUrl(twitchGroup(), 'https://www.twitch.tv/')).toBeUndefined();
  });
});
