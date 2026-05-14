/**
 * Epic 13.A2: chrome.alarms create/clear driven by aligned AppState.
 */

import { alignAppState, baseAndJitterMs, memberNextFireAtSig } from './scheduler-align-state';
import { alarmNameGlobalMember, alarmNameIndividual, parseAlarmName } from '../lib/alarm-names';
import { computeAlarmWhen } from '../lib/alarm-schedule';
import { globalGroupHasSchedulableConfig } from '../lib/global-group-targets';
import { saveAppState } from '../lib/storage';
import type { AppState } from '../lib/types';

/** Exported for Tier 1 tests; used to decide whether alignment requires a storage write. */
export function stateSchedulingEqual(a: AppState, b: AppState): boolean {
  const pick = (s: AppState) =>
    JSON.stringify({
      ij: s.individualJobs.map((j) => ({
        id: j.id,
        enabled: j.enabled,
        op: j.overlayPaused,
        nf: j.nextFireAt,
      })),
      gg: s.globalGroups.map((g) => ({
        id: g.id,
        enabled: g.enabled,
        nf: g.nextFireAt,
        tnf: memberNextFireAtSig(g.memberNextFireAt),
        tc: g.targets.length,
        pc: g.urlPatterns?.length ?? 0,
      })),
    });
  return pick(a) === pick(b);
}

export async function clearOurAlarms(): Promise<void> {
  const all = await chrome.alarms.getAll();
  for (const a of all) {
    if (parseAlarmName(a.name)) {
      await chrome.alarms.clear(a.name);
    }
  }
}

export async function syncAlarmsWithState(state: AppState): Promise<void> {
  const now = Date.now();
  const aligned = await alignAppState(state, now);

  if (!stateSchedulingEqual(state, aligned)) {
    await saveAppState(aligned);
    state = aligned;
  }

  await clearOurAlarms();

  for (const job of state.individualJobs) {
    if (!job.enabled || job.overlayPaused) {
      continue;
    }
    const { baseMs, jitterMs } = baseAndJitterMs(job);
    const when = job.nextFireAt ?? computeAlarmWhen(now, undefined, baseMs, jitterMs);
    await chrome.alarms.create(alarmNameIndividual(job.id), { when });
  }

  for (const group of state.globalGroups) {
    if (!group.enabled || !globalGroupHasSchedulableConfig(group)) {
      continue;
    }
    const tabMap = group.memberNextFireAt;
    if (!tabMap || Object.keys(tabMap).length === 0) {
      continue;
    }
    for (const [memberKey, when] of Object.entries(tabMap)) {
      if (typeof memberKey !== 'string' || memberKey.length === 0) {
        continue;
      }
      await chrome.alarms.create(alarmNameGlobalMember(group.id, memberKey), { when });
    }
  }
}
