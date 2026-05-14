/**
 * Epic 13.A3: chrome.alarms callbacks for scheduled tab refresh (individual + global member).
 */

import { baseAndJitterMs } from './scheduler-align-state';
import { syncAlarmsWithState } from './scheduler-sync-alarms';
import type { ParsedAlarm } from '../lib/alarm-names';
import { memberKeyFromTargetUrl } from '../lib/member-url';
import { computeNextDelayMs } from '../lib/schedule';
import { LIVE_AWARE_POLL_MS } from '../lib/live-aware-constants';
import {
  globalGroupHasSchedulableConfig,
  resolveGlobalGroupTargets,
} from '../lib/global-group-targets';
import { resolveLiveTabIdForTargetUrl } from '../lib/resolve-live-tab';
import { loadAppState, saveAppState } from '../lib/storage';
import type { AppState } from '../lib/types';

function replaceAt<T>(arr: T[], i: number, v: T): T[] {
  const next = [...arr];
  next[i] = v;
  return next;
}

async function safeTabsUpdate(tabId: number, url: string): Promise<boolean> {
  try {
    await chrome.tabs.update(tabId, { url });
    return true;
  } catch {
    return false;
  }
}

async function handleIndividualJobAlarm(jobId: string, initialState: AppState): Promise<void> {
  let state = initialState;
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
}

async function handleGlobalMemberAlarm(
  groupId: string,
  memberKey: string,
  initialState: AppState
): Promise<void> {
  let state = initialState;
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
}

/**
 * Handles parsed scheduler alarm names (not badge tick). Caller loads state once per tick.
 */
export async function dispatchSchedulerAlarm(parsed: ParsedAlarm): Promise<void> {
  const state = await loadAppState();

  if (parsed.kind === 'individual') {
    await handleIndividualJobAlarm(parsed.id, state);
    return;
  }

  if (parsed.kind === 'global' || parsed.kind === 'globalTab') {
    await syncAlarmsWithState(await loadAppState());
    return;
  }

  if (parsed.kind === 'globalMember') {
    await handleGlobalMemberAlarm(parsed.groupId, parsed.memberKey, state);
  }
}
