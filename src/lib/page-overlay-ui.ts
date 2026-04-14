import type { ExtensionPrefs } from './prefs';
import { getNextFireAtForTab, tabHasActiveRefreshJob } from './page-overlay-schedule';
import type { AppState } from './types';

/** Resolved overlay visibility + schedule for a tab (Epic 3.0 — prefs gate + active job). */
export type PageOverlayUiState =
  | { show: false }
  | { show: true; nextFireAt: number | undefined };

export function getPageOverlayUiState(
  state: AppState,
  prefs: ExtensionPrefs,
  tabId: number
): PageOverlayUiState {
  if (!prefs.showPageOverlayTimer || !tabHasActiveRefreshJob(state, tabId)) {
    return { show: false };
  }
  return { show: true, nextFireAt: getNextFireAtForTab(state, tabId) };
}
