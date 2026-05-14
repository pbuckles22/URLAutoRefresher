/**
 * Epic 2: chrome.alarms ↔ AppState, tabs.update on fire, nextFireAt, tab lifecycle.
 */

import { BADGE_TICK_ALARM, refreshActionBadge } from './badge';
import { alarmNameGlobalMember, alarmNameIndividual, parseAlarmName } from '../lib/alarm-names';
import { computeAlarmWhen } from '../lib/alarm-schedule';
import { memberKeyFromTargetUrl } from '../lib/member-url';
import { computeNextDelayMs } from '../lib/schedule';
import { LIVE_AWARE_POLL_MS } from '../lib/live-aware-constants';
import {
  globalGroupHasSchedulableConfig,
  resolveGlobalGroupTargets,
} from '../lib/global-group-targets';
import { resolveLiveTabIdForTargetUrl } from '../lib/resolve-live-tab';
import { loadAppState, saveAppState, STORAGE_KEY } from '../lib/storage';
import { applyTabRemoved } from '../lib/tab-lifecycle';
import type { AppState, GlobalGroup } from '../lib/types';

const STORAGE_DEBOUNCE_MS = 150;

let storageDebounce: ReturnType<typeof setTimeout> | undefined;

function baseAndJitterMs(thing: { baseIntervalSec: number; jitterSec: number }) {
  return {
    baseMs: thing.baseIntervalSec * 1000,
    jitterMs: thing.jitterSec * 1000,
  };
}

function memberNextFireAtSig(m: Record<string, number> | undefined): string {
  if (!m || Object.keys(m).length === 0) {
    return '';
  }
  return Object.keys(m)
    .sort((a, b) => a.localeCompare(b))
    .map((k) => `${k}:${m[k]}`)
    .join('|');
}

function alignIndividualJobsState(state: AppState, now: number): AppState {
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

async function alignGlobalGroupsState(state: AppState, now: number): Promise<AppState> {
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

async function alignAppState(state: AppState, now: number): Promise<AppState> {
  let s = alignIndividualJobsState(state, now);
  s = await alignGlobalGroupsState(s, now);
  return s;
}

function stateSchedulingEqual(a: AppState, b: AppState): boolean {
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

async function clearOurAlarms(): Promise<void> {
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

async function safeTabsUpdate(tabId: number, url: string): Promise<boolean> {
  try {
    await chrome.tabs.update(tabId, { url });
    return true;
  } catch {
    return false;
  }
}

async function onAlarmFired(alarm: chrome.alarms.Alarm): Promise<void> {
  if (alarm.name === BADGE_TICK_ALARM) {
    await refreshActionBadge();
    return;
  }

  const parsed = parseAlarmName(alarm.name);
  if (!parsed) {
    return;
  }

  try {
    let state = await loadAppState();

    if (parsed.kind === 'individual') {
      const jobId = parsed.id;
      let idx = state.individualJobs.findIndex((j) => j.id === jobId);
      if (idx < 0) {
        return;
      }
      let job = state.individualJobs[idx];
      if (!job.enabled || job.overlayPaused) {
        return;
      }

      if (job.liveAwareRefresh && job.streamLive === true) {
        const nextFireAt = Date.now() + LIVE_AWARE_POLL_MS;
        state = await loadAppState();
        idx = state.individualJobs.findIndex((j) => j.id === jobId);
        if (idx < 0) {
          return;
        }
        job = state.individualJobs[idx];
        if (!job.enabled || !job.liveAwareRefresh || job.streamLive !== true) {
          await syncAlarmsWithState(state);
          return;
        }
        const nextJobs = replaceAt(state.individualJobs, idx, { ...job, nextFireAt });
        state = { ...state, individualJobs: nextJobs };
        await saveAppState(state);
        await syncAlarmsWithState(state);
        return;
      }

      const { targetUrl } = job.target;
      const resolvedTabId = await resolveLiveTabIdForTargetUrl(targetUrl, 0);
      if (resolvedTabId === undefined) {
        const nextJobs = replaceAt(state.individualJobs, idx, {
          ...job,
          enabled: false,
          nextFireAt: undefined,
        });
        state = { ...state, individualJobs: nextJobs };
        await saveAppState(state);
        await syncAlarmsWithState(state);
        return;
      }
      const refreshTabId = resolvedTabId;

      const ok = await safeTabsUpdate(refreshTabId, targetUrl);

      state = await loadAppState();
      idx = state.individualJobs.findIndex((j) => j.id === jobId);
      if (idx < 0) {
        return;
      }
      job = state.individualJobs[idx];
      if (!job.enabled) {
        return;
      }

      if (!ok) {
        const nextJobs = replaceAt(state.individualJobs, idx, {
          ...job,
          enabled: false,
          nextFireAt: undefined,
        });
        state = { ...state, individualJobs: nextJobs };
        await saveAppState(state);
        await syncAlarmsWithState(state);
        return;
      }

      const { baseMs, jitterMs } = baseAndJitterMs(job);
      const nextFireAt = Date.now() + computeNextDelayMs(baseMs, jitterMs);
      const nextJob = { ...job, nextFireAt };
      const nextJobs = replaceAt(state.individualJobs, idx, nextJob);
      state = { ...state, individualJobs: nextJobs };
      await saveAppState(state);
      await syncAlarmsWithState(state);
      return;
    }

    if (parsed.kind === 'global') {
      await syncAlarmsWithState(await loadAppState());
      return;
    }

    if (parsed.kind === 'globalTab') {
      await syncAlarmsWithState(await loadAppState());
      return;
    }

    if (parsed.kind !== 'globalMember') {
      return;
    }
    const { groupId, memberKey } = parsed;
    let gIdx = state.globalGroups.findIndex((g) => g.id === groupId);
    if (gIdx < 0) {
      return;
    }
    let group = state.globalGroups[gIdx];
    if (!group.enabled || !globalGroupHasSchedulableConfig(group)) {
      return;
    }

    const resolved = await resolveGlobalGroupTargets(group);
    const paused = new Set(group.pausedMemberKeys ?? []);

    const resolvedHit = resolved.find((t) => memberKeyFromTargetUrl(t.targetUrl) === memberKey);
    const storedUrl = group.targets.find(
      (t) => memberKeyFromTargetUrl(t.targetUrl) === memberKey
    )?.targetUrl;
    const memberUrl = resolvedHit?.targetUrl ?? storedUrl;
    if (!memberUrl) {
      await syncAlarmsWithState(await loadAppState());
      return;
    }

    const hintTabId = resolvedHit?.tabId ?? 0;

    const resolvedLiveTabId = await resolveLiveTabIdForTargetUrl(
      memberUrl,
      hintTabId >= 1 ? hintTabId : 0
    );
    const refreshTabId = resolvedLiveTabId ?? (hintTabId >= 1 ? hintTabId : undefined);
    if (refreshTabId === undefined) {
      await syncAlarmsWithState(await loadAppState());
      return;
    }

    if (paused.has(memberKey)) {
      await syncAlarmsWithState(await loadAppState());
      return;
    }

    const ok = await safeTabsUpdate(refreshTabId, memberUrl);

    state = await loadAppState();
    gIdx = state.globalGroups.findIndex((g) => g.id === groupId);
    if (gIdx < 0) {
      return;
    }
    group = state.globalGroups[gIdx];
    if (!group.enabled || !globalGroupHasSchedulableConfig(group)) {
      return;
    }

    const { baseMs, jitterMs } = baseAndJitterMs(group);

    const memberNextFireAt = { ...(group.memberNextFireAt ?? {}) };

    if (!ok) {
      delete memberNextFireAt[memberKey];
      const hasPatterns = group.urlPatterns?.some((p) => p.trim()) ?? false;
      const enabled = group.enabled && (group.targets.length > 0 || hasPatterns);
      const nextGroups = replaceAt(state.globalGroups, gIdx, {
        ...group,
        memberNextFireAt: Object.keys(memberNextFireAt).length > 0 ? memberNextFireAt : undefined,
        enabled,
        nextFireAt: undefined,
      });
      state = { ...state, globalGroups: nextGroups };
      await saveAppState(state);
      await syncAlarmsWithState(state);
      return;
    }

    memberNextFireAt[memberKey] = Date.now() + computeNextDelayMs(baseMs, jitterMs);
    const nextGroups = replaceAt(state.globalGroups, gIdx, {
      ...group,
      memberNextFireAt,
      nextFireAt: undefined,
    });
    state = { ...state, globalGroups: nextGroups };
    await saveAppState(state);
    await syncAlarmsWithState(state);
  } finally {
    await refreshActionBadge();
  }
}

function replaceAt<T>(arr: T[], i: number, v: T): T[] {
  const next = [...arr];
  next[i] = v;
  return next;
}

export async function onTabRemoved(tabId: number): Promise<void> {
  let state = await loadAppState();
  state = applyTabRemoved(state, tabId);
  await saveAppState(state);
  await syncAlarmsWithState(state);
  await refreshActionBadge();
}

export async function bootstrapScheduling(): Promise<void> {
  const state = await loadAppState();
  await syncAlarmsWithState(state);
  await refreshActionBadge();
}

export function attachSchedulingListeners(): void {
  chrome.alarms.onAlarm.addListener((a) => {
    void onAlarmFired(a);
  });

  chrome.tabs.onRemoved.addListener((tabId) => {
    void onTabRemoved(tabId);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !(STORAGE_KEY in changes)) {
      return;
    }
    clearTimeout(storageDebounce);
    storageDebounce = setTimeout(() => {
      void bootstrapScheduling();
    }, STORAGE_DEBOUNCE_MS);
  });
}
