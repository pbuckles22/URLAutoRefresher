/** @vitest-environment jsdom */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyIndividualTabSelectFilter,
  bindIndividualTabPickerUi,
  createIndividualTabPickerCache,
  populateIndividualTabSelect,
  refreshIndividualTabPickerCache,
  syncIndividualTargetUrlFromSelectedTab,
  type TabWithIds,
} from './dashboard-individual-tab-picker';
import { createDashboardContext } from './dashboard-shell';

describe('applyIndividualTabSelectFilter', () => {
  it('filters options by search box', () => {
    document.body.innerHTML = `
      <input type="search" data-job-tab-search value="alpha" />
      <select data-job-tab>
        <option value="">Select a tab…</option>
      </select>
    `;
    const ctx = createDashboardContext();
    const cache = createIndividualTabPickerCache();
    cache.tabs = [
      { id: 1, windowId: 1, index: 0, title: 'Alpha page', url: 'https://a/' } as TabWithIds,
      { id: 2, windowId: 1, index: 1, title: 'Beta', url: 'https://b/' } as TabWithIds,
    ];
    applyIndividualTabSelectFilter(ctx, cache);
    const sel = ctx.dom.tabSelect!;
    const values = [...sel.options].map((o) => o.value);
    expect(values).toContain('1');
    expect(values).not.toContain('2');
  });
});

describe('syncIndividualTargetUrlFromSelectedTab', () => {
  it('fills target URL from cache when tab is selected', () => {
    document.body.innerHTML = `
      <select data-job-tab><option value="">Select a tab…</option><option value="5">t</option></select>
      <input data-job-target-url value="" />
    `;
    const ctx = createDashboardContext();
    const cache = createIndividualTabPickerCache();
    cache.tabs = [
      {
        id: 5,
        windowId: 1,
        index: 0,
        url: 'https://example.com/from-cache',
      } as TabWithIds,
    ];
    ctx.dom.tabSelect!.value = '5';
    syncIndividualTargetUrlFromSelectedTab(ctx, cache);
    expect(ctx.dom.urlInput?.value).toBe('https://example.com/from-cache');
  });
});

describe('refreshIndividualTabPickerCache', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fills cache from chrome.tabs.query and pins preferred http(s) tab first', async () => {
    vi.stubGlobal('chrome', {
      windows: {
        getLastFocused: vi.fn().mockResolvedValue({
          tabs: [
            { id: 1, index: 0, active: false, url: 'https://first/' },
            { id: 2, index: 1, active: true, url: 'https://active/' },
          ],
        }),
      },
      tabs: {
        query: vi.fn().mockResolvedValue([
          { id: 1, windowId: 1, index: 0, title: 'First', url: 'https://first/' },
          { id: 2, windowId: 1, index: 1, title: 'Active', url: 'https://active/' },
        ]),
      },
    });
    const cache = createIndividualTabPickerCache();
    await refreshIndividualTabPickerCache(cache);
    expect(cache.tabs.map((t) => t.id)).toEqual([2, 1]);
  });
});

describe('populateIndividualTabSelect', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('rebuilds select options when tab select exists', async () => {
    vi.stubGlobal('chrome', {
      windows: {
        getLastFocused: vi.fn().mockResolvedValue({ tabs: [] }),
      },
      tabs: {
        query: vi
          .fn()
          .mockResolvedValue([{ id: 10, windowId: 1, index: 0, title: 'T', url: 'https://t/' }]),
      },
    });
    document.body.innerHTML = `
      <select data-job-tab><option value="">Select a tab…</option></select>
    `;
    const ctx = createDashboardContext();
    const cache = createIndividualTabPickerCache();
    await populateIndividualTabSelect(ctx, cache);
    const values = [...ctx.dom.tabSelect!.options].map((o) => o.value);
    expect(values).toContain('10');
  });
});

describe('applyIndividualTabSelectFilter selection', () => {
  it('clears select value when previous selection is filtered out', () => {
    document.body.innerHTML = `
      <input type="search" data-job-tab-search value="only-a" />
      <select data-job-tab>
        <option value="">Select a tab…</option>
        <option value="1">a</option>
        <option value="2" selected>b</option>
      </select>
    `;
    const ctx = createDashboardContext();
    const cache = createIndividualTabPickerCache();
    cache.tabs = [
      { id: 1, windowId: 1, index: 0, title: 'Alpha', url: 'https://a/' } as TabWithIds,
      { id: 2, windowId: 1, index: 1, title: 'Beta', url: 'https://b/' } as TabWithIds,
    ];
    applyIndividualTabSelectFilter(ctx, cache);
    expect(ctx.dom.tabSelect?.value).toBe('');
  });

  it('keeps prior selection when it still matches filter', () => {
    document.body.innerHTML = `
      <input type="search" data-job-tab-search value="" />
      <select data-job-tab>
        <option value="">Select a tab…</option>
        <option value="9" selected>nine</option>
      </select>
    `;
    const ctx = createDashboardContext();
    const cache = createIndividualTabPickerCache();
    cache.tabs = [{ id: 9, windowId: 1, index: 0, title: 'Nine', url: 'https://n/' } as TabWithIds];
    applyIndividualTabSelectFilter(ctx, cache);
    expect(ctx.dom.tabSelect?.value).toBe('9');
  });
});

describe('syncIndividualTargetUrlFromSelectedTab (async fallback)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('uses chrome.tabs.get when selected tab is not in cache', async () => {
    const get = vi.fn().mockResolvedValue({ id: 7, url: 'https://remote.example/x' });
    vi.stubGlobal('chrome', {
      windows: { getLastFocused: vi.fn().mockResolvedValue({ tabs: [] }) },
      tabs: { query: vi.fn().mockResolvedValue([]), get },
    });
    document.body.innerHTML = `
      <select data-job-tab><option value="">Select a tab…</option><option value="7">t</option></select>
      <input data-job-target-url value="" />
    `;
    const ctx = createDashboardContext();
    const cache = createIndividualTabPickerCache();
    ctx.dom.tabSelect!.value = '7';
    syncIndividualTargetUrlFromSelectedTab(ctx, cache);
    await vi.waitFor(() => {
      expect(ctx.dom.urlInput?.value).toBe('https://remote.example/x');
    });
    expect(get).toHaveBeenCalledWith(7);
  });
});

describe('bindIndividualTabPickerUi', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('wires search input to filter options', () => {
    document.body.innerHTML = `
      <input type="search" data-job-tab-search value="" />
      <button type="button" data-job-tab-refresh>Refresh</button>
      <select data-job-tab><option value="">Select a tab…</option></select>
    `;
    vi.stubGlobal('chrome', {
      windows: { getLastFocused: vi.fn().mockResolvedValue({ tabs: [] }) },
      tabs: { query: vi.fn().mockResolvedValue([]) },
    });
    const ctx = createDashboardContext();
    const cache = createIndividualTabPickerCache();
    cache.tabs = [
      { id: 1, windowId: 1, index: 0, title: 'Foo', url: 'https://foo/' } as TabWithIds,
      { id: 2, windowId: 1, index: 1, title: 'Bar', url: 'https://bar/' } as TabWithIds,
    ];
    bindIndividualTabPickerUi(ctx, cache);
    applyIndividualTabSelectFilter(ctx, cache);
    expect([...ctx.dom.tabSelect!.options].map((o) => o.value)).toContain('1');

    ctx.dom.jobTabSearch!.value = 'bar';
    ctx.dom.jobTabSearch!.dispatchEvent(new Event('input', { bubbles: true }));
    const values = [...ctx.dom.tabSelect!.options].map((o) => o.value);
    expect(values).toContain('2');
    expect(values).not.toContain('1');
  });
});
