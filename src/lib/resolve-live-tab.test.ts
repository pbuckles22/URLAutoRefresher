import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { resolveLiveTabIdForTargetUrl, tabsToPickCandidates } from './resolve-live-tab';

describe('resolveLiveTabIdForTargetUrl', () => {
  const originalQuery = global.chrome?.tabs?.query;
  const originalGetLastFocused = global.chrome?.windows?.getLastFocused;

  afterEach(() => {
    vi.restoreAllMocks();
    if (originalQuery) global.chrome.tabs.query = originalQuery;
    if (originalGetLastFocused) global.chrome.windows.getLastFocused = originalGetLastFocused;
  });

  it('returns picked tab when tabs match target URL', async () => {
    global.chrome = global.chrome ?? {};
    global.chrome.tabs = global.chrome.tabs ?? {};
    global.chrome.windows = global.chrome.windows ?? {};
    global.chrome.tabs.query = vi.fn().mockResolvedValue([
      {
        id: 7,
        windowId: 1,
        url: 'https://www.twitch.tv/foo',
        active: true,
        index: 0,
      },
    ]);
    global.chrome.windows.getLastFocused = vi.fn().mockResolvedValue({ id: 1 });

    const id = await resolveLiveTabIdForTargetUrl('https://www.twitch.tv/foo', 99);
    expect(id).toBe(7);
  });

  it('returns fallback tab id when pick finds nothing but fallback URL matches', async () => {
    global.chrome = global.chrome ?? {};
    global.chrome.tabs = global.chrome.tabs ?? {};
    global.chrome.windows = global.chrome.windows ?? {};
    global.chrome.tabs.query = vi.fn().mockResolvedValue([
      {
        id: 42,
        windowId: 1,
        url: 'https://www.twitch.tv/bar',
        active: false,
        index: 0,
      },
    ]);
    global.chrome.windows.getLastFocused = vi.fn().mockResolvedValue({ id: 1 });

    const id = await resolveLiveTabIdForTargetUrl('https://www.twitch.tv/bar', 42);
    expect(id).toBe(42);
  });
});

describe('tabsToPickCandidates', () => {
  it('maps tab fields', () => {
    const c = tabsToPickCandidates([
      { id: 1, windowId: 2, url: 'https://a/', active: false, index: 3 } as chrome.tabs.Tab,
    ]);
    expect(c[0]).toEqual({
      id: 1,
      windowId: 2,
      url: 'https://a/',
      active: false,
      index: 3,
    });
  });
});
