import { describe, expect, it } from 'vitest';
import {
  PV_MAX_GAIN_LINEAR,
  PV_MIN_GAIN_EXP,
  clampLinearGain,
  clampSignedLinearGain,
  stepGainDownLinear,
  stepGainUpLinear,
} from './precision-volume-gain';

describe('clampLinearGain', () => {
  it('clamps high values', () => {
    expect(clampLinearGain(999)).toBe(PV_MAX_GAIN_LINEAR);
  });

  it('maps non-finite to epsilon floor', () => {
    expect(clampLinearGain(Number.NaN)).toBe(PV_MIN_GAIN_EXP);
  });

  it('returns 0 for non-positive', () => {
    expect(clampLinearGain(0)).toBe(0);
    expect(clampLinearGain(-1)).toBe(0);
  });
});

describe('stepGainUpLinear', () => {
  it('steps up from silence using epsilon floor', () => {
    const v = stepGainUpLinear(0);
    expect(v).toBeGreaterThan(PV_MIN_GAIN_EXP);
    expect(v).toBeLessThanOrEqual(PV_MAX_GAIN_LINEAR);
  });

  it('increases a mid gain', () => {
    expect(stepGainUpLinear(1)).toBeGreaterThan(1);
  });
});

describe('clampSignedLinearGain', () => {
  it('clamps to symmetric linear domain', () => {
    expect(clampSignedLinearGain(PV_MAX_GAIN_LINEAR + 1)).toBe(PV_MAX_GAIN_LINEAR);
    expect(clampSignedLinearGain(-PV_MAX_GAIN_LINEAR - 1)).toBe(-PV_MAX_GAIN_LINEAR);
    expect(clampSignedLinearGain(-0.5)).toBe(-0.5);
    expect(clampSignedLinearGain(0)).toBe(0);
  });

  it('maps non-finite to 0', () => {
    expect(clampSignedLinearGain(Number.NaN)).toBe(0);
  });
});

describe('stepGainDownLinear', () => {
  it('returns 0 when stepping below exponential floor', () => {
    expect(stepGainDownLinear(PV_MIN_GAIN_EXP)).toBe(0);
  });

  it('decreases a mid gain', () => {
    expect(stepGainDownLinear(1)).toBeLessThan(1);
    expect(stepGainDownLinear(1)).toBeGreaterThan(0);
  });
});
