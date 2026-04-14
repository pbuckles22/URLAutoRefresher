import { describe, it, expect } from 'vitest';
import { DEFAULT_PREFS, parsePrefs } from './prefs';

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
