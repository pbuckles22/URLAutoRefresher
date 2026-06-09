import type { PageOverlaySnapBackDebug } from './page-overlay-debug';

export type { PageOverlaySnapBackDebug };

/** Content script asks background for overlay visibility + schedule for sender tab. */
export const PAGE_OVERLAY_GET_STATE = 'urlAutoRefresher:pageOverlayGetState' as const;

/** Background nudges an existing overlay content script to re-sync (no script re-inject). */
export const PAGE_OVERLAY_SYNC_REQUEST = 'urlAutoRefresher:pageOverlaySyncRequest' as const;

export type PageOverlayBlipPack = {
  phrases: string[];
  regex?: string;
  targetUrl: string;
  maxPerMinute: number;
};

export type PageOverlayStateResponse =
  | { ok: false }
  | { ok: true; show: false; blip?: PageOverlayBlipPack }
  | {
      ok: true;
      show: true;
      mode: 'timer';
      nextFireAt: number | undefined;
      /** Set when this tab is driven by a global group (overlay pause). */
      globalGroupId?: string;
      /** Set when this tab is driven by an individual job (overlay pause). */
      individualJobId?: string;
      blip?: PageOverlayBlipPack;
      /** Snap-back testing strip (when pref on). */
      debug?: PageOverlaySnapBackDebug;
      /** Auto-paused because Twitch reports live (live-aware). */
      livePaused?: boolean;
    }
  | {
      ok: true;
      show: true;
      mode: 'paused';
      globalGroupId: string;
      blip?: PageOverlayBlipPack;
      debug?: PageOverlaySnapBackDebug;
      livePaused?: boolean;
    }
  | {
      ok: true;
      show: true;
      mode: 'paused';
      individualJobId: string;
      blip?: PageOverlayBlipPack;
      debug?: PageOverlaySnapBackDebug;
      livePaused?: boolean;
    };

/** Page → background: user-configured blip pattern matched; request target refresh (Epic 9). */
export const BLIP_REFRESH_REQUEST = 'urlAutoRefresher:blipRefreshRequest' as const;

/** Page → background: pause or resume this tab within a global group. */
export const GLOBAL_GROUP_TAB_PAUSE = 'urlAutoRefresher:globalGroupTabPause' as const;

export type GlobalGroupTabPauseMessage = {
  type: typeof GLOBAL_GROUP_TAB_PAUSE;
  groupId: string;
  paused: boolean;
};

/** Page → background: pause or resume this tab’s individual job from the overlay (same UX as global group pause). */
export const INDIVIDUAL_JOB_OVERLAY_PAUSE = 'urlAutoRefresher:individualJobOverlayPause' as const;

export type IndividualJobOverlayPauseMessage = {
  type: typeof INDIVIDUAL_JOB_OVERLAY_PAUSE;
  jobId: string;
  paused: boolean;
};

/** Twitch bridge → background: stream live/offline/unknown (Epic 8). */
export const TWITCH_LIVE_REPORT = 'urlAutoRefresher:twitchLiveReport' as const;

/** Background → Twitch tabs: live session changed (globals live-aware + layout/minimize). */
export const TWITCH_LIVE_STATE_PUSH = 'urlAutoRefresher:twitchLiveStatePush' as const;

export type TwitchLiveStatePushMessage = {
  type: typeof TWITCH_LIVE_STATE_PUSH;
  live: boolean | null;
  liveSessionActive: boolean;
};

export type TwitchLiveReportMessage = {
  type: typeof TWITCH_LIVE_REPORT;
  /** `null` = could not infer (reset stored signal to unknown). */
  live: boolean | null;
};

/** Background → content: Web Audio gain change (shortcuts or dashboard-routed set) — Epic 11. */
export const PRECISION_VOLUME_APPLY = 'urlAutoRefresher:precisionVolumeApply' as const;

/** Dashboard / side panel → background: forward apply payload to a tab (Epic 11.4). */
export const PRECISION_VOLUME_TAB_REQUEST = 'urlAutoRefresher:precisionVolumeTabRequest' as const;

export type PrecisionVolumeShortcutAction = 'volume-up' | 'volume-down' | 'panic-mute';

export type PrecisionVolumeApplyPayload =
  | { kind: 'shortcut'; action: PrecisionVolumeShortcutAction }
  | { kind: 'set-linear-gain'; linearGain: number };

export type PrecisionVolumeApplyMessage = {
  type: typeof PRECISION_VOLUME_APPLY;
} & PrecisionVolumeApplyPayload;

export type PrecisionVolumeTabRequestMessage = {
  type: typeof PRECISION_VOLUME_TAB_REQUEST;
  /** `null` = background resolves target (active / last content tab / override from prefs not used here). */
  tabId: number | null;
} & PrecisionVolumeApplyPayload;

export type PrecisionVolumeTabRouteResponse =
  | { ok: true }
  | { ok: false; reason: 'forbidden' | 'bad-gain' | 'send' };

export function precisionVolumeTabRequestToApply(
  msg: PrecisionVolumeTabRequestMessage
): PrecisionVolumeApplyMessage {
  if (msg.kind === 'shortcut') {
    return { type: PRECISION_VOLUME_APPLY, kind: 'shortcut', action: msg.action };
  }
  return { type: PRECISION_VOLUME_APPLY, kind: 'set-linear-gain', linearGain: msg.linearGain };
}
