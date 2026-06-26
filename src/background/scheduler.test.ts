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

// Re-import the module fresh each test so module-level state is reset.
// vitest isolates modules per test file but shares across tests within a file,
// so we reset the exported flag via the mocked dispatch.
import { isAlarmHandlerActive } from './scheduler';
import * as dispatchMod from './scheduler-alarm-handlers';
import * as storageMod from '../lib/storage';
import * as syncMod from './scheduler-sync-alarms';
import * as badgeMod from './badge';

vi.mock('./scheduler-alarm-handlers');
vi.mock('../lib/storage');
vi.mock('./scheduler-sync-alarms');
vi.mock('./badge');

// Mock chrome globals used by attachSchedulingListeners
beforeEach(() => {
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

  vi.mocked(dispatchMod.dispatchSchedulerAlarm).mockResolvedValue(undefined);
  vi.mocked(storageMod.loadAppState).mockResolvedValue({
    schemaVersion: 3,
    globalGroups: [],
    individualJobs: [],
  });
  vi.mocked(storageMod.saveAppState).mockResolvedValue(undefined);
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
    const { attachSchedulingListeners } = await import('./scheduler');

    let capturedListener: ((a: chrome.alarms.Alarm) => void) | undefined;
    vi.mocked(chrome.alarms.onAlarm.addListener).mockImplementation((fn) => {
      capturedListener = fn as (a: chrome.alarms.Alarm) => void;
    });
    attachSchedulingListeners();
    expect(capturedListener).toBeDefined();

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

    // Fire both alarms "simultaneously" (neither awaited before the other fires)
    capturedListener!(alarmA);
    capturedListener!(alarmB);

    // Helper: drain the microtask queue deeply enough for the promise chain.
    const flush = async () => {
      for (let i = 0; i < 20; i++) {
        await Promise.resolve();
      }
    };

    // Allow A to start; B must NOT start yet because A hasn't finished.
    await flush();
    expect(order).toEqual(['A-start']);

    // Finish A → B should start automatically via the chain.
    resolveA();
    await flush();
    expect(order).toContain('A-end');
    expect(order).toContain('B-start');

    // Finish B.
    resolveB();
    await flush();
    expect(order).toEqual(['A-start', 'A-end', 'B-start', 'B-end']);
  });
});
