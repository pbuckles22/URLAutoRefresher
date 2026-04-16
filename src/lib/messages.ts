/** Content script asks background for overlay visibility + schedule for sender tab. */
export const PAGE_OVERLAY_GET_STATE = 'urlAutoRefresher:pageOverlayGetState' as const;

export type PageOverlayBlipPack = {
  phrases: string[];
  regex?: string;
  targetUrl: string;
  maxPerMinute: number;
};

export type PageOverlayStateResponse =
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
    }
  | { ok: true; show: true; mode: 'paused'; globalGroupId: string; blip?: PageOverlayBlipPack }
  | { ok: true; show: true; mode: 'paused'; individualJobId: string; blip?: PageOverlayBlipPack };

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

export type TwitchLiveReportMessage = {
  type: typeof TWITCH_LIVE_REPORT;
  /** `null` = could not infer (reset stored signal to unknown). */
  live: boolean | null;
};
