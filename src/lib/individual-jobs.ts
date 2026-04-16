import type { AppState, IndividualJob } from './types';

/**
 * Pure state updates for individual jobs (Epic 3.2+). Callers persist via `saveAppState`.
 */
export function removeIndividualJobById(state: AppState, jobId: string): AppState {
  return {
    ...state,
    individualJobs: state.individualJobs.filter((j) => j.id !== jobId),
  };
}

export function setIndividualJobEnabled(state: AppState, jobId: string, enabled: boolean): AppState {
  return {
    ...state,
    individualJobs: state.individualJobs.map((j) => {
      if (j.id !== jobId) {
        return j;
      }
      if (!enabled) {
        return { ...j, enabled: false, nextFireAt: undefined, streamLive: undefined };
      }
      return { ...j, enabled: true };
    }),
  };
}

export function replaceIndividualJob(state: AppState, updated: IndividualJob): AppState {
  const idx = state.individualJobs.findIndex((j) => j.id === updated.id);
  if (idx === -1) {
    return state;
  }
  const next = [...state.individualJobs];
  next[idx] = updated;
  return { ...state, individualJobs: next };
}
