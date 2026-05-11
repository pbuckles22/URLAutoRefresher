import { describe, expect, it } from 'vitest';
import {
  applyTwitchFavsUpsertFromTabUrl,
  canonicalTwitchChannelUrl,
  isTwitchFavsGroupName,
  parseTwitchFavsUrlPatternsRaw,
  reconcileTwitchFavsTargets,
  tabUrlMatchesTwitchFavsFavorite,
  twitchChannelLoginFromUrl,
} from './twitch-favs';
import type { AppState, GlobalGroup } from './types';

describe('isTwitchFavsGroupName', () => {
  it('matches case-insensitive twitchfavs', () => {
    expect(isTwitchFavsGroupName('TwitchFavs')).toBe(true);
    expect(isTwitchFavsGroupName('  twitchfavs  ')).toBe(true);
    expect(isTwitchFavsGroupName('Twitch')).toBe(false);
  });
});

describe('twitchChannelLoginFromUrl', () => {
  it('parses www and non-www twitch roots', () => {
    expect(twitchChannelLoginFromUrl('https://www.twitch.tv/CO1azo')).toBe('co1azo');
    expect(twitchChannelLoginFromUrl('https://twitch.tv/ninja/videos')).toBe(null);
    expect(twitchChannelLoginFromUrl('https://example.com/ninja')).toBe(null);
  });
});

describe('parseTwitchFavsUrlPatternsRaw', () => {
  it('expands bare names and dedupes case-insensitively', () => {
    const r = parseTwitchFavsUrlPatternsRaw('CO1azo, ninja\nCO1azo');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual([
        canonicalTwitchChannelUrl('co1azo'),
        canonicalTwitchChannelUrl('ninja'),
      ]);
    }
  });

  it('accepts full twitch URLs', () => {
    const r = parseTwitchFavsUrlPatternsRaw('https://Twitch.tv/X_QC');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual([canonicalTwitchChannelUrl('x_qc')]);
    }
  });

  it('rejects non-root twitch URLs', () => {
    const r = parseTwitchFavsUrlPatternsRaw('https://www.twitch.tv/foo/bar');
    expect(r.ok).toBe(false);
  });
});

describe('tabUrlMatchesTwitchFavsFavorite', () => {
  it('matches same channel case-insensitively', () => {
    expect(
      tabUrlMatchesTwitchFavsFavorite('https://twitch.tv/CO1azo', 'https://www.twitch.tv/co1azo')
    ).toBe(true);
  });
});

describe('reconcileTwitchFavsTargets', () => {
  it('prunes targets not in favorites and normalizes URL', () => {
    const fav = [canonicalTwitchChannelUrl('a')];
    const out = reconcileTwitchFavsTargets(
      [
        { targetUrl: 'https://twitch.tv/a', label: 'L' },
        { targetUrl: 'https://example.com/x' },
      ],
      fav
    );
    expect(out).toEqual([{ targetUrl: canonicalTwitchChannelUrl('a'), label: 'L' }]);
  });
});

function twitchGroup(overrides: Partial<GlobalGroup> = {}): GlobalGroup {
  return {
    id: 'g1',
    name: 'TwitchFavs',
    targets: [],
    urlPatterns: [canonicalTwitchChannelUrl('ninja')],
    baseIntervalSec: 60,
    jitterSec: 0,
    enabled: true,
    ...overrides,
  };
}

describe('applyTwitchFavsUpsertFromTabUrl', () => {
  const empty: AppState = { schemaVersion: 3, globalGroups: [], individualJobs: [] };

  it('adds canonical target when tab URL matches favorite', () => {
    const state: AppState = {
      ...empty,
      globalGroups: [twitchGroup({ targets: [] })],
    };
    const { next, changed } = applyTwitchFavsUpsertFromTabUrl(state, 'https://www.twitch.tv/Ninja');
    expect(changed).toBe(true);
    expect(next.globalGroups[0]?.targets).toEqual([{ targetUrl: canonicalTwitchChannelUrl('ninja') }]);
  });

  it('dedupes same channel to one row', () => {
    const state: AppState = {
      ...empty,
      globalGroups: [
        twitchGroup({
          targets: [{ targetUrl: 'https://twitch.tv/ninja' }],
        }),
      ],
    };
    const { next, changed } = applyTwitchFavsUpsertFromTabUrl(state, 'https://www.twitch.tv/ninja');
    expect(changed).toBe(true);
    expect(next.globalGroups[0]?.targets).toEqual([{ targetUrl: canonicalTwitchChannelUrl('ninja') }]);
  });

  it('skips disabled groups', () => {
    const state: AppState = {
      ...empty,
      globalGroups: [twitchGroup({ enabled: false, targets: [] })],
    };
    const { next, changed } = applyTwitchFavsUpsertFromTabUrl(state, 'https://www.twitch.tv/ninja');
    expect(changed).toBe(false);
    expect(next).toBe(state);
  });

  it('skips channel not in favorites list', () => {
    const state: AppState = {
      ...empty,
      globalGroups: [twitchGroup({ urlPatterns: [canonicalTwitchChannelUrl('a')] })],
    };
    const { changed } = applyTwitchFavsUpsertFromTabUrl(state, 'https://www.twitch.tv/b');
    expect(changed).toBe(false);
  });
});
