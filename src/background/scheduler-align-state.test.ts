import { describe, expect, it, vi } from 'vitest';
import { resolveGlobalGroupTargets } from '../lib/global-group-targets';
import type { AppState } from '../lib/types';
import {
  alignAppState,
  alignGlobalGroupsState,
  alignIndividualJobsState,
  baseAndJitterMs,
  memberNextFireAtSig,
} from './scheduler-align-state';

vi.mock('../lib/global-group-targets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/global-group-targets')>();
  return {
    ...actual,
    resolveGlobalGroupTargets: vi.fn(actual.resolveGlobalGroupTargets),
  };
});

const mockedResolve = vi.mocked(resolveGlobalGroupTargets);

function minimalState(overrides: Partial<AppState> = {}): AppState {
  return {
    schemaVersion: 3,
    globalGroups: [],
    individualJobs: [],
    ...overrides,
  };
}

describe('baseAndJitterMs', () => {
  it('converts seconds to milliseconds', () => {
    expect(baseAndJitterMs({ baseIntervalSec: 30, jitterSec: 5 })).toEqual({
      baseMs: 30_000,
      jitterMs: 5_000,
    });
  });
});

describe('memberNextFireAtSig', () => {
  it('returns empty string for undefined or empty map', () => {
    expect(memberNextFireAtSig(undefined)).toBe('');
    expect(memberNextFireAtSig({})).toBe('');
  });

  it('sorts keys and joins stable pairs', () => {
    expect(memberNextFireAtSig({ z: 1, a: 2 })).toBe('a:2|z:1');
  });
});

describe('alignIndividualJobsState', () => {
  const now = 1_000_000;

  it('clears nextFireAt when job is disabled', () => {
    const state = minimalState({
      individualJobs: [
        {
          id: 'j1',
          target: { targetUrl: 'https://x/' },
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: false,
          nextFireAt: 9_999_999,
        },
      ],
    });
    const out = alignIndividualJobsState(state, now);
    expect(out.individualJobs[0].nextFireAt).toBeUndefined();
  });

  it('clears nextFireAt when overlayPaused', () => {
    const state = minimalState({
      individualJobs: [
        {
          id: 'j1',
          target: { targetUrl: 'https://x/' },
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: true,
          overlayPaused: true,
          nextFireAt: 9_999_999,
        },
      ],
    });
    const out = alignIndividualJobsState(state, now);
    expect(out.individualJobs[0].nextFireAt).toBeUndefined();
  });

  it('keeps future nextFireAt when enabled (zero jitter)', () => {
    const future = now + 600_000;
    const state = minimalState({
      individualJobs: [
        {
          id: 'j1',
          target: { targetUrl: 'https://x/' },
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: true,
          nextFireAt: future,
        },
      ],
    });
    const out = alignIndividualJobsState(state, now);
    expect(out.individualJobs[0].nextFireAt).toBe(future);
  });
});

describe('alignGlobalGroupsState', () => {
  const now = 2_000_000;

  beforeEach(() => {
    mockedResolve.mockReset();
  });

  it('strips schedule fields when group is disabled', async () => {
    mockedResolve.mockResolvedValue([]);
    const state = minimalState({
      globalGroups: [
        {
          id: 'g1',
          name: 'G',
          targets: [{ targetUrl: 'https://example.com/' }],
          baseIntervalSec: 30,
          jitterSec: 0,
          enabled: false,
          nextFireAt: 123,
          memberNextFireAt: { 'example.com': 456 },
        },
      ],
    });
    const out = await alignGlobalGroupsState(state, now);
    expect(mockedResolve).not.toHaveBeenCalled();
    expect(out.globalGroups[0].nextFireAt).toBeUndefined();
    expect(out.globalGroups[0].memberNextFireAt).toBeUndefined();
  });

  it('seeds member fires from legacy nextFireAt when resolver returns members', async () => {
    mockedResolve.mockResolvedValue([{ tabId: 1, windowId: 1, targetUrl: 'https://example.com/' }]);
    const state = minimalState({
      globalGroups: [
        {
          id: 'g1',
          name: 'G',
          targets: [{ targetUrl: 'https://example.com/' }],
          baseIntervalSec: 30,
          jitterSec: 0,
          enabled: true,
          nextFireAt: 9_000_000,
        },
      ],
    });
    const out = await alignGlobalGroupsState(state, now);
    expect(out.globalGroups[0].nextFireAt).toBeUndefined();
    expect(out.globalGroups[0].memberNextFireAt).toEqual({
      'example.com': now + 30_000,
    });
  });

  it('keeps memberNextFireAt for enrolled targets when tab URL drifted (no resolved tab)', async () => {
    const future = now + 600_000;
    mockedResolve.mockResolvedValue([]);
    const state = minimalState({
      globalGroups: [
        {
          id: 'g1',
          name: 'TwitchFavs',
          targets: [{ targetUrl: 'https://www.twitch.tv/djsonnyd' }],
          baseIntervalSec: 500,
          jitterSec: 30,
          enabled: true,
          memberNextFireAt: { 'twitch.tv/djsonnyd': future },
        },
      ],
    });
    const out = await alignGlobalGroupsState(state, now);
    expect(out.globalGroups[0].memberNextFireAt).toEqual({
      'twitch.tv/djsonnyd': future,
    });
  });

  it('assigns stagger when enabled and resolver returns new member', async () => {
    mockedResolve.mockResolvedValue([
      { tabId: 2, windowId: 1, targetUrl: 'https://example.com/foo' },
    ]);
    const state = minimalState({
      globalGroups: [
        {
          id: 'g1',
          name: 'G',
          targets: [{ targetUrl: 'https://example.com/foo' }],
          baseIntervalSec: 45,
          jitterSec: 0,
          enabled: true,
        },
      ],
    });
    const out = await alignGlobalGroupsState(state, now);
    expect(out.globalGroups[0].memberNextFireAt).toEqual({
      'example.com/foo': now + 45_000,
    });
  });
});

describe('alignAppState', () => {
  it('runs individual then global alignment', async () => {
    mockedResolve.mockResolvedValue([]);
    const now = 3_000_000;
    const state = minimalState({
      individualJobs: [
        {
          id: 'j1',
          target: { targetUrl: 'https://a/' },
          baseIntervalSec: 10,
          jitterSec: 0,
          enabled: true,
          nextFireAt: now + 100_000,
        },
      ],
      globalGroups: [
        {
          id: 'g1',
          name: 'G',
          targets: [{ targetUrl: 'https://b/' }],
          baseIntervalSec: 20,
          jitterSec: 0,
          enabled: true,
        },
      ],
    });
    const out = await alignAppState(state, now);
    expect(out.individualJobs[0].nextFireAt).toBe(now + 100_000);
    expect(out.globalGroups[0].memberNextFireAt).toBeUndefined();
  });
});
