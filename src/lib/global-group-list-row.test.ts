/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest';
import { formatGlobalGroupCountdown } from './dashboard-countdown';
import { createGlobalGroupListRow } from './global-group-list-row';
import type { GlobalGroup } from './types';

const sampleGroup = (overrides: Partial<GlobalGroup> = {}): GlobalGroup => ({
  id: 'gg-1',
  name: 'Sync set',
  targets: [
    { tabId: 40, windowId: 1, targetUrl: 'https://example.com/a', label: 'Dash' },
    { tabId: 41, windowId: 1, targetUrl: 'https://example.com/b' },
  ],
  baseIntervalSec: 55,
  jitterSec: 4,
  enabled: true,
  nextFireAt: 50_000,
  ...overrides,
});

describe('createGlobalGroupListRow', () => {
  it('sets row id, summary, countdown, toggle, delete, and edit hooks', () => {
    const now = 10_000;
    const g = sampleGroup();
    const li = createGlobalGroupListRow(g, now);

    expect(li.getAttribute('data-global-group-row')).toBe('gg-1');
    expect(li.querySelector('[data-global-group-countdown]')?.textContent).toBe(
      formatGlobalGroupCountdown(now, g)
    );

    const summaryLine = li.querySelector('span:not([data-global-group-countdown])');
    expect(summaryLine?.textContent).toBe('Sync set · 2 tabs · every 55s ±4s');

    expect(li.querySelector<HTMLButtonElement>('[data-global-group-toggle]')?.textContent).toBe('Stop');
    expect(li.querySelector('[data-global-group-delete]')).toBeTruthy();

    expect((li.querySelector<HTMLInputElement>('[data-global-edit-name]'))?.value).toBe('Sync set');
    expect((li.querySelector<HTMLInputElement>('[data-global-edit-interval]'))?.value).toBe('55');
    expect((li.querySelector<HTMLInputElement>('[data-global-edit-jitter]'))?.value).toBe('4');

    const u40 = li.querySelector<HTMLInputElement>('[data-global-edit-target-tab="40"]');
    const u41 = li.querySelector<HTMLInputElement>('[data-global-edit-target-tab="41"]');
    expect(u40?.value).toBe('https://example.com/a');
    expect(u41?.value).toBe('https://example.com/b');

    expect(li.querySelector('[data-global-group-row-error]')).toBeTruthy();
    expect(li.querySelector('[data-global-edit-error]')).toBeTruthy();
    expect(li.querySelector('[data-global-edit-save]')).toBeTruthy();
  });

  it('shows Start when group is disabled', () => {
    const li = createGlobalGroupListRow(sampleGroup({ enabled: false }), Date.now());
    expect(li.querySelector('[data-global-group-toggle]')?.textContent).toBe('Start');
  });
});
