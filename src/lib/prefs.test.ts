import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DEFAULT_PREFS, loadExtensionPrefs, parsePrefs, PREFS_STORAGE_KEY, saveExtensionPrefs } from './prefs';

describe('prefs', () => {
  it('defaults when missing', () => {
    expect(parsePrefs(undefined)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs({})).toEqual(DEFAULT_PREFS);
  });

  it('showPageOverlayTimer false when set', () => {
    expect(parsePrefs({ showPageOverlayTimer: false }).showPageOverlayTimer).toBe(false);
  });

  it('showPageOverlayTimer true when set', () => {
    expect(parsePrefs({ showPageOverlayTimer: true }).showPageOverlayTimer).toBe(true);
  });

  it('ignores invalid showPageOverlayTimer', () => {
    expect(parsePrefs({ showPageOverlayTimer: 'yes' }).showPageOverlayTimer).toBe(true);
  });
});

describe('extension prefs in chrome.storage.local (Epic 3.0)', () => {
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

  it('loadExtensionPrefs returns defaults when key missing', async () => {
    await expect(loadExtensionPrefs()).resolves.toEqual(DEFAULT_PREFS);
  });

  it('saveExtensionPrefs and loadExtensionPrefs round-trip', async () => {
    await saveExtensionPrefs({ showPageOverlayTimer: false });
    await expect(loadExtensionPrefs()).resolves.toEqual({ showPageOverlayTimer: false });
    expect(mem[PREFS_STORAGE_KEY]).toEqual({ showPageOverlayTimer: false });
  });
});
