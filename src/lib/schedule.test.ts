import { describe, it, expect } from 'vitest';
import { computeNextDelayMs } from './schedule';

describe('computeNextDelayMs', () => {
  it('returns base when jitter is zero', () => {
    expect(computeNextDelayMs(5000, 0)).toBe(5000);
  });

  it('adds deterministic offset when random is fixed at 0', () => {
    const r = () => 0;
    // offset = -jitter + 0 * 2jitter = -jitter
    expect(computeNextDelayMs(10_000, 1000, r)).toBe(9000);
  });

  it('adds +jitter when random is fixed at 1', () => {
    const r = () => 1;
    expect(computeNextDelayMs(10_000, 1000, r)).toBe(11_000);
  });

  it('uses midpoint when random is 0.5', () => {
    const r = () => 0.5;
    expect(computeNextDelayMs(10_000, 1000, r)).toBe(10_000);
  });

  it('clamps to zero when base + offset would be negative', () => {
    const r = () => 0;
    expect(computeNextDelayMs(500, 2000, r)).toBe(0);
  });

  it('rejects non-positive base', () => {
    expect(() => computeNextDelayMs(0, 0)).toThrow(/base/i);
    expect(() => computeNextDelayMs(-1, 0)).toThrow(/base/i);
  });

  it('rejects negative jitter', () => {
    expect(() => computeNextDelayMs(1000, -1)).toThrow(/jitter/i);
  });
});
