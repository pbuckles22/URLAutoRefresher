import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resolveGlobalGroupTargets } from '../lib/global-group-targets';
import { alarmNameGlobalMember, alarmNameIndividual } from '../lib/alarm-names';
import * as storage from '../lib/storage';
import type { AppState } from '../lib/types';
import { clearOurAlarms, stateSchedulingEqual, syncAlarmsWithState } from './scheduler-sync-alarms';

vi.mock('../lib/global-group-targets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/global-group-targets')>();
  return {
    ...actual,
    resolveGlobalGroupTargets: vi.fn(actual.resolveGlobalGroupTargets),
  };
});

const mockedResolveTargets = vi.mocked(resolveGlobalGroupTargets);

function minimalState(overrides: Partial<AppState> = {}): AppState {
  return {
    schemaVersion: 3,
    globalGroups: [],
    individualJobs: [],
    ...overrides,
  };
}

describe('stateSchedulingEqual', () => {
  it('treats states as equal when only non-projection fields differ (e.g. baseIntervalSec)', () => {
    const a = minimalState({
      individualJobs: [
        {
          id: 'j1',
          target: { targetUrl: 'https://a/' },
          baseIntervalSec: 10,
          jitterSec: 0,
          enabled: true,
          nextFireAt: 100,
        },
      ],
    });
    const b = structuredClone(a);
    b.individualJobs[0] = { ...b.individualJobs[0], baseIntervalSec: 99 };
    expect(stateSchedulingEqual(a, b)).toBe(true);
  });

  it('returns false when nextFireAt differs', () => {
    const a = minimalState({
      individualJobs: [
        {
          id: 'j1',
          target: { targetUrl: 'https://a/' },
          baseIntervalSec: 10,
          jitterSec: 0,
          enabled: true,
          nextFireAt: 100,
        },
      ],
    });
    const b = structuredClone(a);
    b.individualJobs[0] = { ...b.individualJobs[0], nextFireAt: 200 };
    expect(stateSchedulingEqual(a, b)).toBe(false);
  });
});

describe('clearOurAlarms', () => {
  beforeEach(() => {
    global.chrome = global.chrome ?? ({} as typeof chrome);
    global.chrome.alarms = {
      getAll: vi.fn(),
      clear: vi.fn(),
      create: vi.fn(),
    } as unknown as typeof chrome.alarms;
  });

  it('clears only alarms whose names parse as ours', async () => {
    const ours = alarmNameIndividual('job-a');
    vi.mocked(chrome.alarms.getAll).mockResolvedValue([
      { name: ours } as chrome.alarms.Alarm,
      { name: 'chrome://internal' } as chrome.alarms.Alarm,
    ]);
    vi.mocked(chrome.alarms.clear).mockResolvedValue(true);

    await clearOurAlarms();

    expect(chrome.alarms.clear).toHaveBeenCalledTimes(1);
    expect(chrome.alarms.clear).toHaveBeenCalledWith(ours);
  });
});

describe('syncAlarmsWithState', () => {
  let saveSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockedResolveTargets.mockReset();
    global.chrome = global.chrome ?? ({} as typeof chrome);
    global.chrome.alarms = {
      getAll: vi.fn().mockResolvedValue([]),
      clear: vi.fn().mockResolvedValue(true),
      create: vi.fn().mockResolvedValue(undefined),
    } as unknown as typeof chrome.alarms;
    saveSpy = vi.spyOn(storage, 'saveAppState').mockResolvedValue(undefined);
  });

  afterEach(() => {
    saveSpy.mockRestore();
  });

  it('persists when alignment changes scheduling fields', async () => {
    const state = minimalState({
      individualJobs: [
        {
          id: 'j1',
          target: { targetUrl: 'https://x/' },
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: false,
          nextFireAt: 9_999_999,
        },
      ],
    });
    await syncAlarmsWithState(state);
    expect(saveSpy).toHaveBeenCalledTimes(1);
    const saved = saveSpy.mock.calls[0][0] as AppState;
    expect(saved.individualJobs[0].nextFireAt).toBeUndefined();
  });

  it('creates individual alarm when job enabled and not overlay-paused', async () => {
    const future = Date.now() + 500_000;
    const state = minimalState({
      individualJobs: [
        {
          id: 'j1',
          target: { targetUrl: 'https://x/' },
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: true,
          nextFireAt: future,
        },
      ],
    });
    await syncAlarmsWithState(state);
    expect(saveSpy).not.toHaveBeenCalled();
    expect(chrome.alarms.create).toHaveBeenCalledWith(alarmNameIndividual('j1'), { when: future });
  });

  it('creates global-member alarm when alignment keeps a resolved member', async () => {
    mockedResolveTargets.mockResolvedValue([
      { tabId: 1, windowId: 1, targetUrl: 'https://example.com/' },
    ]);
    const when = Date.now() + 120_000;
    const state = minimalState({
      globalGroups: [
        {
          id: 'g1',
          name: 'G',
          targets: [{ targetUrl: 'https://example.com/' }],
          baseIntervalSec: 30,
          jitterSec: 0,
          enabled: true,
          memberNextFireAt: { 'example.com': when },
        },
      ],
    });
    await syncAlarmsWithState(state);
    expect(chrome.alarms.create).toHaveBeenCalled();
    const gmCall = vi
      .mocked(chrome.alarms.create)
      .mock.calls.find((c) => typeof c[0] === 'string' && c[0].startsWith('urlar:gm:'));
    expect(gmCall?.[0]).toBe(alarmNameGlobalMember('g1', 'example.com'));
    expect(typeof (gmCall?.[1] as { when: number })?.when).toBe('number');
  });
});
