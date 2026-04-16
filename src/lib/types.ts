/** Aligned with doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md data sketch. */

export type TargetRef = {
  tabId: number;
  windowId: number;
  targetUrl: string;
  label?: string;
};

export type GlobalGroup = {
  id: string;
  name: string;
  targets: TargetRef[];
  /** Lines with * wildcards; any open tab whose URL matches is included (including new tabs). */
  urlPatterns?: string[];
  /** Tab IDs in this group that skip scheduled refresh until resumed (overlay pause). */
  pausedTabIds?: number[];
  baseIntervalSec: number;
  jitterSec: number;
  enabled: boolean;
  /** @deprecated Prefer tabNextFireAt; kept for migration from older saves. */
  nextFireAt?: number;
  /** Per-tab next refresh (ms). Jitter is applied independently per tab. Keys are String(tabId). */
  tabNextFireAt?: Record<string, number>;
};

export type IndividualJob = {
  id: string;
  target: TargetRef;
  baseIntervalSec: number;
  jitterSec: number;
  enabled: boolean;
  /** User paused from page overlay; no scheduled refresh until resumed (like global group tab pause). */
  overlayPaused?: boolean;
  nextFireAt?: number;
  /** Epic 8: pause periodic refresh while Twitch reports the channel as live (content script). */
  liveAwareRefresh?: boolean;
  /** Last live/offline signal from the Twitch tab (`undefined` = unknown). */
  streamLive?: boolean;
  /** Epic 9: case-insensitive substring triggers for immediate refresh (user-defined). */
  blipWatchPhrases?: string[];
  /** Epic 9: optional user regex (case-insensitive flag). */
  blipWatchRegex?: string;
  /** Epic 9: max blip-triggered refreshes per rolling minute (default 8). */
  blipMaxPerMinute?: number;
};

export type AppState = {
  schemaVersion: number;
  globalGroups: GlobalGroup[];
  individualJobs: IndividualJob[];
};

export type Enrollment =
  | { kind: 'global'; groupId: string }
  | { kind: 'individual'; jobId: string };
