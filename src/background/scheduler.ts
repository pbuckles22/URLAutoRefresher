/**
 * Epic 2: chrome.alarms ↔ AppState, tabs.update on fire, nextFireAt, tab lifecycle.
 */

import { alarmNameGlobal, alarmNameIndividual, parseAlarmName } from '../lib/alarm-names';
import { computeAlarmWhen } from '../lib/alarm-schedule';
import { computeNextDelayMs } from '../lib/schedule';
import { loadAppState, saveAppState, STORAGE_KEY } from '../lib/storage';
import { applyTabRemoved } from '../lib/tab-lifecycle';
import type { AppState } from '../lib/types';

const STORAGE_DEBOUNCE_MS = 150;

let storageDebounce: ReturnType<typeof setTimeout> | undefined;

function baseAndJitterMs(thing: { baseIntervalSec: number; jitterSec: number }) {
  return {
    baseMs: thing.baseIntervalSec * 1000,
    jitterMs: thing.jitterSec * 1000,
  };
}

function alignStateNextFireWithSchedule(state: AppState, now: number): AppState {
  const individualJobs = state.individualJobs.map((job) => {
    if (!job.enabled) {
      return job.nextFireAt === undefined ? job : { ...job, nextFireAt: undefined };
    }
    const { baseMs, jitterMs } = baseAndJitterMs(job);
    const when = computeAlarmWhen(now, job.nextFireAt, baseMs, jitterMs);
    return { ...job, nextFireAt: when };
  });

  const globalGroups = state.globalGroups.map((g) => {
    if (!g.enabled || g.targets.length === 0) {
      return g.nextFireAt === undefined ? g : { ...g, nextFireAt: undefined };
    }
    const { baseMs, jitterMs } = baseAndJitterMs(g);
    const when = computeAlarmWhen(now, g.nextFireAt, baseMs, jitterMs);
    return { ...g, nextFireAt: when };
  });

  return { ...state, individualJobs, globalGroups };
}

function stateSchedulingEqual(a: AppState, b: AppState): boolean {
  const pick = (s: AppState) =>
    JSON.stringify({
      ij: s.individualJobs.map((j) => ({ id: j.id, enabled: j.enabled, nf: j.nextFireAt })),
      gg: s.globalGroups.map((g) => ({ id: g.id, enabled: g.enabled, nf: g.nextFireAt, tc: g.targets.length })),
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
  const aligned = alignStateNextFireWithSchedule(state, now);

  if (!stateSchedulingEqual(state, aligned)) {
    await saveAppState(aligned);
    state = aligned;
  }

  await clearOurAlarms();

  for (const job of state.individualJobs) {
    if (!job.enabled) {
      continue;
    }
    const { baseMs, jitterMs } = baseAndJitterMs(job);
    const when = job.nextFireAt ?? computeAlarmWhen(now, undefined, baseMs, jitterMs);
    await chrome.alarms.create(alarmNameIndividual(job.id), { when });
  }

  for (const group of state.globalGroups) {
    if (!group.enabled || group.targets.length === 0) {
      continue;
    }
    const { baseMs, jitterMs } = baseAndJitterMs(group);
    const when = group.nextFireAt ?? computeAlarmWhen(now, undefined, baseMs, jitterMs);
    await chrome.alarms.create(alarmNameGlobal(group.id), { when });
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
  const parsed = parseAlarmName(alarm.name);
  if (!parsed) {
    return;
  }

  let state = await loadAppState();

  if (parsed.kind === 'individual') {
    const idx = state.individualJobs.findIndex((j) => j.id === parsed.id);
    if (idx < 0) {
      return;
    }
    const job = state.individualJobs[idx];
    if (!job.enabled) {
      return;
    }

    const ok = await safeTabsUpdate(job.target.tabId, job.target.targetUrl);
    if (!ok) {
      const nextJobs = replaceAt(state.individualJobs, idx, { ...job, enabled: false, nextFireAt: undefined });
      state = { ...state, individualJobs: nextJobs };
      await saveAppState(state);
      await syncAlarmsWithState(state);
      return;
    }

    const { baseMs, jitterMs } = baseAndJitterMs(job);
    const nextFireAt = Date.now() + computeNextDelayMs(baseMs, jitterMs);
    const nextJobs = replaceAt(state.individualJobs, idx, { ...job, nextFireAt });
    state = { ...state, individualJobs: nextJobs };
    await saveAppState(state);
    await syncAlarmsWithState(state);
    return;
  }

  const gIdx = state.globalGroups.findIndex((g) => g.id === parsed.id);
  if (gIdx < 0) {
    return;
  }
  const group = state.globalGroups[gIdx];
  if (!group.enabled || group.targets.length === 0) {
    return;
  }

  const results = await Promise.all(
    group.targets.map(async (t) => ({
      tabId: t.tabId,
      ok: await safeTabsUpdate(t.tabId, t.targetUrl),
    }))
  );
  const failed = new Set(results.filter((r) => !r.ok).map((r) => r.tabId));
  let targets = group.targets.filter((t) => !failed.has(t.tabId));
  let enabled = group.enabled && targets.length > 0;

  const { baseMs, jitterMs } = baseAndJitterMs(group);
  const nextFireAt = Date.now() + computeNextDelayMs(baseMs, jitterMs);
  const nextGroups = replaceAt(state.globalGroups, gIdx, {
    ...group,
    targets,
    enabled,
    nextFireAt: enabled ? nextFireAt : undefined,
  });
  state = { ...state, globalGroups: nextGroups };
  await saveAppState(state);
  await syncAlarmsWithState(state);
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
}

export async function bootstrapScheduling(): Promise<void> {
  const state = await loadAppState();
  await syncAlarmsWithState(state);
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
