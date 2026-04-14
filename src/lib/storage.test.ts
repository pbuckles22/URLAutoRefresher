import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadAppState, saveAppState, STORAGE_KEY } from './storage';
import { DEFAULT_STATE } from './state';

describe('storage (chrome.storage.local)', () => {
  const mem: Record<string, unknown> = {};

  beforeEach(() => {
    Object.keys(mem).forEach((k) => delete mem[k]);
    vi.stubGlobal('chrome', {
      storage: {
        local: {
          get: async (keys: string | string[] | null) => {
            if (keys == null) {
              return { ...mem };
            }
            const k = typeof keys === 'string' ? keys : keys[0];
            return { [k]: mem[k] };
          },
          set: async (items: Record<string, unknown>) => {
            Object.assign(mem, items);
          },
        },
      },
    });
  });

  it('load returns default when empty', async () => {
    const s = await loadAppState();
    expect(s).toEqual(DEFAULT_STATE);
  });

  it('round-trips state', async () => {
    const next = {
      ...DEFAULT_STATE,
      individualJobs: [
        {
          id: 'j1',
          target: {
            tabId: 1,
            windowId: 1,
            targetUrl: 'https://example.com',
          },
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: false,
        },
      ],
    };
    await saveAppState(next);
    const loaded = await loadAppState();
    expect(loaded).toEqual(next);
    expect(mem[STORAGE_KEY]).toEqual(next);
  });
});
