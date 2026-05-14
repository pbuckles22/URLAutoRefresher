import { describe, expect, it, vi } from 'vitest';
import { canonicalTwitchChannelUrl } from '../lib/twitch-favs';
import type { AppState, GlobalGroup } from '../lib/types';
import { persistTwitchFavsUpsertFromTabUrl } from './twitch-favs-sync';

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

describe('persistTwitchFavsUpsertFromTabUrl', () => {
  it('returns false and does not save when upsert is a no-op', async () => {
    const empty: AppState = { schemaVersion: 3, globalGroups: [], individualJobs: [] };
    const loadAppState = vi.fn().mockResolvedValue(empty);
    const saveAppState = vi.fn().mockResolvedValue(undefined);
    const bootstrapScheduling = vi.fn().mockResolvedValue(undefined);

    const changed = await persistTwitchFavsUpsertFromTabUrl('https://example.com/', {
      loadAppState,
      saveAppState,
      bootstrapScheduling,
    });

    expect(changed).toBe(false);
    expect(saveAppState).not.toHaveBeenCalled();
    expect(bootstrapScheduling).not.toHaveBeenCalled();
  });

  it('saves and reschedules when a favorite channel tab URL adds a target', async () => {
    const state: AppState = {
      schemaVersion: 3,
      globalGroups: [twitchGroup()],
      individualJobs: [],
    };
    const loadAppState = vi.fn().mockResolvedValue(state);
    const saveAppState = vi.fn().mockResolvedValue(undefined);
    const bootstrapScheduling = vi.fn().mockResolvedValue(undefined);

    const changed = await persistTwitchFavsUpsertFromTabUrl('https://www.twitch.tv/vitestch', {
      loadAppState,
      saveAppState,
      bootstrapScheduling,
    });

    expect(changed).toBe(true);
    expect(saveAppState).toHaveBeenCalledTimes(1);
    const saved = saveAppState.mock.calls[0]![0] as AppState;
    expect(saved.globalGroups[0]?.targets).toEqual([
      { targetUrl: canonicalTwitchChannelUrl('vitestch') },
    ]);
    expect(bootstrapScheduling).toHaveBeenCalledTimes(1);
  });
});
