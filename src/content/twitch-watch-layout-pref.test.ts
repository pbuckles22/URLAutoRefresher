import { describe, expect, it } from 'vitest';
import { parsePrefs } from '../lib/prefs';
import {
  applyWatchLayoutPrefChange,
  canRunWatchLayout,
  completeWatchLayoutPrefHydration,
  createWatchLayoutPrefState,
  watchLayoutEnabledFromStorageChange,
} from './twitch-watch-layout-pref';

describe('watch layout pref gate', () => {
  it('blocks layout until hydration completes', () => {
    const state = createWatchLayoutPrefState();
    expect(canRunWatchLayout(state)).toBe(false);

    const action = applyWatchLayoutPrefChange(state, false);
    expect(action.shouldRunLayout).toBe(false);
    expect(action.shouldStopLayout).toBe(true);
    expect(canRunWatchLayout(state)).toBe(false);
  });

  it('hydration with pref off does not run layout', () => {
    const state = createWatchLayoutPrefState();
    const action = completeWatchLayoutPrefHydration(state, false);

    expect(state.prefHydrated).toBe(true);
    expect(state.watchLayoutEnabled).toBe(false);
    expect(action.shouldRunLayout).toBe(false);
    expect(action.shouldStopLayout).toBe(true);
    expect(canRunWatchLayout(state)).toBe(false);
  });

  it('hydration with pref on runs layout without reset', () => {
    const state = createWatchLayoutPrefState();
    const action = completeWatchLayoutPrefHydration(state, true);

    expect(action.shouldRunLayout).toBe(true);
    expect(action.shouldResetLayoutState).toBe(false);
    expect(action.shouldStopLayout).toBe(false);
    expect(canRunWatchLayout(state)).toBe(true);
  });

  it('storage.onChanged re-enable resets layout state and runs layout', () => {
    const state = createWatchLayoutPrefState();
    completeWatchLayoutPrefHydration(state, false);

    const action = applyWatchLayoutPrefChange(state, true);
    expect(action.shouldResetLayoutState).toBe(true);
    expect(action.shouldRunLayout).toBe(true);
    expect(action.shouldStopLayout).toBe(false);
    expect(canRunWatchLayout(state)).toBe(true);
  });

  it('storage.onChanged disable stops layout without reset', () => {
    const state = createWatchLayoutPrefState();
    completeWatchLayoutPrefHydration(state, true);

    const action = applyWatchLayoutPrefChange(state, false);
    expect(action.shouldResetLayoutState).toBe(false);
    expect(action.shouldRunLayout).toBe(false);
    expect(action.shouldStopLayout).toBe(true);
    expect(canRunWatchLayout(state)).toBe(false);
  });

  it('watchLayoutEnabledFromStorageChange parses prefs payload', () => {
    expect(
      watchLayoutEnabledFromStorageChange({ twitchWatchLayoutEnabled: false }, parsePrefs)
    ).toBe(false);
    expect(watchLayoutEnabledFromStorageChange(undefined, parsePrefs)).toBe(true);
  });
});
