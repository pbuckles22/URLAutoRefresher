import type { AppState } from './types';

/**
 * Tab close (Epic 10.4 URL-first): stored membership is URL-based; do not mutate targets or jobs here.
 * Scheduler disables jobs when refresh fails; global schedules prune on the next align pass.
 */
export function applyTabRemoved(state: AppState, _removedTabId: number): AppState {
  return state;
}
