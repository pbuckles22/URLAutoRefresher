import { describe, expect, it } from 'vitest';
import { BLIP_MAX_REGEX_LEN } from './blip-match';
import { getBlipWatchForTab } from './blip-tab-state';
import type { AppState, IndividualJob } from './types';

const baseJob = (over: Partial<IndividualJob> = {}): IndividualJob => ({
  id: 'j1',
  target: { targetUrl: 'https://example.com/path' },
  baseIntervalSec: 60,
  jitterSec: 0,
  enabled: true,
  ...over,
});

const stateWith = (jobs: IndividualJob[]): AppState => ({
  schemaVersion: 3,
  globalGroups: [],
  individualJobs: jobs,
});

describe('getBlipWatchForTab', () => {
  it('returns undefined when tab URL is missing or empty', () => {
    const s = stateWith([baseJob({ blipWatchPhrases: ['x'] })]);
    expect(getBlipWatchForTab(s, undefined)).toBeUndefined();
    expect(getBlipWatchForTab(s, '')).toBeUndefined();
    expect(getBlipWatchForTab(s, '   ')).toBeUndefined();
  });

  it('returns undefined when no job matches the page URL', () => {
    const s = stateWith([baseJob({ blipWatchPhrases: ['a'] })]);
    expect(getBlipWatchForTab(s, 'https://other.com/')).toBeUndefined();
  });

  it('returns undefined when matching job is disabled', () => {
    const s = stateWith([
      baseJob({
        enabled: false,
        blipWatchPhrases: ['a'],
        target: { targetUrl: 'https://example.com/' },
      }),
    ]);
    expect(getBlipWatchForTab(s, 'https://example.com/')).toBeUndefined();
  });

  it('returns undefined when job has no phrases and no non-empty regex', () => {
    const s = stateWith([baseJob({ blipWatchPhrases: [], blipWatchRegex: '  ' })]);
    expect(getBlipWatchForTab(s, 'https://example.com/path')).toBeUndefined();
  });

  it('returns pack with phrases and default max per minute', () => {
    const s = stateWith([baseJob({ blipWatchPhrases: ['  hello ', 'hello'] })]);
    const pack = getBlipWatchForTab(s, 'https://example.com/path');
    expect(pack).toEqual({
      phrases: ['  hello ', 'hello'],
      targetUrl: 'https://example.com/path',
      maxPerMinute: 8,
    });
  });

  it('includes regex when set and caps regex length', () => {
    const longRx = 'a'.repeat(BLIP_MAX_REGEX_LEN + 50);
    const s = stateWith([baseJob({ blipWatchRegex: longRx })]);
    const pack = getBlipWatchForTab(s, 'https://example.com/path');
    expect(pack?.regex).toBe(longRx.slice(0, BLIP_MAX_REGEX_LEN));
    expect(pack?.phrases).toEqual([]);
    expect(pack?.maxPerMinute).toBe(8);
  });

  it('clamps maxPerMinute between 1 and 30 for integer values', () => {
    const page = 'https://example.com/path';
    expect(
      getBlipWatchForTab(
        stateWith([baseJob({ blipWatchPhrases: ['x'], blipMaxPerMinute: 0 })]),
        page
      )?.maxPerMinute
    ).toBe(1);
    expect(
      getBlipWatchForTab(
        stateWith([baseJob({ blipWatchPhrases: ['x'], blipMaxPerMinute: 100 })]),
        page
      )?.maxPerMinute
    ).toBe(30);
    expect(
      getBlipWatchForTab(
        stateWith([baseJob({ blipWatchPhrases: ['x'], blipMaxPerMinute: 12 })]),
        page
      )?.maxPerMinute
    ).toBe(12);
  });

  it('uses default 8 when maxPerMinute is not a finite integer', () => {
    const s = stateWith([
      baseJob({ blipWatchPhrases: ['x'], blipMaxPerMinute: 2.5 as unknown as number }),
    ]);
    expect(getBlipWatchForTab(s, 'https://example.com/path')?.maxPerMinute).toBe(8);
  });

  it('uses first matching job in list order', () => {
    const first = baseJob({
      id: 'first',
      blipWatchPhrases: ['a'],
      target: { targetUrl: 'https://example.com/' },
    });
    const second = baseJob({
      id: 'second',
      blipWatchPhrases: ['b'],
      target: { targetUrl: 'https://example.com/' },
    });
    const pack = getBlipWatchForTab(stateWith([first, second]), 'https://example.com/x');
    expect(pack?.targetUrl).toBe('https://example.com/');
    expect(pack?.phrases).toEqual(['a']);
  });
});
