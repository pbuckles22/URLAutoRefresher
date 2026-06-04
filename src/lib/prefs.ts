export const PREFS_STORAGE_KEY = 'urlAutoRefresher_prefs_v1' as const;

export type PrecisionVolumePrefs = {
  /** Last tab the dashboard/side panel volume UI targeted; null when unset. */
  lastTabId: number | null;
  /** Linear gain sent from the UI (100% numeric = 1.0); may be negative for phase invert. */
  lastLinearGain: number;
};

export type ExtensionPrefs = {
  /** Large Min/Sec countdown injected on pages with an active refresh job. Default true. */
  showPageOverlayTimer: boolean;
  /** Show tab id / refresh URL debug strip on the overlay (snap-back UAT). Default true. */
  showOverlaySnapBackDebug: boolean;
  /** Epic 11.5 — precision volume dashboard state. */
  precisionVolume: PrecisionVolumePrefs;
};

export const DEFAULT_PRECISION_VOLUME: PrecisionVolumePrefs = {
  lastTabId: null,
  /** Zero-blast default: silent until the user raises the fader (saved value auto-applies on each page). */
  lastLinearGain: 0,
};

export const DEFAULT_PREFS: ExtensionPrefs = {
  showPageOverlayTimer: true,
  showOverlaySnapBackDebug: true,
  precisionVolume: { ...DEFAULT_PRECISION_VOLUME },
};

function parsePrecisionVolumePrefs(raw: unknown): PrecisionVolumePrefs {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_PRECISION_VOLUME };
  }
  const o = raw as Record<string, unknown>;
  let lastTabId: number | null = DEFAULT_PRECISION_VOLUME.lastTabId;
  const tid = o.lastTabId;
  if (tid === null) {
    lastTabId = null;
  } else if (typeof tid === 'number' && Number.isInteger(tid) && tid >= 0) {
    lastTabId = tid;
  }
  let lastLinearGain = DEFAULT_PRECISION_VOLUME.lastLinearGain;
  if (typeof o.lastLinearGain === 'number' && Number.isFinite(o.lastLinearGain)) {
    lastLinearGain = o.lastLinearGain;
  }
  return { lastTabId, lastLinearGain };
}

export function parsePrefs(raw: unknown): ExtensionPrefs {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ...DEFAULT_PREFS, precisionVolume: { ...DEFAULT_PRECISION_VOLUME } };
  }
  const o = raw as Record<string, unknown>;
  const show =
    typeof o.showPageOverlayTimer === 'boolean'
      ? o.showPageOverlayTimer
      : DEFAULT_PREFS.showPageOverlayTimer;
  const showDebug =
    typeof o.showOverlaySnapBackDebug === 'boolean'
      ? o.showOverlaySnapBackDebug
      : DEFAULT_PREFS.showOverlaySnapBackDebug;
  return {
    showPageOverlayTimer: show,
    showOverlaySnapBackDebug: showDebug,
    precisionVolume: parsePrecisionVolumePrefs(o.precisionVolume),
  };
}

export async function loadExtensionPrefs(): Promise<ExtensionPrefs> {
  const data = await chrome.storage.local.get(PREFS_STORAGE_KEY);
  const raw = data[PREFS_STORAGE_KEY as keyof typeof data];
  return parsePrefs(raw);
}

export type SaveExtensionPrefsInput = {
  showPageOverlayTimer?: boolean;
  showOverlaySnapBackDebug?: boolean;
  precisionVolume?: Partial<PrecisionVolumePrefs>;
};

export async function saveExtensionPrefs(partial: SaveExtensionPrefsInput): Promise<void> {
  const existing = await loadExtensionPrefs();
  const next: ExtensionPrefs = {
    showPageOverlayTimer: partial.showPageOverlayTimer ?? existing.showPageOverlayTimer,
    showOverlaySnapBackDebug: partial.showOverlaySnapBackDebug ?? existing.showOverlaySnapBackDebug,
    precisionVolume: {
      ...existing.precisionVolume,
      ...(partial.precisionVolume ?? {}),
    },
  };
  await chrome.storage.local.set({ [PREFS_STORAGE_KEY]: next });
}
