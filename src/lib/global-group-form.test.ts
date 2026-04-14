import { describe, expect, it } from 'vitest';
import { buildGlobalGroupFromForm } from './global-group-form';

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
