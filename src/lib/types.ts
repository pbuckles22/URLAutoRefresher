/** Aligned with doc/plan/EDGE_URL_AUTO_REFRESHER_PLAN.md data sketch. */

/** Persisted global/individual member row — URL-first (Epic 10.4); runtime tab id comes from resolve APIs. */
export type TargetRef = {
  targetUrl: string;
  label?: string;
};

/** Open-tab binding for scheduler / overlay — not persisted (built from `TargetRef` + `tabs.query`). */
export type ResolvedMemberTab = {
  tabId: number;
  windowId: number;
  /** Canonical member URL from storage (explicit row), or live tab URL for pattern matches. */
  targetUrl: string;
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
  /** Pause periodic refresh while Twitch reports live (default on). Opt out with `false`. */
  liveAwareRefresh?: boolean;
  /** Per-member live/offline from Twitch tab bridge; keys match member keys (Epic 8 globals). */
  memberStreamLive?: Record<string, boolean>;
  /** User override of auto live detection; keys match member keys (`true` = force live, `false` = force offline). */
  memberStreamLiveOverride?: Record<string, boolean>;
  /** Last successful scheduled refresh per member (ms). Resets the 45-min safety refresh clock. */
  memberLastRefreshAt?: Record<string, number>;
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
  /** User override of auto live detection (`true` = force live, `false` = force offline). */
  streamLiveOverride?: boolean;
  /** Last successful scheduled refresh (ms). Resets the 45-min safety refresh clock. */
  lastRefreshAt?: number;
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
