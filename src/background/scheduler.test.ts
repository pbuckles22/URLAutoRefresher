/**
 * Tests for the alarm handler serialization lock in scheduler.ts.
 *
 * Regression protection for the multi-refresh storm bug:
 *   When the MV3 service worker wakes with N piled-up alarms, Chrome dispatches
 *   all N onAlarm events in quick succession.  Without serialization each handler
 *   concurrently reads the same stale AppState, writes back only its own member's
 *   nextFireAt, and overwrites the other handlers' saves (last-write-wins).
 *   syncAlarmsWithState then sees past nextFireAt values and reschedules them at
 *   SOON_MS (250 ms), triggering another wave of refreshes — repeated 3-4× until
 *   state stabilises.  The lock ensures handlers run one-at-a-time.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  __resetSchedulerAlarmQueueForTests,
  attachSchedulingListeners,
  isAlarmHandlerActive,
} from './scheduler';
import * as dispatchMod from './scheduler-alarm-handlers';
import * as storageMod from '../lib/storage';
import { STORAGE_KEY } from '../lib/storage';
import { alarmNameGlobalMember } from '../lib/alarm-names';
import * as syncMod from './scheduler-sync-alarms';
import * as badgeMod from './badge';

vi.mock('./scheduler-alarm-handlers');
vi.mock('../lib/storage');
vi.mock('./scheduler-sync-alarms');
vi.mock('./badge');

let alarmListener: ((a: chrome.alarms.Alarm) => void) | undefined;
let storageListener:
  | ((changes: Record<string, chrome.storage.StorageChange>, area: string) => void)
  | undefined;

const flush = async (rounds = 30) => {
  for (let i = 0; i < rounds; i++) {
    await Promise.resolve();
  }
};

beforeEach(() => {
  __resetSchedulerAlarmQueueForTests();
  alarmListener = undefined;
  storageListener = undefined;

  global.chrome = {
    alarms: {
      onAlarm: { addListener: vi.fn() },
    },
    tabs: {
      onRemoved: { addListener: vi.fn() },
      onUpdated: { addListener: vi.fn() },
    },
    storage: {
      onChanged: { addListener: vi.fn() },
    },
  } as unknown as typeof chrome;

  vi.mocked(chrome.alarms.onAlarm.addListener).mockImplementation((fn) => {
    alarmListener = fn as (a: chrome.alarms.Alarm) => void;
  });
  vi.mocked(chrome.storage.onChanged.addListener).mockImplementation((fn) => {
    storageListener = fn as (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ) => void;
  });

  attachSchedulingListeners();
  expect(alarmListener).toBeDefined();

  vi.mocked(dispatchMod.dispatchSchedulerAlarm).mockResolvedValue(undefined);
  vi.mocked(storageMod.loadAppState).mockResolvedValue({
    schemaVersion: 3,
    globalGroups: [],
    individualJobs: [],
  });
  vi.mocked(storageMod.saveAppState).mockResolvedValue(undefined);
  vi.mocked(syncMod.syncAlarmsWithState).mockClear();
  vi.mocked(syncMod.syncAlarmsWithState).mockResolvedValue(undefined);
  vi.mocked(badgeMod.refreshActionBadge).mockResolvedValue(undefined);
});

describe('isAlarmHandlerActive', () => {
  it('returns false when no alarm handlers are running', () => {
    expect(isAlarmHandlerActive()).toBe(false);
  });
});

describe('alarm handler serialization (regression: multi-refresh storm)', () => {
  it('runs concurrent alarm dispatches one at a time, not in parallel', async () => {
    const order: string[] = [];
    let resolveA!: () => void;
    let resolveB!: () => void;
    const slowA = new Promise<void>((res) => {
      resolveA = res;
    });
    const slowB = new Promise<void>((res) => {
      resolveB = res;
    });

    vi.mocked(dispatchMod.dispatchSchedulerAlarm).mockImplementation(async (parsed) => {
      if (parsed.kind === 'individual' && parsed.id === 'A') {
        order.push('A-start');
        await slowA;
        order.push('A-end');
      } else if (parsed.kind === 'individual' && parsed.id === 'B') {
        order.push('B-start');
        await slowB;
        order.push('B-end');
      }
    });

    const alarmA = { name: 'urlar:i:A' } as chrome.alarms.Alarm;
    const alarmB = { name: 'urlar:i:B' } as chrome.alarms.Alarm;

    alarmListener!(alarmA);
    alarmListener!(alarmB);

    await flush();
    expect(order).toEqual(['A-start']);

    resolveA();
    await flush();
    expect(order).toContain('A-end');
    expect(order).toContain('B-start');

    resolveB();
    await flush();
    expect(order).toEqual(['A-start', 'A-end', 'B-start', 'B-end']);
  });
});

describe('post-chain bootstrap (regression: deferred reconcile after handler chain)', () => {
  it('calls syncAlarmsWithState once after a globalMember handler completes', async () => {
    alarmListener!({ name: alarmNameGlobalMember('g1', 'mk1') } as chrome.alarms.Alarm);
    await flush();

    expect(syncMod.syncAlarmsWithState).toHaveBeenCalledTimes(1);
  });

  it('does NOT bootstrap mid-chain while a second handler is still queued', async () => {
    let resolveA!: () => void;
    const slowA = new Promise<void>((res) => {
      resolveA = res;
    });

    vi.mocked(dispatchMod.dispatchSchedulerAlarm).mockImplementation(async (parsed) => {
      if (parsed.kind === 'globalMember' && parsed.memberKey === 'A') {
        await slowA;
      }
    });

    alarmListener!({ name: alarmNameGlobalMember('g1', 'A') } as chrome.alarms.Alarm);
    alarmListener!({ name: alarmNameGlobalMember('g1', 'B') } as chrome.alarms.Alarm);
    await flush();

    expect(syncMod.syncAlarmsWithState).not.toHaveBeenCalled();

    resolveA();
    await flush();

    expect(syncMod.syncAlarmsWithState).toHaveBeenCalledTimes(1);
  });

  it('reconciles after chain when storage.onChanged was skipped during handlers', async () => {
    vi.useFakeTimers();

    let resolveHandler!: () => void;
    const slowHandler = new Promise<void>((res) => {
      resolveHandler = res;
    });
    vi.mocked(dispatchMod.dispatchSchedulerAlarm).mockImplementation(async () => {
      await slowHandler;
    });

    alarmListener!({ name: alarmNameGlobalMember('g1', 'mk1') } as chrome.alarms.Alarm);
    await flush();
    expect(isAlarmHandlerActive()).toBe(true);

    storageListener!({ [STORAGE_KEY]: { oldValue: {}, newValue: {} } }, 'local');
    await vi.advanceTimersByTimeAsync(200);
    expect(syncMod.syncAlarmsWithState).not.toHaveBeenCalled();

    resolveHandler();
    await flush();

    expect(syncMod.syncAlarmsWithState).toHaveBeenCalledTimes(1);
    vi.useRealTimers();
  });
});
