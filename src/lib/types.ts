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
  /** Member rows paused from overlay; keys match `memberKeyFromTargetUrl(targetUrl)` (Epic 10.3). */
  pausedMemberKeys?: string[];
  baseIntervalSec: number;
  jitterSec: number;
  enabled: boolean;
  /** @deprecated Prefer memberNextFireAt; kept for migration from older saves. */
  nextFireAt?: number;
  /** Per-member next refresh (ms). Keys match `memberKeyFromTargetUrl(targetUrl)` (Epic 10.3). */
  memberNextFireAt?: Record<string, number>;
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
