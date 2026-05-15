import { afterEach, describe, expect, it, vi } from 'vitest';
import { isSchedulableWebUrl, resolvePreferredPinTabId } from './preferred-pin-tab';

describe('isSchedulableWebUrl', () => {
  it('accepts http(s) only', () => {
    expect(isSchedulableWebUrl('https://a/')).toBe(true);
    expect(isSchedulableWebUrl(' http://b  ')).toBe(true);
    expect(isSchedulableWebUrl('edge://settings')).toBe(false);
    expect(isSchedulableWebUrl(undefined)).toBe(false);
  });
});

describe('resolvePreferredPinTabId', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns active tab id when active tab is http(s)', async () => {
    vi.stubGlobal('chrome', {
      windows: {
        getLastFocused: vi.fn().mockResolvedValue({
          tabs: [
            { id: 1, index: 0, active: false, url: 'chrome://newtab' },
            { id: 2, index: 1, active: true, url: 'https://example.com/x' },
          ],
        }),
      },
    });
    await expect(resolvePreferredPinTabId()).resolves.toBe(2);
  });

  it('returns first sorted http(s) tab when active is not schedulable', async () => {
    vi.stubGlobal('chrome', {
      windows: {
        getLastFocused: vi.fn().mockResolvedValue({
          tabs: [
            { id: 9, index: 0, active: true, url: 'about:blank' },
            { id: 3, index: 1, active: false, url: 'https://first/' },
            { id: 4, index: 2, active: false, url: 'https://second/' },
          ],
        }),
      },
    });
    await expect(resolvePreferredPinTabId()).resolves.toBe(3);
  });

  it('returns undefined on failure', async () => {
    vi.stubGlobal('chrome', {
      windows: {
        getLastFocused: vi.fn().mockRejectedValue(new Error('no')),
      },
    });
    await expect(resolvePreferredPinTabId()).resolves.toBeUndefined();
  });
});
