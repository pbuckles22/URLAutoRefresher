/**
 * Next alarm delay: base + uniform offset in [-jitterMs, +jitterMs].
 * `random` defaults to Math.random; inject for tests.
 */
export function computeNextDelayMs(
  baseMs: number,
  jitterMs: number,
  random: () => number = Math.random
): number {
  if (baseMs <= 0) {
    throw new Error('baseMs must be positive');
  }
  if (jitterMs < 0) {
    throw new Error('jitterMs must be non-negative');
  }
  if (jitterMs === 0) {
    return Math.round(baseMs);
  }
  const low = -jitterMs;
  const high = jitterMs;
  const delta = low + random() * (high - low);
  return Math.max(0, Math.round(baseMs + delta));
}
