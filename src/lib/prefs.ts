export const PREFS_STORAGE_KEY = 'urlAutoRefresher_prefs_v1' as const;

export type ExtensionPrefs = {
  /** Large Min/Sec countdown injected on pages with an active refresh job. Default true. */
  showPageOverlayTimer: boolean;
};

export const DEFAULT_PREFS: ExtensionPrefs = {
  showPageOverlayTimer: true,
};

export function parsePrefs(raw: unknown): ExtensionPrefs {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_PREFS };
  }
  const o = raw as Record<string, unknown>;
  const show =
    typeof o.showPageOverlayTimer === 'boolean'
      ? o.showPageOverlayTimer
      : DEFAULT_PREFS.showPageOverlayTimer;
  return { showPageOverlayTimer: show };
}

export async function loadExtensionPrefs(): Promise<ExtensionPrefs> {
  const data = await chrome.storage.local.get(PREFS_STORAGE_KEY);
  const raw = data[PREFS_STORAGE_KEY as keyof typeof data];
  return parsePrefs(raw);
}

export async function saveExtensionPrefs(prefs: ExtensionPrefs): Promise<void> {
  await chrome.storage.local.set({ [PREFS_STORAGE_KEY]: prefs });
}
