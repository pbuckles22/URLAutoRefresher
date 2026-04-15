/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { formatIndividualJobCountdown } from './dashboard-countdown';
import { createIndividualJobListRow } from './individual-job-list-row';
import type { IndividualJob } from './types';

const sampleJob = (overrides: Partial<IndividualJob> = {}): IndividualJob => ({
  id: 'job-1',
  target: { tabId: 42, windowId: 1, targetUrl: 'https://example.com/path' },
  baseIntervalSec: 60,
  jitterSec: 5,
  enabled: true,
  nextFireAt: 10_000,
  ...overrides,
});

describe('createIndividualJobListRow', () => {
  it('sets row id attribute and summary, countdown, toggle, delete, and edit field hooks', () => {
    const now = 5000;
    const job = sampleJob();
    const li = createIndividualJobListRow(job, now);

    expect(li.getAttribute('data-individual-job-row')).toBe('job-1');
    expect(li.querySelector('[data-job-countdown]')?.textContent).toBe(
      formatIndividualJobCountdown(now, job)
    );

    const summaryLine = li.querySelector('span:not([data-job-countdown])');
    expect(summaryLine?.textContent).toBe(
      'Tab 42 → https://example.com/path · every 60s ±5s'
    );

    const toggle = li.querySelector<HTMLButtonElement>('[data-job-toggle]');
    expect(toggle?.textContent).toBe('Stop');

    expect(li.querySelector('[data-job-delete]')).toBeTruthy();
    expect(li.querySelector('[data-job-edit-url]')).toBeTruthy();
    expect(li.querySelector('[data-job-edit-interval]')).toBeTruthy();
    expect(li.querySelector('[data-job-edit-jitter]')).toBeTruthy();
    expect(li.querySelector('[data-job-row-error]')).toBeTruthy();
    expect(li.querySelector('[data-job-edit-error]')).toBeTruthy();
    expect(li.querySelector('[data-job-edit-save]')).toBeTruthy();

    expect((li.querySelector('[data-job-edit-url]') as HTMLInputElement).value).toBe(
      'https://example.com/path'
    );
    expect((li.querySelector('[data-job-edit-interval]') as HTMLInputElement).value).toBe('60');
    expect((li.querySelector('[data-job-edit-jitter]') as HTMLInputElement).value).toBe('5');
  });

  it('shows Start when job is disabled', () => {
    const li = createIndividualJobListRow(sampleJob({ enabled: false }), Date.now());
    expect(li.querySelector('[data-job-toggle]')?.textContent).toBe('Start');
  });
});
