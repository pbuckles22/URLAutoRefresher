/** Content script asks background for overlay visibility + schedule for sender tab. */
export const PAGE_OVERLAY_GET_STATE = 'urlAutoRefresher:pageOverlayGetState' as const;

export type PageOverlayStateResponse =
  | { ok: true; show: false }
  | { ok: true; show: true; nextFireAt: number | undefined };
