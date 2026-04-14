/** Aligned with Docs/EDGE_URL_AUTO_REFRESHER_PLAN.md data sketch. */

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
  baseIntervalSec: number;
  jitterSec: number;
  enabled: boolean;
  nextFireAt?: number;
};

export type IndividualJob = {
  id: string;
  target: TargetRef;
  baseIntervalSec: number;
  jitterSec: number;
  enabled: boolean;
  nextFireAt?: number;
};

export type AppState = {
  schemaVersion: number;
  globalGroups: GlobalGroup[];
  individualJobs: IndividualJob[];
};

export type Enrollment =
  | { kind: 'global'; groupId: string }
  | { kind: 'individual'; jobId: string };
