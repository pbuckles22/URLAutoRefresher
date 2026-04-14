import { describe, it, expect } from 'vitest';
import { computeAlarmWhen } from './alarm-schedule';

describe('computeAlarmWhen', () => {
  const now = 1_000_000;

  it('keeps future nextFireAt', () => {
    const nf = now + 60_000;
    expect(computeAlarmWhen(now, nf, 5000, 0)).toBe(nf);
  });

  it('fires soon when nextFireAt is stale', () => {
    expect(computeAlarmWhen(now, now - 1000, 5000, 0)).toBe(now + 250);
  });

  it('uses jitter when no nextFireAt', () => {
    const r = () => 0.5;
    expect(computeAlarmWhen(now, undefined, 10_000, 1000, r)).toBe(now + 10_000);
  });
});
