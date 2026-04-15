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

  it('rejects no targets', () => {
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
      expect(r.error).toMatch(/at least one tab/i);
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
      },
      existing()
    );
    expect(r.ok).toBe(false);
  });

  it('rejects when tab set does not match existing', () => {
    const r = buildGlobalGroupUpdateFromForm(
      {
        name: 'N',
        baseIntervalSec: 60,
        jitterSec: 0,
        targets: [{ tabId: 10, windowId: 2, targetUrl: 'https://x/' }],
      },
      existing()
    );
    expect(r.ok).toBe(false);
  });

  it('preserves id, enabled, nextFireAt and updates fields', () => {
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
          { tabId: 10, windowId: 2, targetUrl: 'https://example.com/a2', label: 'L1' },
          { tabId: 11, windowId: 2, targetUrl: 'https://example.com/b2' },
        ],
      });
    }
  });
});
