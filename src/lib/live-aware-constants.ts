/** When a live-aware job is paused for a live Twitch stream, reschedule this often (ms) without refreshing. */
export const LIVE_AWARE_POLL_MS = 25_000;

/** After stream goes offline, fire the next refresh at least this soon (ms). */
export const LIVE_AWARE_RESUME_SOON_MS = 3_000;
