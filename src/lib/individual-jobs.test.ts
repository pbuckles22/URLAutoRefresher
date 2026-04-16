import { describe, it, expect } from 'vitest';
import type { AppState, IndividualJob } from './types';
import {
  removeIndividualJobById,
  replaceIndividualJob,
  setIndividualJobEnabled,
} from './individual-jobs';

function sampleJob(overrides: Partial<IndividualJob> = {}): IndividualJob {
  return {
    id: 'job-a',
    target: { tabId: 1, windowId: 0, targetUrl: 'https://example.com' },
    baseIntervalSec: 60,
    jitterSec: 0,
    enabled: true,
    nextFireAt: 9_000_000,
    ...overrides,
  };
}

function emptyState(): AppState {
  return { schemaVersion: 1, globalGroups: [], individualJobs: [] };
}

describe('individual-jobs (Epic 3.2)', () => {
  it('removeIndividualJobById drops the job', () => {
    const j1 = sampleJob({ id: 'keep' });
    const j2 = sampleJob({ id: 'drop', target: { tabId: 2, windowId: 0, targetUrl: 'https://b.com' } });
    const state: AppState = { ...emptyState(), individualJobs: [j1, j2] };
    const next = removeIndividualJobById(state, 'drop');
    expect(next.individualJobs).toEqual([j1]);
  });

  it('setIndividualJobEnabled toggles enabled and clears nextFireAt when stopping', () => {
    const job = sampleJob({ liveAwareRefresh: true, streamLive: true });
    const state: AppState = { ...emptyState(), individualJobs: [job] };
    const stopped = setIndividualJobEnabled(state, 'job-a', false);
    expect(stopped.individualJobs[0]).toMatchObject({
      enabled: false,
      nextFireAt: undefined,
      streamLive: undefined,
      overlayPaused: undefined,
    });
    const started = setIndividualJobEnabled(stopped, 'job-a', true);
    expect(started.individualJobs[0]).toMatchObject({ enabled: true });
  });

  it('setIndividualJobEnabled leaves other jobs unchanged', () => {
    const a = sampleJob({ id: 'a' });
    const b = sampleJob({
      id: 'b',
      target: { tabId: 2, windowId: 0, targetUrl: 'https://b.com' },
    });
    const state: AppState = { ...emptyState(), individualJobs: [a, b] };
    const next = setIndividualJobEnabled(state, 'b', false);
    expect(next.individualJobs[0]).toBe(a);
    expect(next.individualJobs[1]?.enabled).toBe(false);
  });

  it('replaceIndividualJob updates the matching row by id', () => {
    const job = sampleJob();
    const state: AppState = { ...emptyState(), individualJobs: [job] };
    const edited: IndividualJob = {
      ...job,
      baseIntervalSec: 120,
      jitterSec: 3,
      target: { ...job.target, targetUrl: 'https://edited.example' },
    };
    const next = replaceIndividualJob(state, edited);
    expect(next.individualJobs).toHaveLength(1);
    expect(next.individualJobs[0]).toEqual(edited);
  });

  it('replaceIndividualJob is a no-op when id is missing', () => {
    const state: AppState = { ...emptyState(), individualJobs: [sampleJob()] };
    const ghost: IndividualJob = {
      ...sampleJob({ id: 'missing' }),
      baseIntervalSec: 1,
    };
    const next = replaceIndividualJob(state, ghost);
    expect(next).toEqual(state);
  });
});
