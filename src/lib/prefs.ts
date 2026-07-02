import { extensionRuntimeContextLikelyAlive } from './extension-runtime-send';
import {
  DEFAULT_OVERLAY_POSITION,
  parseOverlayPosition,
  type OverlayPosition,
} from './overlay-position';

export const PREFS_STORAGE_KEY = 'urlAutoRefresher_prefs_v1' as const;

export type PrecisionVolumePrefs = {
  /** Explicit tab override from the picker; null = active tab in last-focused window. */
  lastTabId: number | null;
  /** Linear gain sent from the UI (100% numeric = 1.0); may be negative for phase invert. */
  lastLinearGain: number;
};

export type ExtensionPrefs = {
  /** Large Min/Sec countdown injected on pages with an active refresh job. Default true. */
  showPageOverlayTimer: boolean;
  /** Show tab id / refresh URL debug strip on the overlay (snap-back UAT). Default true. */
  showOverlaySnapBackDebug: boolean;
  /** Epic 15 — live/offline Twitch watch layout (theater + chat policy). Default true. */
  twitchWatchLayoutEnabled: boolean;
  /** Backlog #12 — auto-click channel points bonus on TwitchFavs home tabs. Default off. */
  twitchChannelPointsBonusEnabled: boolean;
  /** Epic 11.5 — precision volume dashboard state. */
  precisionVolume: PrecisionVolumePrefs;
  /** Backlog #8 — overlay snap/drag position (global, persisted across refresh). */
  overlayPosition: OverlayPosition;
};

export const DEFAULT_PRECISION_VOLUME: PrecisionVolumePrefs = {
  lastTabId: null,
  /** Unity gain when unset — no change to page audio until the user moves the fader. */
  lastLinearGain: 1,
};

export const DEFAULT_PREFS: ExtensionPrefs = {
  showPageOverlayTimer: true,
  showOverlaySnapBackDebug: true,
  twitchWatchLayoutEnabled: true,
  twitchChannelPointsBonusEnabled: false,
  precisionVolume: { ...DEFAULT_PRECISION_VOLUME },
  overlayPosition: { ...DEFAULT_OVERLAY_POSITION },
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
  const watchLayout =
    typeof o.twitchWatchLayoutEnabled === 'boolean'
      ? o.twitchWatchLayoutEnabled
      : DEFAULT_PREFS.twitchWatchLayoutEnabled;
  const channelPointsBonus =
    typeof o.twitchChannelPointsBonusEnabled === 'boolean'
      ? o.twitchChannelPointsBonusEnabled
      : DEFAULT_PREFS.twitchChannelPointsBonusEnabled;
  return {
    showPageOverlayTimer: show,
    showOverlaySnapBackDebug: showDebug,
    twitchWatchLayoutEnabled: watchLayout,
    twitchChannelPointsBonusEnabled: channelPointsBonus,
    precisionVolume: parsePrecisionVolumePrefs(o.precisionVolume),
    overlayPosition: parseOverlayPosition(o.overlayPosition),
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
  twitchWatchLayoutEnabled?: boolean;
  twitchChannelPointsBonusEnabled?: boolean;
  precisionVolume?: Partial<PrecisionVolumePrefs>;
  overlayPosition?: OverlayPosition;
};

export async function saveExtensionPrefs(partial: SaveExtensionPrefsInput): Promise<void> {
  const existing = await loadExtensionPrefs();
  const next: ExtensionPrefs = {
    showPageOverlayTimer: partial.showPageOverlayTimer ?? existing.showPageOverlayTimer,
    showOverlaySnapBackDebug: partial.showOverlaySnapBackDebug ?? existing.showOverlaySnapBackDebug,
    twitchWatchLayoutEnabled: partial.twitchWatchLayoutEnabled ?? existing.twitchWatchLayoutEnabled,
    twitchChannelPointsBonusEnabled:
      partial.twitchChannelPointsBonusEnabled ?? existing.twitchChannelPointsBonusEnabled,
    precisionVolume: {
      ...existing.precisionVolume,
      ...(partial.precisionVolume ?? {}),
    },
    overlayPosition: partial.overlayPosition ?? existing.overlayPosition,
  };
  await chrome.storage.local.set({ [PREFS_STORAGE_KEY]: next });
}

/** MV3: skip chrome.storage when the content-script runtime is invalidated. */
export async function saveExtensionPrefsIfRuntimeAlive(
  partial: SaveExtensionPrefsInput
): Promise<boolean> {
  if (!extensionRuntimeContextLikelyAlive()) {
    return false;
  }
  try {
    await saveExtensionPrefs(partial);
    return true;
  } catch {
    return false;
  }
}
