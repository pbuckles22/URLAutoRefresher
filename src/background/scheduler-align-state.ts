/**
 * Epic 13.A1: align persisted schedule fields (nextFireAt / memberNextFireAt) with chrome.alarms policy.
 */

import { computeAlarmWhen } from '../lib/alarm-schedule';
import { memberKeyFromTargetUrl } from '../lib/member-url';
import { computeNextDelayMs } from '../lib/schedule';
import {
  globalGroupHasSchedulableConfig,
  resolveGlobalGroupTargets,
} from '../lib/global-group-targets';
import type { AppState, GlobalGroup } from '../lib/types';

export function baseAndJitterMs(thing: { baseIntervalSec: number; jitterSec: number }) {
  return {
    baseMs: thing.baseIntervalSec * 1000,
    jitterMs: thing.jitterSec * 1000,
  };
}

export function memberNextFireAtSig(m: Record<string, number> | undefined): string {
  if (!m || Object.keys(m).length === 0) {
    return '';
  }
  return Object.keys(m)
    .sort((a, b) => a.localeCompare(b))
    .map((k) => `${k}:${m[k]}`)
    .join('|');
}

export function alignIndividualJobsState(state: AppState, now: number): AppState {
  const individualJobs = state.individualJobs.map((job) => {
    if (!job.enabled) {
      return job.nextFireAt === undefined ? job : { ...job, nextFireAt: undefined };
    }
    if (job.overlayPaused) {
      return job.nextFireAt === undefined ? job : { ...job, nextFireAt: undefined };
    }
    const { baseMs, jitterMs } = baseAndJitterMs(job);
    const when = computeAlarmWhen(now, job.nextFireAt, baseMs, jitterMs);
    return { ...job, nextFireAt: when };
  });
  return { ...state, individualJobs };
}

export async function alignGlobalGroupsState(state: AppState, now: number): Promise<AppState> {
  const globalGroups: GlobalGroup[] = [];
  for (const g of state.globalGroups) {
    if (!g.enabled || !globalGroupHasSchedulableConfig(g)) {
      const clean =
        g.nextFireAt === undefined &&
        (g.memberNextFireAt === undefined || Object.keys(g.memberNextFireAt).length === 0)
          ? g
          : { ...g, nextFireAt: undefined, memberNextFireAt: undefined };
      globalGroups.push(clean);
      continue;
    }

    const { baseMs, jitterMs } = baseAndJitterMs(g);
    const resolved = await resolveGlobalGroupTargets(g);
    const paused = new Set(g.pausedMemberKeys ?? []);
    const activeMemberKeys = new Set<string>();
    for (const t of resolved) {
      const mk = memberKeyFromTargetUrl(t.targetUrl);
      if (!mk || paused.has(mk)) {
        continue;
      }
      activeMemberKeys.add(mk);
    }

    let memberNextFireAt: Record<string, number> = { ...(g.memberNextFireAt ?? {}) };

    const schedulableMemberKeys = [...activeMemberKeys];
    const legacyOnly =
      Object.keys(memberNextFireAt).length === 0 &&
      g.nextFireAt != null &&
      schedulableMemberKeys.length > 0;
    if (legacyOnly) {
      memberNextFireAt = {};
      for (const mk of schedulableMemberKeys) {
        memberNextFireAt[mk] = now + computeNextDelayMs(baseMs, jitterMs);
      }
    }

    for (const mk of schedulableMemberKeys) {
      if (memberNextFireAt[mk] === undefined) {
        memberNextFireAt[mk] = now + computeNextDelayMs(baseMs, jitterMs);
      } else {
        memberNextFireAt[mk] = computeAlarmWhen(now, memberNextFireAt[mk], baseMs, jitterMs);
      }
    }

    for (const key of Object.keys(memberNextFireAt)) {
      if (!activeMemberKeys.has(key)) {
        delete memberNextFireAt[key];
      }
    }

    globalGroups.push({
      ...g,
      memberNextFireAt: Object.keys(memberNextFireAt).length > 0 ? memberNextFireAt : undefined,
      nextFireAt: undefined,
    });
  }
  return { ...state, globalGroups };
}

export async function alignAppState(state: AppState, now: number): Promise<AppState> {
  let s = alignIndividualJobsState(state, now);
  s = await alignGlobalGroupsState(s, now);
  return s;
}
