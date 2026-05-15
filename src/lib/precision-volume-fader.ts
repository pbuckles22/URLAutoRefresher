/**
 * Epic 11.5 — dashboard fader position ↔ linear gain (non-negative fader; negatives via numeric).
 * Low-gain region 0…0.2 linear uses the first half of fader travel (PVC.2-style low-end resolution).
 */
import { PV_MAX_GAIN_LINEAR } from './precision-volume-gain';

/** Linear gain at the end of the first half of fader travel (exclusive of max). */
export const PV_FADER_LOW_REGION_END_GAIN = 0.2 as const;

const HALF = 0.5;

function clampUnit(p: number): number {
  if (!Number.isFinite(p)) {
    return 0;
  }
  if (p <= 0) {
    return 0;
  }
  if (p >= 1) {
    return 1;
  }
  return p;
}

/** Fader position 0…1 → linear gain 0…PV_MAX (monotone). */
export function linearGainFromFaderPosition(position: number): number {
  const pos = clampUnit(position);
  if (pos <= HALF) {
    return (pos / HALF) * PV_FADER_LOW_REGION_END_GAIN;
  }
  const u = (pos - HALF) / HALF;
  return PV_FADER_LOW_REGION_END_GAIN + u * (PV_MAX_GAIN_LINEAR - PV_FADER_LOW_REGION_END_GAIN);
}

/** Linear gain g ≥ 0 → fader position 0…1; used to set range input from gain. */
export function faderPositionFromLinearGain(linearGain: number): number {
  const g = Math.max(0, Number.isFinite(linearGain) ? linearGain : 0);
  if (g <= PV_FADER_LOW_REGION_END_GAIN) {
    return HALF * (g / PV_FADER_LOW_REGION_END_GAIN);
  }
  const span = PV_MAX_GAIN_LINEAR - PV_FADER_LOW_REGION_END_GAIN;
  if (span <= 0) {
    return 1;
  }
  return HALF + HALF * Math.min(1, (g - PV_FADER_LOW_REGION_END_GAIN) / span);
}

/** Range input 0…10000 (int) ↔ position 0…1. */
export function faderValueToPosition(value: number): number {
  return clampUnit(value / 10000);
}

export function linearGainToFaderValue(linearGain: number): number {
  return Math.round(faderPositionFromLinearGain(linearGain) * 10000);
}

export function faderValueToLinearGain(value: number): number {
  return linearGainFromFaderPosition(faderValueToPosition(value));
}

/** Shift: interpolate 10× finer toward the pointer from the previous fader position (PVC.3). */
export function applyShiftFineFaderPosition(
  previousPosition: number,
  rawPointerPosition: number,
  shiftHeld: boolean
): number {
  const raw = clampUnit(rawPointerPosition);
  const prev = clampUnit(previousPosition);
  if (!shiftHeld) {
    return raw;
  }
  return clampUnit(prev + (raw - prev) * 0.1);
}

/** Display / numeric field: percent of unity (100 = gain 1.0). */
export function percentToLinearGain(percent: number): number {
  if (!Number.isFinite(percent)) {
    return 0;
  }
  return percent / 100;
}

export function linearGainToPercent(linearGain: number): number {
  if (!Number.isFinite(linearGain)) {
    return 0;
  }
  return linearGain * 100;
}

/** Parse user percent text; returns null if empty or invalid. */
export function parsePercentInput(raw: string): number | null {
  const s = raw.trim();
  if (s === '') {
    return null;
  }
  const n = Number(s);
  if (!Number.isFinite(n)) {
    return null;
  }
  return n;
}

export function formatPercentInput(percent: number): string {
  if (!Number.isFinite(percent)) {
    return '';
  }
  const rounded = Math.round(percent * 1000) / 1000;
  if (Object.is(rounded, -0)) {
    return '0';
  }
  return String(rounded);
}
