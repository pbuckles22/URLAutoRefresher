/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as layout from '../lib/app-state-list-layout';
import { memberKeyFromTargetUrl } from '../lib/member-url';
import * as storage from '../lib/storage';
import * as globalGroupsMod from './dashboard-global-groups';
import * as individualJobsMod from './dashboard-individual-jobs';
import { createDashboardContext } from './dashboard-shell';
import { tickDashboardCountdowns, wireDashboardStorageSync } from './dashboard-storage-sync';

const emptyState = (): AppState => ({
  schemaVersion: 3,
  globalGroups: [],
  individualJobs: [],
});

function sampleJob(id: string): IndividualJob {
  return {
    id,
    target: { targetUrl: 'https://a.example/' },
    baseIntervalSec: 60,
    jitterSec: 0,
    enabled: true,
    nextFireAt: Date.now() + 120_000,
  };
}

function sampleGroup(id: string): GlobalGroup {
  const targetUrl = 'https://g.example/';
  const k = memberKeyFromTargetUrl(targetUrl);
  return {
    id,
    name: 'G',
    targets: [{ targetUrl }],
    baseIntervalSec: 60,
    jitterSec: 0,
    enabled: true,
    memberNextFireAt: { [k]: Date.now() + 180_000 },
  };
}

describe('tickDashboardCountdowns', () => {
  let loadSpy: ReturnType<typeof vi.spyOn>;
  let tickIndSpy: ReturnType<typeof vi.spyOn>;
  let tickGlobSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    document.body.innerHTML = `
      <ul data-individual-jobs-list></ul>
      <ul data-global-groups-list></ul>
    `;
    loadSpy = vi.spyOn(storage, 'loadAppState');
    tickIndSpy = vi.spyOn(individualJobsMod, 'tickIndividualJobCountdowns');
    tickGlobSpy = vi.spyOn(globalGroupsMod, 'tickGlobalGroupCountdowns');
  });

  afterEach(() => {
    loadSpy.mockRestore();
    tickIndSpy.mockRestore();
    tickGlobSpy.mockRestore();
  });

  it('loads state and delegates both tick helpers', async () => {
    const ctx = createDashboardContext();
    const job = sampleJob('j1');
    const grp = sampleGroup('g1');
    const nowBefore = Date.now();
    loadSpy.mockResolvedValue({ ...emptyState(), individualJobs: [job], globalGroups: [grp] });

    await tickDashboardCountdowns(ctx);

    expect(loadSpy).toHaveBeenCalledOnce();
    expect(tickIndSpy).toHaveBeenCalledWith(ctx.dom.jobsList, [job], expect.any(Number));
    expect(tickGlobSpy).toHaveBeenCalledWith(ctx.dom.globalGroupsList, [grp], expect.any(Number));
    const passedNowInd = tickIndSpy.mock.calls[0]![2] as number;
    const passedNowGlob = tickGlobSpy.mock.calls[0]![2] as number;
    expect(passedNowInd).toBe(passedNowGlob);
    expect(passedNowInd).toBeGreaterThanOrEqual(nowBefore);
  });
});

describe('wireDashboardStorageSync', () => {
  let listeners: Array<
    (changes: Record<string, chrome.storage.StorageChange>, areaName: string) => void
  >;
  let loadSpy: ReturnType<typeof vi.spyOn>;
  let layoutSpy: ReturnType<typeof vi.spyOn>;
  let renderIndSpy: ReturnType<typeof vi.spyOn>;
  let renderGlobSpy: ReturnType<typeof vi.spyOn>;
  let tickIndSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useFakeTimers();
    listeners = [];
    global.chrome = global.chrome ?? ({} as typeof chrome);
    global.chrome.storage = {
      onChanged: {
        addListener: vi.fn((cb: (typeof listeners)[0]) => {
          listeners.push(cb);
        }),
      },
    } as unknown as typeof chrome.storage;

    document.body.innerHTML = `
      <ul data-individual-jobs-list></ul>
      <ul data-global-groups-list></ul>
    `;

    loadSpy = vi.spyOn(storage, 'loadAppState').mockResolvedValue(emptyState());
    layoutSpy = vi.spyOn(layout, 'onlyNonLayoutAppStateDiff');
    renderIndSpy = vi.spyOn(individualJobsMod, 'renderIndividualJobs').mockResolvedValue(undefined);
    renderGlobSpy = vi
      .spyOn(globalGroupsMod, 'renderGlobalGroupsList')
      .mockResolvedValue(undefined);
    tickIndSpy = vi.spyOn(individualJobsMod, 'tickIndividualJobCountdowns');
  });

  afterEach(() => {
    vi.useRealTimers();
    loadSpy.mockRestore();
    layoutSpy.mockRestore();
    renderIndSpy.mockRestore();
    renderGlobSpy.mockRestore();
    tickIndSpy.mockRestore();
  });

  it('layout-only storage change ticks countdowns without list re-render', async () => {
    layoutSpy.mockReturnValue(true);
    const ctx = createDashboardContext();
    wireDashboardStorageSync(ctx);

    expect(listeners).toHaveLength(1);
    listeners[0]!({ [storage.STORAGE_KEY]: { oldValue: {}, newValue: {} } }, 'local');

    await vi.waitFor(() => {
      expect(tickIndSpy).toHaveBeenCalled();
    });
    expect(renderIndSpy).not.toHaveBeenCalled();
    expect(renderGlobSpy).not.toHaveBeenCalled();
  });

  it('structural storage change re-renders both lists', async () => {
    layoutSpy.mockReturnValue(false);
    const ctx = createDashboardContext();
    wireDashboardStorageSync(ctx);

    listeners[0]!({ [storage.STORAGE_KEY]: { oldValue: {}, newValue: {} } }, 'local');

    await vi.waitFor(() => {
      expect(renderIndSpy).toHaveBeenCalledWith(ctx);
    });
    expect(renderGlobSpy).toHaveBeenCalledWith(ctx);
    expect(tickIndSpy).not.toHaveBeenCalled();
  });

  it('starts interval that invokes countdown ticks', async () => {
    layoutSpy.mockReturnValue(true);
    const ctx = createDashboardContext();
    wireDashboardStorageSync(ctx);

    tickIndSpy.mockClear();
    await vi.advanceTimersByTimeAsync(1000);

    await vi.waitFor(() => {
      expect(tickIndSpy).toHaveBeenCalled();
    });
    expect(tickIndSpy.mock.calls[0]![0]).toBe(ctx.dom.jobsList);
  });

  it('ignores non-local area', () => {
    layoutSpy.mockReturnValue(false);
    const ctx = createDashboardContext();
    wireDashboardStorageSync(ctx);

    listeners[0]!({ [storage.STORAGE_KEY]: { oldValue: {}, newValue: {} } }, 'sync');

    expect(renderIndSpy).not.toHaveBeenCalled();
  });
});
