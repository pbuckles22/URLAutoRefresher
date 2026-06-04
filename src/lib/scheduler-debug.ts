/**
 * Service-worker console logging for snap-back / scheduler UAT (gated by prefs).
 */
import { loadExtensionPrefs } from './prefs';

let cachedEnabled: boolean | undefined;

export function clearSchedulerDebugCache(): void {
  cachedEnabled = undefined;
}

export async function isSchedulerDebugEnabled(): Promise<boolean> {
  if (cachedEnabled === undefined) {
    const prefs = await loadExtensionPrefs();
    cachedEnabled = prefs.showOverlaySnapBackDebug;
  }
  return cachedEnabled;
}

/** Logs to the extension service worker console when overlay snap-back debug is enabled. */
export async function schedLog(message: string, detail?: Record<string, unknown>): Promise<void> {
  if (!(await isSchedulerDebugEnabled())) {
    return;
  }
  if (detail !== undefined) {
    // eslint-disable-next-line no-console -- UAT-only scheduler trace (pref-gated)
    console.log(`[URL Auto Refresher] ${message}`, detail);
  } else {
    // eslint-disable-next-line no-console -- UAT-only scheduler trace (pref-gated)
    console.log(`[URL Auto Refresher] ${message}`);
  }
}
