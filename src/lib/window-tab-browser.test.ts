import { describe, expect, it } from 'vitest';
import {
  defaultTargetUrlForTab,
  pinTabIdFirst,
  tabRowsFromWindowsSnapshot,
} from './window-tab-browser';

describe('defaultTargetUrlForTab', () => {
  it('returns http(s) URLs unchanged', () => {
    expect(defaultTargetUrlForTab('https://a.example/')).toBe('https://a.example/');
    expect(defaultTargetUrlForTab('  http://127.0.0.1:8765/path  ')).toBe(
      'http://127.0.0.1:8765/path'
    );
  });

  it('returns empty for non-http(s) schemes', () => {
    expect(defaultTargetUrlForTab('chrome://newtab/')).toBe('');
    expect(defaultTargetUrlForTab('about:blank')).toBe('');
  });
});

describe('tabRowsFromWindowsSnapshot', () => {
  it('skips windows without id and tabs without id', () => {
    const rows = tabRowsFromWindowsSnapshot([
      { id: 1, tabs: [{ id: 10, index: 0, title: 'A', url: 'https://a/' }] },
      { tabs: [{ id: 11, index: 0 }] },
      { id: 2, tabs: [{ index: 0 }] },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      tabId: 10,
      windowId: 1,
      index: 0,
      title: 'A',
      url: 'https://a/',
    });
  });

  it('sorts by window id then tab index across multiple windows', () => {
    const rows = tabRowsFromWindowsSnapshot([
      {
        id: 2,
        tabs: [
          { id: 201, index: 1, title: 'W2-1', url: 'https://w2-1/' },
          { id: 200, index: 0, title: 'W2-0', url: 'https://w2-0/' },
        ],
      },
      {
        id: 1,
        tabs: [{ id: 100, index: 0, title: 'W1', url: 'https://w1/' }],
      },
    ]);
    expect(rows.map((r) => r.tabId)).toEqual([100, 200, 201]);
  });

  it('moves pinTabId row first when provided', () => {
    const rows = tabRowsFromWindowsSnapshot(
      [
        {
          id: 1,
          tabs: [
            { id: 100, index: 0, title: 'A', url: 'https://a/' },
            { id: 101, index: 1, title: 'B', url: 'https://b/' },
          ],
        },
      ],
      101
    );
    expect(rows.map((r) => r.tabId)).toEqual([101, 100]);
  });
});

describe('pinTabIdFirst', () => {
  it('moves matching id to index 0', () => {
    const tabs = [
      { id: 1, x: 'a' },
      { id: 2, x: 'b' },
      { id: 3, x: 'c' },
    ];
    expect(pinTabIdFirst(tabs, 2).map((t) => t.id)).toEqual([2, 1, 3]);
  });

  it('no-ops when pin missing or invalid', () => {
    const tabs = [{ id: 1 }, { id: 2 }];
    expect(pinTabIdFirst(tabs, 99).map((t) => t.id)).toEqual([1, 2]);
    expect(pinTabIdFirst(tabs, 0).map((t) => t.id)).toEqual([1, 2]);
  });
});
