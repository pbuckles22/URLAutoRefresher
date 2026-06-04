import { describe, expect, it } from 'vitest';
import { canonicalTwitchChannelUrl } from './twitch-favs';
import type { AppState, GlobalGroup } from './types';
import { shouldBootstrapSchedulingForTabUrl } from './scheduling-tab-url';

function twitchGroup(overrides: Partial<GlobalGroup> = {}): GlobalGroup {
  return {
    id: 'g-tw',
    name: 'TwitchFavs',
    targets: [],
    urlPatterns: [canonicalTwitchChannelUrl('vitestch')],
    baseIntervalSec: 60,
    jitterSec: 0,
    enabled: true,
    ...overrides,
  };
}

function stateWith(...groups: GlobalGroup[]): AppState {
  return { schemaVersion: 3, globalGroups: groups, individualJobs: [] };
}

describe('shouldBootstrapSchedulingForTabUrl', () => {
  it('returns false for unrelated URLs', () => {
    const state = stateWith(twitchGroup());
    expect(shouldBootstrapSchedulingForTabUrl(state, 'https://example.com/')).toBe(false);
  });

  it('returns true when tab URL matches an explicit enabled group target', () => {
    const canon = canonicalTwitchChannelUrl('djsonnyd');
    const state = stateWith(
      twitchGroup({
        targets: [{ targetUrl: canon }],
      })
    );
    expect(shouldBootstrapSchedulingForTabUrl(state, 'https://www.twitch.tv/djsonnyd')).toBe(true);
  });

  it('returns true when tab URL matches a TwitchFavs favorite pattern without explicit target row', () => {
    const state = stateWith(twitchGroup({ targets: [] }));
    expect(shouldBootstrapSchedulingForTabUrl(state, 'https://twitch.tv/vitestch')).toBe(true);
  });

  it('returns false when the matching member is paused', () => {
    const canon = canonicalTwitchChannelUrl('djsonnyd');
    const state = stateWith(
      twitchGroup({
        targets: [{ targetUrl: canon }],
        pausedMemberKeys: ['twitch.tv/djsonnyd'],
      })
    );
    expect(shouldBootstrapSchedulingForTabUrl(state, canon)).toBe(false);
  });

  it('returns false when the group is disabled or has no schedulable config', () => {
    const canon = canonicalTwitchChannelUrl('djsonnyd');
    expect(
      shouldBootstrapSchedulingForTabUrl(
        stateWith(twitchGroup({ targets: [{ targetUrl: canon }], enabled: false })),
        canon
      )
    ).toBe(false);
    expect(
      shouldBootstrapSchedulingForTabUrl(
        stateWith(twitchGroup({ targets: [], urlPatterns: [] })),
        canon
      )
    ).toBe(false);
  });
});
