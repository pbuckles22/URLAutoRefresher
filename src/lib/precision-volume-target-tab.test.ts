import { afterEach, describe, expect, it, vi } from 'vitest';
import { resolvePrecisionVolumeTargetTabId } from './precision-volume-target-tab';

describe('resolvePrecisionVolumeTargetTabId', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns explicit tab id when override is set', async () => {
    vi.stubGlobal('chrome', {
      windows: { getLastFocused: vi.fn() },
    });
    await expect(resolvePrecisionVolumeTargetTabId(99)).resolves.toBe(99);
    expect(chrome.windows.getLastFocused).not.toHaveBeenCalled();
  });

  it('delegates to preferred pin when no override', async () => {
    vi.stubGlobal('chrome', {
      windows: {
        getLastFocused: vi.fn().mockResolvedValue({
          tabs: [{ id: 7, index: 0, active: true, url: 'https://stream/' }],
        }),
      },
    });
    await expect(resolvePrecisionVolumeTargetTabId(null)).resolves.toBe(7);
  });
});
