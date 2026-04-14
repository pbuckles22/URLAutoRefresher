import { describe, it, expect } from 'vitest';
import type { IndividualJob } from './types';
import { formatIndividualJobCountdown } from './dashboard-countdown';

function job(overrides: Partial<IndividualJob> = {}): IndividualJob {
  return {
    id: 'j',
    target: { tabId: 1, windowId: 0, targetUrl: 'https://x.com' },
    baseIntervalSec: 60,
    jitterSec: 0,
    enabled: true,
    ...overrides,
  };
}

describe('formatIndividualJobCountdown', () => {
  it('shows em dash when job is stopped', () => {
    expect(formatIndividualJobCountdown(1_000, job({ enabled: false }))).toBe('—');
  });

  it('shows ellipsis when enabled but no next fire time yet', () => {
    expect(formatIndividualJobCountdown(1_000, job({ nextFireAt: undefined }))).toBe('…');
  });

  it('formats remaining time as m:ss', () => {
    const now = 1_000_000;
    const nextFireAt = now + 65_000;
    expect(formatIndividualJobCountdown(now, job({ nextFireAt }))).toBe('1:05');
  });

  it('shows 0:00 when past fire time', () => {
    expect(formatIndividualJobCountdown(10_000, job({ nextFireAt: 5_000 }))).toBe('0:00');
  });
});
