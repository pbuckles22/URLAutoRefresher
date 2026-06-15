/**
 * Epic 13.A3: chrome.alarms callbacks for scheduled tab refresh (individual + global member).
 */

import { baseAndJitterMs } from './scheduler-align-state';
import { syncAlarmsWithState } from './scheduler-sync-alarms';
import type { ParsedAlarm } from '../lib/alarm-names';
import { memberKeyFromTargetUrl } from '../lib/member-url';
import { computeNextDelayMs } from '../lib/schedule';
import { LIVE_AWARE_MAX_IDLE_MS, LIVE_AWARE_POLL_MS } from '../lib/live-aware-constants';
import {
  getEffectiveMemberStreamLive,
  patchGlobalMemberAfterSuccessfulRefresh,
  shouldForceRefreshDespiteLivePause,
} from '../lib/global-live-aware';
import {
  globalGroupHasSchedulableConfig,
  resolveGlobalGroupTargets,
} from '../lib/global-group-targets';
import { resolveLiveTabIdForTargetUrl } from '../lib/resolve-live-tab';
import { schedLog } from '../lib/scheduler-debug';
import { loadAppState, saveAppState } from '../lib/storage';
import type { AppState } from '../lib/types';
import { getLastSchedTabId, rememberSchedTabId } from '../lib/sched-member-tab-hint';

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

  const effectiveLive = job.streamLiveOverride === true || job.streamLive === true;

  if (job.liveAwareRefresh && effectiveLive) {
    const now = Date.now();
    const lastRefresh = job.lastRefreshAt;
    const forceRefresh = lastRefresh !== undefined && now - lastRefresh >= LIVE_AWARE_MAX_IDLE_MS;
    if (!forceRefresh) {
      const nextFireAt = now + LIVE_AWARE_POLL_MS;
      state = await loadAppState();
      idx = state.individualJobs.findIndex((j) => j.id === jobId);
      if (idx < 0) {
        return;
      }
      job = state.individualJobs[idx];
      const stillLive = job.streamLiveOverride === true || job.streamLive === true;
      if (!job.enabled || !job.liveAwareRefresh || !stillLive) {
        await syncAlarmsWithState(state);
        return;
      }
      const nextJobs = replaceAt(state.individualJobs, idx, { ...job, nextFireAt });
      state = { ...state, individualJobs: nextJobs };
      await saveAppState(state);
      await syncAlarmsWithState(state);
      return;
    }
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
  const nextJob = {
    ...job,
    nextFireAt,
    lastRefreshAt: Date.now(),
    streamLive: undefined,
    streamLiveOverride: undefined,
  };
  const nextJobs = replaceAt(state.individualJobs, idx, nextJob);
  state = { ...state, individualJobs: nextJobs };
  await saveAppState(state);
  await syncAlarmsWithState(state);
}

async function skipGlobalMemberAlarmForLiveStream(
  groupId: string,
  memberKey: string
): Promise<boolean> {
  let state = await loadAppState();
  const gIdx = state.globalGroups.findIndex((g) => g.id === groupId);
  if (gIdx < 0) {
    return false;
  }
  const group = state.globalGroups[gIdx];
  if (
    !getEffectiveMemberStreamLive(group, memberKey) ||
    group.liveAwareRefresh === false ||
    !group.enabled ||
    !globalGroupHasSchedulableConfig(group)
  ) {
    return false;
  }
  const now = Date.now();
  if (shouldForceRefreshDespiteLivePause(group, memberKey, now)) {
    await schedLog('global member alarm: max idle exceeded (force refresh despite live)', {
      memberKey,
    });
    return false;
  }
  await schedLog('global member alarm: member live (live-aware skip)', { memberKey });
  const memberNextFireAt = {
    ...(group.memberNextFireAt ?? {}),
    [memberKey]: now + LIVE_AWARE_POLL_MS,
  };
  const nextGroups = replaceAt(state.globalGroups, gIdx, {
    ...group,
    memberNextFireAt,
    nextFireAt: undefined,
  });
  state = { ...state, globalGroups: nextGroups };
  await saveAppState(state);
  await syncAlarmsWithState(state);
  return true;
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

  const rememberedTabId = getLastSchedTabId(groupId, memberKey);
  const hintTabId = resolvedHit?.tabId ?? rememberedTabId ?? 0;

  const resolvedLiveTabId = await resolveLiveTabIdForTargetUrl(
    memberUrl,
    hintTabId >= 1 ? hintTabId : 0,
    { allowUrlDriftFallback: true }
  );
  const refreshTabId = resolvedLiveTabId ?? (hintTabId >= 1 ? hintTabId : undefined);

  await schedLog('global member alarm', {
    groupId,
    memberKey,
    memberUrl,
    resolvedHitTabId: resolvedHit?.tabId,
    rememberedTabId,
    resolvedLiveTabId,
    refreshTabId,
    paused: paused.has(memberKey),
  });

  if (refreshTabId === undefined) {
    await schedLog('global member alarm: no tab to refresh (skip)', { memberKey });
    await syncAlarmsWithState(await loadAppState());
    return;
  }

  if (paused.has(memberKey)) {
    await schedLog('global member alarm: member paused (skip)', { memberKey });
    await syncAlarmsWithState(await loadAppState());
    return;
  }

  if (await skipGlobalMemberAlarmForLiveStream(groupId, memberKey)) {
    return;
  }

  const storedTarget = group.targets.find(
    (t) => memberKeyFromTargetUrl(t.targetUrl) === memberKey
  )?.targetUrl;
  rememberSchedTabId(groupId, memberKey, refreshTabId, storedTarget ?? memberUrl);
  await schedLog('global member alarm: tabs.update', { refreshTabId, memberUrl });
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
    await schedLog('global member alarm: tabs.update failed', { refreshTabId, memberUrl });
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
  await schedLog('global member alarm: refresh ok, next tick scheduled', {
    memberKey,
    refreshTabId,
  });
  const refreshedGroup = patchGlobalMemberAfterSuccessfulRefresh(group, memberKey, Date.now());
  const nextGroups = replaceAt(state.globalGroups, gIdx, {
    ...refreshedGroup,
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
