import type { AppState } from './types';
import {
  parseStoredPayload,
  validateEnabledEnrollment,
  validateStateFields,
  validateUniqueIds,
} from './state';

export const STORAGE_KEY = 'urlAutoRefresher_state_v1' as const;

export async function loadAppState(): Promise<AppState> {
  const data = await chrome.storage.local.get(STORAGE_KEY);
  const raw = data[STORAGE_KEY as keyof typeof data];
  return parseStoredPayload(raw);
}

/**
 * Persists state after validation. Throws if ids, enrollment, or fields are invalid.
 */
export async function saveAppState(state: AppState): Promise<void> {
  const u = validateUniqueIds(state);
  if (!u.ok) {
    throw new Error(u.error);
  }
  const e = validateEnabledEnrollment(state);
  if (!e.ok) {
    throw new Error(e.error);
  }
  const f = validateStateFields(state);
  if (!f.ok) {
    throw new Error(f.error);
  }
  await chrome.storage.local.set({ [STORAGE_KEY]: state });
}
