/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AppState, IndividualJob } from '../lib/types';
import * as storage from '../lib/storage';
import {
  bindAddIndividualJobForm,
  bindJobsListEvents,
  renderIndividualJobs,
  tickIndividualJobCountdowns,
} from './dashboard-individual-jobs';
import { createDashboardContext } from './dashboard-shell';

const emptyState = (): AppState => ({
  schemaVersion: 3,
  globalGroups: [],
  individualJobs: [],
});

const sampleJob = (id: string, nextFireAt: number): IndividualJob => ({
  id,
  target: { targetUrl: 'https://example.com/' },
  baseIntervalSec: 60,
  jitterSec: 5,
  enabled: true,
  nextFireAt,
});

describe('renderIndividualJobs', () => {
  let loadSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    document.body.innerHTML = `
      <h2 data-individual-section-heading></h2>
      <ul data-individual-jobs-list></ul>
    `;
    loadSpy = vi.spyOn(storage, 'loadAppState');
  });

  afterEach(() => {
    loadSpy.mockRestore();
  });

  it('updates heading and renders one row per job', async () => {
    const ctx = createDashboardContext();
    const job = sampleJob('a', Date.now() + 90_000);
    loadSpy.mockResolvedValue({ ...emptyState(), individualJobs: [job] });
    await renderIndividualJobs(ctx);
    expect(ctx.dom.individualSectionHeading?.textContent).toBe('Individual (1)');
    const rows = ctx.dom.jobsList?.querySelectorAll('[data-individual-job-row]');
    expect(rows?.length).toBe(1);
    expect(rows?.[0]?.getAttribute('data-individual-job-row')).toBe('a');
  });

  it('updates heading when jobs list is absent', async () => {
    document.body.innerHTML = `<h2 data-individual-section-heading></h2>`;
    const ctx = createDashboardContext();
    loadSpy.mockResolvedValue({
      ...emptyState(),
      individualJobs: [sampleJob('solo', Date.now() + 10_000)],
    });
    await renderIndividualJobs(ctx);
    expect(ctx.dom.individualSectionHeading?.textContent).toBe('Individual (1)');
    expect(ctx.dom.jobsList).toBeNull();
  });
});

describe('tickIndividualJobCountdowns', () => {
  it('no-ops when jobs list element is missing', () => {
    const job = sampleJob('x', Date.now() + 60_000);
    expect(() => tickIndividualJobCountdowns(null, [job], Date.now())).not.toThrow();
  });

  it('updates countdown cells for listed jobs', () => {
    const t0 = 1_700_000_000_000;
    const job = sampleJob('x', t0 + 120_000);
    document.body.innerHTML = `<ul data-individual-jobs-list></ul>`;
    const ctx = createDashboardContext();
    const list = ctx.dom.jobsList!;
    const li = document.createElement('li');
    li.setAttribute('data-individual-job-row', job.id);
    const span = document.createElement('span');
    span.setAttribute('data-job-countdown', '');
    span.textContent = 'seed';
    li.appendChild(span);
    list.appendChild(li);

    tickIndividualJobCountdowns(list, [job], t0 + 60_000);
    expect(span.textContent).toBe('1:00');
    tickIndividualJobCountdowns(list, [job], t0 + 61_000);
    expect(span.textContent).toBe('0:59');
  });
});

describe('bindJobsListEvents', () => {
  let loadSpy: ReturnType<typeof vi.spyOn>;
  let saveSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    document.body.innerHTML = `<ul data-individual-jobs-list></ul>`;
    loadSpy = vi.spyOn(storage, 'loadAppState');
    saveSpy = vi.spyOn(storage, 'saveAppState').mockResolvedValue(undefined);
  });

  afterEach(() => {
    loadSpy.mockRestore();
    saveSpy.mockRestore();
  });

  it('delete removes job and re-renders', async () => {
    const ctx = createDashboardContext();
    const job = sampleJob('del-me', Date.now() + 60_000);
    let mem: AppState = { ...emptyState(), individualJobs: [job] };
    loadSpy.mockImplementation(() => Promise.resolve(structuredClone(mem)));
    saveSpy.mockImplementation(async (next) => {
      mem = next;
    });

    await renderIndividualJobs(ctx);
    bindJobsListEvents(ctx);

    ctx.dom.jobsList!.querySelector<HTMLButtonElement>('[data-job-delete]')!.click();
    await vi.waitFor(() => {
      expect(saveSpy).toHaveBeenCalled();
    });
    expect(mem.individualJobs).toHaveLength(0);
  });

  it('toggle flips enabled and persists', async () => {
    const ctx = createDashboardContext();
    const job = sampleJob('tog', Date.now() + 60_000);
    job.enabled = true;
    let mem: AppState = { ...emptyState(), individualJobs: [job] };
    loadSpy.mockImplementation(() => Promise.resolve(structuredClone(mem)));
    saveSpy.mockImplementation(async (next) => {
      mem = next;
    });

    await renderIndividualJobs(ctx);
    bindJobsListEvents(ctx);

    ctx.dom.jobsList!.querySelector<HTMLButtonElement>('[data-job-toggle]')!.click();
    await vi.waitFor(() => {
      expect(mem.individualJobs[0]!.enabled).toBe(false);
    });
  });

  it('toggle shows row error when save fails', async () => {
    const ctx = createDashboardContext();
    const job = sampleJob('bad-save', Date.now() + 60_000);
    const mem: AppState = { ...emptyState(), individualJobs: [job] };
    loadSpy.mockImplementation(() => Promise.resolve(structuredClone(mem)));
    saveSpy.mockRejectedValue(new Error('disk full'));

    await renderIndividualJobs(ctx);
    bindJobsListEvents(ctx);

    ctx.dom.jobsList!.querySelector<HTMLButtonElement>('[data-job-toggle]')!.click();
    await vi.waitFor(() => {
      const err = ctx.dom.jobsList!.querySelector('[data-job-row-error]');
      expect(err?.textContent).toBe('disk full');
    });
    expect(mem.individualJobs[0]!.enabled).toBe(true);
  });

  it('edit save updates job when fields validate', async () => {
    const ctx = createDashboardContext();
    const job = sampleJob('edit-me', Date.now() + 60_000);
    job.blipWatchPhrases = ['watch'];
    let mem: AppState = { ...emptyState(), individualJobs: [job] };
    loadSpy.mockImplementation(() => Promise.resolve(structuredClone(mem)));
    saveSpy.mockImplementation(async (next) => {
      mem = next;
    });

    await renderIndividualJobs(ctx);
    bindJobsListEvents(ctx);

    const row = ctx.dom.jobsList!.querySelector('[data-individual-job-row="edit-me"]')!;
    row.querySelector<HTMLInputElement>('[data-job-edit-url]')!.value = 'https://new.example/';
    row.querySelector<HTMLButtonElement>('[data-job-edit-save]')!.click();

    await vi.waitFor(() => {
      expect(mem.individualJobs[0]!.target.targetUrl).toBe('https://new.example/');
    });
  });

  it('edit save shows validation error without persisting', async () => {
    const ctx = createDashboardContext();
    const job = sampleJob('bad-edit', Date.now() + 60_000);
    job.blipWatchPhrases = ['x'];
    const mem: AppState = { ...emptyState(), individualJobs: [job] };
    loadSpy.mockImplementation(() => Promise.resolve(structuredClone(mem)));

    await renderIndividualJobs(ctx);
    bindJobsListEvents(ctx);

    const row = ctx.dom.jobsList!.querySelector('[data-individual-job-row="bad-edit"]')!;
    row.querySelector<HTMLInputElement>('[data-job-edit-interval]')!.value = '0';
    row.querySelector<HTMLButtonElement>('[data-job-edit-save]')!.click();

    await vi.waitFor(() => {
      expect(row.querySelector('[data-job-edit-error]')?.textContent).toMatch(/interval/i);
    });
    expect(saveSpy).not.toHaveBeenCalled();
    expect(mem.individualJobs[0]!.baseIntervalSec).toBe(60);
  });
});

describe('bindAddIndividualJobForm', () => {
  let loadSpy: ReturnType<typeof vi.spyOn>;
  let saveSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    document.body.innerHTML = `
      <h2 data-individual-section-heading></h2>
      <ul data-individual-jobs-list></ul>
      <p data-add-job-error></p>
      <form data-add-individual-form>
        <select data-job-tab><option value="">Select a tab…</option><option value="1">t</option></select>
        <input data-job-target-url value="https://example.com/page" />
        <input data-job-interval value="30" />
        <input data-job-jitter value="2" />
      </form>
    `;
    loadSpy = vi.spyOn(storage, 'loadAppState');
    saveSpy = vi.spyOn(storage, 'saveAppState').mockResolvedValue(undefined);
  });

  afterEach(() => {
    loadSpy.mockRestore();
    saveSpy.mockRestore();
  });

  it('submit appends job when fields validate', async () => {
    const ctx = createDashboardContext();
    loadSpy.mockResolvedValue(emptyState());
    bindAddIndividualJobForm(ctx);

    ctx.dom.addJobForm!.requestSubmit();
    await vi.waitFor(() => {
      expect(saveSpy).toHaveBeenCalled();
    });
    const saved = saveSpy.mock.calls[0]![0] as AppState;
    expect(saved.individualJobs).toHaveLength(1);
    expect(saved.individualJobs[0]!.target.targetUrl).toBe('https://example.com/page');
    expect(saved.individualJobs[0]!.baseIntervalSec).toBe(30);
  });

  it('shows validation error and does not save when interval invalid', async () => {
    const ctx = createDashboardContext();
    loadSpy.mockResolvedValue(emptyState());
    bindAddIndividualJobForm(ctx);

    ctx.dom.intervalInput!.value = '0';
    ctx.dom.addJobForm!.requestSubmit();

    await vi.waitFor(() => {
      expect(ctx.dom.addJobError?.textContent).toMatch(/interval/i);
    });
    expect(saveSpy).not.toHaveBeenCalled();
  });

  it('shows error when save fails', async () => {
    const ctx = createDashboardContext();
    loadSpy.mockResolvedValue(emptyState());
    saveSpy.mockRejectedValue(new Error('quota'));
    bindAddIndividualJobForm(ctx);

    ctx.dom.addJobForm!.requestSubmit();

    await vi.waitFor(() => {
      expect(ctx.dom.addJobError?.textContent).toBe('quota');
    });
  });
});
