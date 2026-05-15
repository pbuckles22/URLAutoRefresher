/** @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';
import {
  applyIndividualTabSelectFilter,
  createIndividualTabPickerCache,
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
