import { describe, expect, it } from 'vitest';
import { PV_MAX_GAIN_LINEAR } from './precision-volume-gain';
import {
  precisionVolumeOsdMessageForHookFailed,
  precisionVolumeOsdMessageForLevel,
  precisionVolumeOsdMessageForNoMedia,
  precisionVolumeOsdMessageForPanicMute,
} from './precision-volume-osd-text';

describe('precisionVolumeOsdMessageForNoMedia', () => {
  it('returns stable copy', () => {
    expect(precisionVolumeOsdMessageForNoMedia()).toBe('No media on this page');
  });
});

describe('precisionVolumeOsdMessageForHookFailed', () => {
  it('returns stable copy', () => {
    expect(precisionVolumeOsdMessageForHookFailed()).toBe("Can't attach to this media");
  });
});

describe('precisionVolumeOsdMessageForPanicMute', () => {
  it('returns stable copy', () => {
    expect(precisionVolumeOsdMessageForPanicMute()).toBe('Muted');
  });
});

describe('precisionVolumeOsdMessageForLevel', () => {
  it('formats zero', () => {
    expect(precisionVolumeOsdMessageForLevel(0)).toBe('0%');
  });

  it('formats unity and max', () => {
    expect(precisionVolumeOsdMessageForLevel(1)).toBe('100%');
    expect(precisionVolumeOsdMessageForLevel(PV_MAX_GAIN_LINEAR)).toBe('1600%');
  });

  it('clamps to signed max and shows negative phase', () => {
    expect(precisionVolumeOsdMessageForLevel(-1)).toBe('-100%');
    expect(precisionVolumeOsdMessageForLevel(-99)).toBe('-1600%');
  });
});
