/**
 * Watch-layout pref hydration gate — testable state for twitch-live-bridge.
 * Layout automation must not run until storage prefs are hydrated (avoids default-true flash).
 */

export type WatchLayoutPrefState = {
  prefHydrated: boolean;
  watchLayoutEnabled: boolean;
};

export type WatchLayoutPrefAction = {
  shouldResetLayoutState: boolean;
  shouldRunLayout: boolean;
  shouldStopLayout: boolean;
};

export function createWatchLayoutPrefState(): WatchLayoutPrefState {
  return { prefHydrated: false, watchLayoutEnabled: true };
}

export function canRunWatchLayout(state: WatchLayoutPrefState): boolean {
  return state.prefHydrated && state.watchLayoutEnabled;
}

/** First hydration from chrome.storage.local — marks prefHydrated before applying. */
export function completeWatchLayoutPrefHydration(
  state: WatchLayoutPrefState,
  enabled: boolean
): WatchLayoutPrefAction {
  state.prefHydrated = true;
  return applyWatchLayoutPrefChange(state, enabled);
}

/** Runtime pref toggle (storage.onChanged or post-hydration apply). */
export function applyWatchLayoutPrefChange(
  state: WatchLayoutPrefState,
  enabled: boolean
): WatchLayoutPrefAction {
  const wasEnabled = state.watchLayoutEnabled;
  state.watchLayoutEnabled = enabled;

  if (!enabled) {
    return {
      shouldResetLayoutState: false,
      shouldRunLayout: false,
      shouldStopLayout: true,
    };
  }

  if (!state.prefHydrated) {
    return {
      shouldResetLayoutState: false,
      shouldRunLayout: false,
      shouldStopLayout: false,
    };
  }

  return {
    shouldResetLayoutState: !wasEnabled,
    shouldRunLayout: true,
    shouldStopLayout: false,
  };
}

/** Parse storage.onChanged pref payload — thin wrapper for bridge + tests. */
export function watchLayoutEnabledFromStorageChange(
  newValue: unknown,
  parsePrefs: (raw: unknown) => { twitchWatchLayoutEnabled: boolean }
): boolean {
  return parsePrefs(newValue).twitchWatchLayoutEnabled;
}
