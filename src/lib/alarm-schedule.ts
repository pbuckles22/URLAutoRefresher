import { computeNextDelayMs } from './schedule';

const SOON_MS = 250;

/**
 * Chooses the `when` timestamp (ms) for chrome.alarms.create.
 * - Future `nextFireAt` (with slack) is kept.
 * - Stale or missing schedule uses jittered delay from base/jitter.
 */
export function computeAlarmWhen(
  now: number,
  nextFireAt: number | undefined,
  baseMs: number,
  jitterMs: number,
  random: () => number = Math.random
): number {
  if (nextFireAt != null && nextFireAt > now + SOON_MS) {
    return nextFireAt;
  }
  if (nextFireAt != null && nextFireAt <= now + SOON_MS) {
    return now + SOON_MS;
  }
  return now + computeNextDelayMs(baseMs, jitterMs, random);
}
