/**
 * Epic 11 — linear gain targets for shortcuts (ramps applied in content via Web Audio).
 * ~2 dB per step; exponential ramps use values strictly > 0 (see bridge scheduling).
 */

export const PV_MIN_GAIN_EXP = 0.0001;
export const PV_MAX_GAIN_LINEAR = 16;

const STEP_DB = 2;
const STEP_RATIO = 10 ** (STEP_DB / 20);

export function clampLinearGain(g: number): number {
  if (!Number.isFinite(g)) {
    return PV_MIN_GAIN_EXP;
  }
  if (g <= 0) {
    return 0;
  }
  if (g > PV_MAX_GAIN_LINEAR) {
    return PV_MAX_GAIN_LINEAR;
  }
  return g;
}

/** First “up” from silence uses a small floor so exponential ramps stay valid. */
export function stepGainUpLinear(current: number): number {
  const c = current <= 0 || !Number.isFinite(current) ? PV_MIN_GAIN_EXP : current;
  return clampLinearGain(c * STEP_RATIO);
}

export function stepGainDownLinear(current: number): number {
  if (!Number.isFinite(current) || current <= 0) {
    return 0;
  }
  const next = current / STEP_RATIO;
  if (next < PV_MIN_GAIN_EXP) {
    return 0;
  }
  return clampLinearGain(next);
}
