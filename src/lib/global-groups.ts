import type { AppState, GlobalGroup } from './types';

/**
 * Pure state updates for global groups (Epic 4.2). Callers persist via `saveAppState`.
 */
export function removeGlobalGroupById(state: AppState, groupId: string): AppState {
  return {
    ...state,
    globalGroups: state.globalGroups.filter((g) => g.id !== groupId),
  };
}

export function setGlobalGroupEnabled(state: AppState, groupId: string, enabled: boolean): AppState {
  return {
    ...state,
    globalGroups: state.globalGroups.map((g) => {
      if (g.id !== groupId) {
        return g;
      }
      if (!enabled) {
        return { ...g, enabled: false, nextFireAt: undefined, tabNextFireAt: undefined };
      }
      return { ...g, enabled: true };
    }),
  };
}

export function replaceGlobalGroup(state: AppState, updated: GlobalGroup): AppState {
  const idx = state.globalGroups.findIndex((g) => g.id === updated.id);
  if (idx === -1) {
    return state;
  }
  const next = [...state.globalGroups];
  next[idx] = updated;
  return { ...state, globalGroups: next };
}
