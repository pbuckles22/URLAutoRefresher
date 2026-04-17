import { describe, expect, it } from 'vitest';
import { buildGlobalGroupFromForm, buildGlobalGroupUpdateFromForm } from './global-group-form';
import type { GlobalGroup } from './types';

describe('buildGlobalGroupFromForm', () => {
  it('rejects empty name', () => {
    const r = buildGlobalGroupFromForm(
      {
        name: '   ',
        baseIntervalSec: 60,
        jitterSec: 0,
        targets: [{ tabId: 1, windowId: 0, targetUrl: 'https://a/' }],
      },
      () => 'fixed-id'
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/group name/i);
    }
  });

  it('rejects no targets and no patterns', () => {
    const r = buildGlobalGroupFromForm(
      {
        name: 'G',
        baseIntervalSec: 60,
        jitterSec: 0,
        targets: [],
      },
      () => 'fixed-id'
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/at least one tab or add at least one url pattern/i);
    }
  });

  it('allows pattern-only group', () => {
    const r = buildGlobalGroupFromForm(
      {
        name: 'Twitch',
        baseIntervalSec: 60,
        jitterSec: 0,
        targets: [],
        urlPatternsRaw: '*twitch.tv*',
      },
      () => 'pat-id'
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.targets).toEqual([]);
      expect(r.value.urlPatterns).toEqual(['*twitch.tv*']);
    }
  });

  it('rejects duplicate tab ids', () => {
    const r = buildGlobalGroupFromForm(
      {
        name: 'G',
        baseIntervalSec: 60,
        jitterSec: 0,
        targets: [
          { tabId: 1, windowId: 0, targetUrl: 'https://a/' },
          { tabId: 1, windowId: 0, targetUrl: 'https://b/' },
        ],
      },
      () => 'fixed-id'
    );
    expect(r.ok).toBe(false);
  });

  it('returns a valid global group', () => {
    const r = buildGlobalGroupFromForm(
      {
        name: ' Sync ',
        baseIntervalSec: 90,
        jitterSec: 3,
        targets: [
          { tabId: 10, windowId: 2, targetUrl: 'https://example.com/a', label: ' Tab A ' },
          { tabId: 11, windowId: 2, targetUrl: 'https://example.com/b' },
        ],
      },
      () => 'gid-1'
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({
        id: 'gid-1',
        name: 'Sync',
        targets: [
          { tabId: 10, windowId: 2, targetUrl: 'https://example.com/a', label: 'Tab A' },
          { tabId: 11, windowId: 2, targetUrl: 'https://example.com/b' },
        ],
        baseIntervalSec: 90,
        jitterSec: 3,
        enabled: true,
      });
    }
  });
});

describe('buildGlobalGroupUpdateFromForm', () => {
  const existing = (): GlobalGroup => ({
    id: 'gid',
    name: 'Old',
    targets: [
      { tabId: 10, windowId: 2, targetUrl: 'https://example.com/a', label: 'A' },
      { tabId: 11, windowId: 2, targetUrl: 'https://example.com/b' },
    ],
    baseIntervalSec: 60,
    jitterSec: 0,
    enabled: true,
    nextFireAt: 12345,
  });

  it('rejects empty name', () => {
    const r = buildGlobalGroupUpdateFromForm(
      {
        name: '  ',
        baseIntervalSec: 60,
        jitterSec: 0,
        targets: [
          { tabId: 10, windowId: 2, targetUrl: 'https://x/' },
          { tabId: 11, windowId: 2, targetUrl: 'https://y/' },
        ],
        urlPatternsRaw: '',
      },
      existing()
    );
    expect(r.ok).toBe(false);
  });

  it('allows removing a member tab when URL patterns remain', () => {
    const r = buildGlobalGroupUpdateFromForm(
      {
        name: 'N',
        baseIntervalSec: 60,
        jitterSec: 0,
        targets: [{ tabId: 10, windowId: 2, targetUrl: 'https://x/' }],
        urlPatternsRaw: '*example.com*',
      },
      existing()
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.targets).toHaveLength(1);
      expect(r.value.targets[0]?.tabId).toBe(10);
      expect(r.value.urlPatterns).toEqual(['*example.com*']);
    }
  });

  it('filters pausedTabIds when a tab is removed', () => {
    const ex: GlobalGroup = {
      ...existing(),
      pausedTabIds: [10, 11],
    };
    const r = buildGlobalGroupUpdateFromForm(
      {
        name: 'N',
        baseIntervalSec: 60,
        jitterSec: 0,
        targets: [{ tabId: 10, windowId: 2, targetUrl: 'https://x/' }],
        urlPatternsRaw: '*example.com*',
      },
      ex
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.pausedTabIds).toEqual([10]);
    }
  });

  it('preserves id, enabled, nextFireAt and updates fields (form row order)', () => {
    const ex = existing();
    const r = buildGlobalGroupUpdateFromForm(
      {
        name: ' New ',
        baseIntervalSec: 90,
        jitterSec: 2,
        targets: [
          { tabId: 11, windowId: 2, targetUrl: 'https://example.com/b2' },
          { tabId: 10, windowId: 2, targetUrl: 'https://example.com/a2', label: ' L1 ' },
        ],
        urlPatternsRaw: '',
      },
      ex
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({
        id: 'gid',
        name: 'New',
        enabled: true,
        nextFireAt: 12345,
        baseIntervalSec: 90,
        jitterSec: 2,
        targets: [
          { tabId: 11, windowId: 2, targetUrl: 'https://example.com/b2' },
          { tabId: 10, windowId: 2, targetUrl: 'https://example.com/a2', label: 'L1' },
        ],
      });
    }
  });
});
