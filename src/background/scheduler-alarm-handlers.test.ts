import { beforeEach, describe, expect, it, vi } from 'vitest';
import { dispatchSchedulerAlarm } from './scheduler-alarm-handlers';
import * as syncMod from './scheduler-sync-alarms';
import * as storageMod from '../lib/storage';
import type { AppState } from '../lib/types';

const emptyState = (): AppState => ({
  schemaVersion: 3,
  globalGroups: [],
  individualJobs: [],
});

describe('dispatchSchedulerAlarm', () => {
  let syncSpy: ReturnType<typeof vi.spyOn>;
  let loadSpy: ReturnType<typeof vi.spyOn>;
  let saveSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    syncSpy = vi.spyOn(syncMod, 'syncAlarmsWithState').mockResolvedValue(undefined);
    loadSpy = vi.spyOn(storageMod, 'loadAppState').mockResolvedValue(emptyState());
    saveSpy = vi.spyOn(storageMod, 'saveAppState').mockResolvedValue(undefined);
  });

  it('resyncs on legacy global alarm', async () => {
    await dispatchSchedulerAlarm({ kind: 'global', id: 'g1' });
    expect(syncSpy).toHaveBeenCalledTimes(1);
    expect(loadSpy).toHaveBeenCalled();
  });

  it('resyncs on legacy globalTab alarm', async () => {
    await dispatchSchedulerAlarm({ kind: 'globalTab', groupId: 'g1', tabId: 1 });
    expect(syncSpy).toHaveBeenCalledTimes(1);
  });

  it('returns early when individual job id is missing', async () => {
    await dispatchSchedulerAlarm({ kind: 'individual', id: 'missing' });
    expect(syncSpy).not.toHaveBeenCalled();
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('does NOT call syncAlarmsWithState for globalMember alarms (regression: infinite refresh storm)', async () => {
    // syncAlarmsWithState inside a globalMember alarm handler recreates ALL members'
    // alarms; for unprocessed members whose alarms just fired, computeAlarmWhen returns
    // now+SOON_MS (250 ms), which fires immediately and re-enters the handler chain —
    // creating an infinite loop.  Handlers now use direct chrome.alarms.create for only
    // their own member and rely on bootstrapScheduling (post-handler) for global cleanup.
    global.chrome = {
      ...((global.chrome ?? {}) as typeof chrome),
      tabs: {
        query: vi.fn().mockResolvedValue([]),
      } as unknown as typeof chrome.tabs,
      alarms: {
        create: vi.fn().mockResolvedValue(undefined),
      } as unknown as typeof chrome.alarms,
    };
    // Group exists but member tab can't be resolved → early return path.
    await dispatchSchedulerAlarm({ kind: 'globalMember', groupId: 'g1', memberKey: 'mk1' });
    expect(syncSpy).not.toHaveBeenCalled();
  });
});
