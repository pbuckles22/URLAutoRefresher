/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { memberKeyFromTargetUrl } from '../lib/member-url';
import type { AppState, GlobalGroup } from '../lib/types';
import * as storage from '../lib/storage';
import {
  bindGlobalGroupsListEvents,
  bindGlobalTabBrowserUi,
  bindGlobalTwitchFavsHint,
  renderGlobalGroupsList,
  renderGlobalTabBrowser,
  tickGlobalGroupCountdowns,
} from './dashboard-global-groups';
import { createIndividualTabPickerCache } from './dashboard-individual-tab-picker';
import { renderIndividualJobs } from './dashboard-individual-jobs';
import { createDashboardContext } from './dashboard-shell';

const emptyState = (): AppState => ({
  schemaVersion: 3,
  globalGroups: [],
  individualJobs: [],
});

function sampleGroup(id: string, nextFireAt: number): GlobalGroup {
  const targetUrl = 'https://example.com/';
  return {
    id,
    name: 'Grp',
    targets: [{ targetUrl }],
    baseIntervalSec: 60,
    jitterSec: 0,
    enabled: true,
    memberNextFireAt: { [memberKeyFromTargetUrl(targetUrl)]: nextFireAt },
  };
}

describe('renderGlobalGroupsList', () => {
  let loadSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    document.body.innerHTML = `
      <h2 data-global-section-heading></h2>
      <ul data-global-groups-list></ul>
    `;
    loadSpy = vi.spyOn(storage, 'loadAppState');
  });

  afterEach(() => {
    loadSpy.mockRestore();
  });

  it('updates heading and renders one row per group', async () => {
    const ctx = createDashboardContext();
    const g = sampleGroup('g1', Date.now() + 90_000);
    loadSpy.mockResolvedValue({ ...emptyState(), globalGroups: [g] });
    await renderGlobalGroupsList(ctx);
    expect(ctx.dom.globalSectionHeading?.textContent).toBe('Global (1)');
    const rows = ctx.dom.globalGroupsList?.querySelectorAll('[data-global-group-row]');
    expect(rows?.length).toBe(1);
    expect(rows?.[0]?.getAttribute('data-global-group-row')).toBe('g1');
  });

  it('updates heading when list element is absent', async () => {
    document.body.innerHTML = `<h2 data-global-section-heading></h2>`;
    const ctx = createDashboardContext();
    loadSpy.mockResolvedValue({
      ...emptyState(),
      globalGroups: [sampleGroup('solo', Date.now() + 10_000)],
    });
    await renderGlobalGroupsList(ctx);
    expect(ctx.dom.globalSectionHeading?.textContent).toBe('Global (1)');
    expect(ctx.dom.globalGroupsList).toBeNull();
  });
});

describe('tickGlobalGroupCountdowns', () => {
  it('no-ops when list element is missing', () => {
    const g = sampleGroup('x', Date.now() + 60_000);
    expect(() => tickGlobalGroupCountdowns(null, [g], Date.now())).not.toThrow();
  });

  it('updates countdown cells for listed groups', () => {
    const t0 = 1_700_000_000_000;
    const g = sampleGroup('x', t0 + 120_000);
    document.body.innerHTML = `<ul data-global-groups-list></ul>`;
    const ctx = createDashboardContext();
    const list = ctx.dom.globalGroupsList!;
    const li = document.createElement('li');
    li.setAttribute('data-global-group-row', g.id);
    const span = document.createElement('span');
    span.setAttribute('data-global-group-countdown', '');
    span.textContent = 'seed';
    li.appendChild(span);
    list.appendChild(li);

    tickGlobalGroupCountdowns(list, [g], t0 + 60_000);
    expect(span.textContent).toBe('1:00');
    tickGlobalGroupCountdowns(list, [g], t0 + 61_000);
    expect(span.textContent).toBe('0:59');
  });
});

describe('bindGlobalGroupsListEvents', () => {
  let loadSpy: ReturnType<typeof vi.spyOn>;
  let saveSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    document.body.innerHTML = `
      <h2 data-global-section-heading></h2>
      <ul data-global-groups-list></ul>
    `;
    loadSpy = vi.spyOn(storage, 'loadAppState');
    saveSpy = vi.spyOn(storage, 'saveAppState').mockResolvedValue(undefined);
    global.chrome = global.chrome ?? ({} as typeof chrome);
    global.chrome.windows = {
      getAll: vi.fn().mockResolvedValue([]),
      getLastFocused: vi.fn().mockResolvedValue({ tabs: [] }),
    } as unknown as typeof chrome.windows;
  });

  afterEach(() => {
    loadSpy.mockRestore();
    saveSpy.mockRestore();
  });

  it('delete removes group and re-renders', async () => {
    const ctx = createDashboardContext();
    const cache = createIndividualTabPickerCache();
    const g = sampleGroup('del-me', Date.now() + 60_000);
    let mem: AppState = { ...emptyState(), globalGroups: [g] };
    loadSpy.mockImplementation(() => Promise.resolve(structuredClone(mem)));
    saveSpy.mockImplementation(async (next) => {
      mem = next;
    });

    await renderGlobalGroupsList(ctx);
    bindGlobalGroupsListEvents(ctx, cache, renderIndividualJobs);

    const del = ctx.dom.globalGroupsList!.querySelector<HTMLElement>('[data-global-group-delete]');
    expect(del).not.toBeNull();
    del!.click();

    await vi.waitFor(() => {
      expect(mem.globalGroups).toHaveLength(0);
    });
    expect(ctx.dom.globalSectionHeading?.textContent).toBe('Global (0)');
  });
});

describe('bindGlobalTabBrowserUi', () => {
  beforeEach(() => {
    global.chrome = global.chrome ?? ({} as typeof chrome);
    global.chrome.windows = {
      getAll: vi.fn().mockResolvedValue([
        {
          id: 1,
          tabs: [{ id: 5, index: 0, title: 'Hello', url: 'https://x.com/' }],
        },
      ]),
      getLastFocused: vi.fn().mockResolvedValue({ tabs: [] }),
    } as unknown as typeof chrome.windows;
  });

  it('refresh repopulates tab rows', async () => {
    document.body.innerHTML = `
      <ul data-global-tab-browser></ul>
      <button type="button" data-global-refresh-tabs>Refresh</button>
    `;
    const ctx = createDashboardContext();
    bindGlobalTabBrowserUi(ctx);
    ctx.dom.globalRefreshTabs!.click();
    await vi.waitFor(() => {
      expect(ctx.dom.globalTabBrowser!.querySelectorAll('[data-global-tab-row]').length).toBe(1);
    });
    expect(ctx.dom.globalTabBrowser!.querySelector('[data-global-tab-title]')?.textContent).toBe(
      'Hello'
    );
  });
});

describe('renderGlobalTabBrowser', () => {
  beforeEach(() => {
    global.chrome = global.chrome ?? ({} as typeof chrome);
    global.chrome.windows = {
      getAll: vi.fn().mockResolvedValue([
        {
          id: 2,
          tabs: [{ id: 9, index: 0, title: 'Z', url: 'https://z.test/' }],
        },
      ]),
      getLastFocused: vi.fn().mockResolvedValue({ tabs: [] }),
    } as unknown as typeof chrome.windows;
  });

  it('builds rows from windows snapshot', async () => {
    document.body.innerHTML = `<ul data-global-tab-browser></ul>`;
    const ctx = createDashboardContext();
    await renderGlobalTabBrowser(ctx);
    const li = ctx.dom.globalTabBrowser!.querySelector('[data-global-tab-row]');
    expect(li?.getAttribute('data-global-tab-row')).toBe('9');
  });
});

describe('bindGlobalTwitchFavsHint', () => {
  it('shows hint when name matches TwitchFavs', () => {
    document.body.innerHTML = `
      <input data-global-group-name />
      <p data-global-twitch-favs-hint style="display: none"></p>
    `;
    const ctx = createDashboardContext();
    bindGlobalTwitchFavsHint(ctx);
    const name = ctx.dom.globalGroupName!;
    const hint = ctx.dom.globalTwitchFavsHint!;
    name.value = 'TwitchFavs';
    name.dispatchEvent(new Event('input'));
    expect(hint.style.display).toBe('block');
    name.value = 'Other';
    name.dispatchEvent(new Event('input'));
    expect(hint.style.display).toBe('none');
  });
});
