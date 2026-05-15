/**
 * Epic 13.B2 — individual jobs list rendering, countdown ticks (individual rows only),
 * list event delegation, and add-job form submit.
 */
import { formatIndividualJobCountdown } from '../lib/dashboard-countdown';
import {
  buildIndividualJobFromForm,
  buildIndividualJobUpdateFromForm,
} from '../lib/individual-job-form';
import { createIndividualJobListRow } from '../lib/individual-job-list-row';
import {
  removeIndividualJobById,
  replaceIndividualJob,
  setIndividualJobEnabled,
} from '../lib/individual-jobs';
import { loadAppState, saveAppState } from '../lib/storage';
import type { IndividualJob } from '../lib/types';
import type { DashboardContext } from './dashboard-shell';

function individualJobRowSelectorFragment(jobId: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(jobId);
  }
  return jobId.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export async function renderIndividualJobs(ctx: DashboardContext): Promise<void> {
  const { individualSectionHeading, jobsList } = ctx.dom;
  const state = await loadAppState();
  if (individualSectionHeading) {
    individualSectionHeading.textContent = `Individual (${state.individualJobs.length})`;
  }
  if (!jobsList) {
    return;
  }
  const now = Date.now();
  jobsList.innerHTML = '';
  for (const j of state.individualJobs) {
    jobsList.appendChild(createIndividualJobListRow(j, now));
  }
}

/** Updates `[data-job-countdown]` for each job row; caller supplies `jobs` (e.g. from `loadAppState`). */
export function tickIndividualJobCountdowns(
  jobsList: HTMLUListElement | null,
  jobs: IndividualJob[],
  now: number
): void {
  if (!jobsList) {
    return;
  }
  for (const job of jobs) {
    const row = jobsList.querySelector(
      `[data-individual-job-row="${individualJobRowSelectorFragment(job.id)}"]`
    );
    const el = row?.querySelector('[data-job-countdown]');
    if (el) {
      el.textContent = formatIndividualJobCountdown(now, job);
    }
  }
}

export function bindJobsListEvents(ctx: DashboardContext): void {
  const { jobsList } = ctx.dom;
  if (!jobsList || jobsList.dataset.epic32Bound === '1') {
    return;
  }
  jobsList.dataset.epic32Bound = '1';

  jobsList.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const row = t.closest('[data-individual-job-row]');
    if (!row) {
      return;
    }
    const id = row.getAttribute('data-individual-job-row');
    if (!id) {
      return;
    }

    if (t.closest('[data-job-delete]')) {
      void (async () => {
        const state = await loadAppState();
        const next = removeIndividualJobById(state, id);
        try {
          await saveAppState(next);
        } catch (err) {
          console.error(err);
        }
        await renderIndividualJobs(ctx);
      })();
      return;
    }

    if (t.closest('[data-job-toggle]')) {
      void (async () => {
        const rowErr = row.querySelector('[data-job-row-error]');
        if (rowErr) {
          rowErr.textContent = '';
        }
        const state = await loadAppState();
        const job = state.individualJobs.find((j) => j.id === id);
        if (!job) {
          return;
        }
        const next = setIndividualJobEnabled(state, id, !job.enabled);
        try {
          await saveAppState(next);
        } catch (err) {
          if (rowErr) {
            rowErr.textContent = err instanceof Error ? err.message : String(err);
          } else {
            console.error(err);
          }
          return;
        }
        await renderIndividualJobs(ctx);
      })();
      return;
    }

    if (t.closest('[data-job-edit-save]')) {
      void (async () => {
        const errEl = row.querySelector('[data-job-edit-error]');
        if (errEl) {
          errEl.textContent = '';
        }
        const state = await loadAppState();
        const job = state.individualJobs.find((j) => j.id === id);
        if (!job) {
          return;
        }
        const url = row.querySelector<HTMLInputElement>('[data-job-edit-url]')?.value ?? '';
        const interval = Number(
          row.querySelector<HTMLInputElement>('[data-job-edit-interval]')?.value
        );
        const jitter = Number(row.querySelector<HTMLInputElement>('[data-job-edit-jitter]')?.value);
        const liveAware =
          row.querySelector<HTMLInputElement>('[data-job-edit-live-aware]')?.checked === true;
        const blipPhrases = row.querySelector<HTMLTextAreaElement>(
          '[data-job-edit-blip-phrases]'
        )?.value;
        const blipRegex = row.querySelector<HTMLInputElement>('[data-job-edit-blip-regex]')?.value;
        const built = buildIndividualJobUpdateFromForm(
          {
            targetUrl: url,
            baseIntervalSec: interval,
            jitterSec: jitter,
            liveAwareRefresh: liveAware,
            blipWatchPhrasesText: blipPhrases,
            blipWatchRegex: blipRegex,
          },
          job
        );
        if (!built.ok) {
          if (errEl) {
            errEl.textContent = built.error;
          }
          return;
        }
        const next = replaceIndividualJob(state, built.value);
        try {
          await saveAppState(next);
        } catch (err) {
          if (errEl) {
            errEl.textContent = err instanceof Error ? err.message : String(err);
          }
          return;
        }
        await renderIndividualJobs(ctx);
      })();
    }
  });
}

export function bindAddIndividualJobForm(ctx: DashboardContext): void {
  const {
    addJobForm,
    tabSelect,
    urlInput,
    intervalInput,
    jitterInput,
    liveAwareInput,
    blipPhrasesAdd,
    blipRegexAdd,
    addJobError,
  } = ctx.dom;

  if (!addJobForm || !tabSelect || !urlInput || !intervalInput || !jitterInput) {
    return;
  }

  addJobForm.addEventListener('submit', (e) => {
    e.preventDefault();
    void (async () => {
      if (addJobError) {
        addJobError.textContent = '';
      }
      const built = buildIndividualJobFromForm({
        targetUrl: urlInput.value,
        baseIntervalSec: Number(intervalInput.value),
        jitterSec: Number(jitterInput.value),
        liveAwareRefresh: liveAwareInput?.checked === true,
        blipWatchPhrasesText: blipPhrasesAdd?.value,
        blipWatchRegex: blipRegexAdd?.value,
      });
      if (!built.ok) {
        if (addJobError) {
          addJobError.textContent = built.error;
        }
        return;
      }
      const state = await loadAppState();
      const next = { ...state, individualJobs: [...state.individualJobs, built.value] };
      try {
        await saveAppState(next);
      } catch (err) {
        if (addJobError) {
          addJobError.textContent = err instanceof Error ? err.message : String(err);
        }
        return;
      }
      await renderIndividualJobs(ctx);
    })();
  });
}
