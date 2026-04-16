import { describe, it, expect } from 'vitest';
import type { GlobalGroup, IndividualJob } from './types';
import { formatGlobalGroupCountdown, formatIndividualJobCountdown } from './dashboard-countdown';

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

  it('prefixes countdown with live when paused for Twitch live', () => {
    const now = 1_000_000;
    const nextFireAt = now + 10_000;
    expect(
      formatIndividualJobCountdown(
        now,
        job({ liveAwareRefresh: true, streamLive: true, nextFireAt })
      )
    ).toBe('live 0:10');
  });

  it('shows live 0:00 when past fire time and paused for live', () => {
    expect(
      formatIndividualJobCountdown(
        10_000,
        job({ liveAwareRefresh: true, streamLive: true, nextFireAt: 5_000 })
      )
    ).toBe('live 0:00');
  });
});

function group(overrides: Partial<GlobalGroup> = {}): GlobalGroup {
  return {
    id: 'g',
    name: 'G',
    targets: [{ tabId: 1, windowId: 0, targetUrl: 'https://x.com' }],
    baseIntervalSec: 60,
    jitterSec: 0,
    enabled: true,
    ...overrides,
  };
}

describe('formatGlobalGroupCountdown', () => {
  it('shows em dash when group is stopped', () => {
    expect(formatGlobalGroupCountdown(1_000, group({ enabled: false }))).toBe('—');
  });

  it('shows ellipsis when enabled but no next fire time yet', () => {
    expect(formatGlobalGroupCountdown(1_000, group({ nextFireAt: undefined }))).toBe('…');
  });

  it('formats remaining time as m:ss (legacy single nextFireAt)', () => {
    const now = 1_000_000;
    const nextFireAt = now + 125_000;
    expect(formatGlobalGroupCountdown(now, group({ nextFireAt }))).toBe('2:05');
  });

  it('shows per-tab range when tabNextFireAt differs', () => {
    const now = 1_000_000;
    const g = group({
      nextFireAt: undefined,
      tabNextFireAt: { '1': now + 60_000, '2': now + 180_000 },
    });
    expect(formatGlobalGroupCountdown(now, g)).toBe('1:00–3:00');
  });

  it('shows single m:ss when per-tab schedules match', () => {
    const now = 1_000_000;
    const g = group({
      tabNextFireAt: { '1': now + 90_000, '2': now + 90_000 },
    });
    expect(formatGlobalGroupCountdown(now, g)).toBe('1:30');
  });

  it('shows 0:00 when past fire time', () => {
    expect(formatGlobalGroupCountdown(10_000, group({ nextFireAt: 5_000 }))).toBe('0:00');
  });
});
