import { describe, expect, it } from 'vitest';
import { PV_MAX_GAIN_LINEAR } from './precision-volume-gain';
import {
  PV_FADER_LOW_REGION_END_GAIN,
  applyShiftFineFaderPosition,
  faderPositionFromLinearGain,
  faderValueToLinearGain,
  linearGainFromFaderPosition,
  linearGainToFaderValue,
  parsePercentInput,
  percentToLinearGain,
} from './precision-volume-fader';

describe('linearGainFromFaderPosition', () => {
  it('maps first half of travel to low gain region', () => {
    expect(linearGainFromFaderPosition(0)).toBe(0);
    expect(linearGainFromFaderPosition(0.5)).toBeCloseTo(PV_FADER_LOW_REGION_END_GAIN, 10);
  });

  it('maps end of travel to max linear gain', () => {
    expect(linearGainFromFaderPosition(1)).toBe(PV_MAX_GAIN_LINEAR);
  });
});

describe('faderPositionFromLinearGain', () => {
  it('inverts linearGainFromFaderPosition for non-negative gains', () => {
    for (const pos of [0, 0.12, 0.5, 0.73, 1]) {
      const g = linearGainFromFaderPosition(pos);
      expect(faderPositionFromLinearGain(g)).toBeCloseTo(pos, 5);
    }
  });

  it('treats negative gain as 0 position', () => {
    expect(faderPositionFromLinearGain(-1)).toBe(0);
  });
});

describe('faderValue round-trip', () => {
  it('keeps coarse values stable', () => {
    const g = faderValueToLinearGain(5000);
    expect(linearGainToFaderValue(g)).toBeGreaterThan(0);
  });
});

describe('applyShiftFineFaderPosition', () => {
  it('passes raw position when shift is off', () => {
    expect(applyShiftFineFaderPosition(0.2, 0.8, false)).toBe(0.8);
  });

  it('dampens motion toward raw when shift is on', () => {
    expect(applyShiftFineFaderPosition(0, 1, true)).toBeCloseTo(0.1, 5);
    expect(applyShiftFineFaderPosition(0.5, 1, true)).toBeCloseTo(0.55, 5);
  });
});

describe('percent helpers', () => {
  it('converts percent and gain', () => {
    expect(percentToLinearGain(100)).toBe(1);
    expect(percentToLinearGain(-50)).toBe(-0.5);
  });

  it('parses numeric strings', () => {
    expect(parsePercentInput('5.5')).toBe(5.5);
    expect(parsePercentInput('  -12 ')).toBe(-12);
    expect(parsePercentInput('')).toBeNull();
    expect(parsePercentInput('x')).toBeNull();
  });
});
