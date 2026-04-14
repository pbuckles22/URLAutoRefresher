/**
 * Full-page dashboard: prefs (Epic 3.0), add individual job (Epic 3.1), lifecycle (Epic 3.2).
 */
import { formatIndividualJobCountdown } from '../lib/dashboard-countdown';
import { createIndividualJobListRow } from '../lib/individual-job-list-row';
import { buildIndividualJobFromForm, buildIndividualJobUpdateFromForm } from '../lib/individual-job-form';
import { removeIndividualJobById, replaceIndividualJob, setIndividualJobEnabled } from '../lib/individual-jobs';
import { loadExtensionPrefs, saveExtensionPrefs } from '../lib/prefs';
import { loadAppState, saveAppState, STORAGE_KEY } from '../lib/storage';

const title = document.querySelector<HTMLElement>('[data-app-title]');
if (title) {
  title.textContent = chrome.runtime.getManifest().name;
}

const overlayPref = document.querySelector<HTMLInputElement>('[data-pref-overlay]');
if (overlayPref) {
  void loadExtensionPrefs().then((p) => {
    overlayPref.checked = p.showPageOverlayTimer;
  });
  overlayPref.addEventListener('change', () => {
    void saveExtensionPrefs({ showPageOverlayTimer: overlayPref.checked });
  });
}

const tabSelect = document.querySelector<HTMLSelectElement>('[data-job-tab]');
const urlInput = document.querySelector<HTMLInputElement>('[data-job-target-url]');
const intervalInput = document.querySelector<HTMLInputElement>('[data-job-interval]');
const jitterInput = document.querySelector<HTMLInputElement>('[data-job-jitter]');
const addJobForm = document.querySelector<HTMLFormElement>('[data-add-individual-form]');
const addJobError = document.querySelector<HTMLElement>('[data-add-job-error]');
const jobsList = document.querySelector<HTMLUListElement>('[data-individual-jobs-list]');

async function populateTabSelect(): Promise<void> {
  if (!tabSelect) {
    return;
  }
  const tabs = await chrome.tabs.query({});
  const withIds = tabs.filter(
    (t): t is chrome.tabs.Tab & { id: number } => typeof t.id === 'number' && typeof t.windowId === 'number'
  );
  withIds.sort((a, b) => a.windowId - b.windowId || (a.index ?? 0) - (b.index ?? 0));
  tabSelect.innerHTML = '<option value="">Select a tab…</option>';
  for (const t of withIds) {
    const opt = document.createElement('option');
    opt.value = String(t.id);
    const label = t.title?.trim() || t.url || `Tab ${t.id}`;
    opt.textContent = `${label} (${t.id})`;
    tabSelect.appendChild(opt);
  }
}

async function renderIndividualJobs(): Promise<void> {
  if (!jobsList) {
    return;
  }
  const state = await loadAppState();
  const now = Date.now();
  jobsList.innerHTML = '';
  for (const j of state.individualJobs) {
    jobsList.appendChild(createIndividualJobListRow(j, now));
  }
}

async function tickCountdowns(): Promise<void> {
  if (!jobsList) {
    return;
  }
  const state = await loadAppState();
  const now = Date.now();
  for (const job of state.individualJobs) {
    const row = jobsList.querySelector(`[data-individual-job-row="${CSS.escape(job.id)}"]`);
    const el = row?.querySelector('[data-job-countdown]');
    if (el) {
      el.textContent = formatIndividualJobCountdown(now, job);
    }
  }
}

function bindJobsListEvents(): void {
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
        await renderIndividualJobs();
      })();
      return;
    }

    if (t.closest('[data-job-toggle]')) {
      void (async () => {
        const state = await loadAppState();
        const job = state.individualJobs.find((j) => j.id === id);
        if (!job) {
          return;
        }
        const next = setIndividualJobEnabled(state, id, !job.enabled);
        try {
          await saveAppState(next);
        } catch (err) {
          console.error(err);
        }
        await renderIndividualJobs();
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
        const interval = Number(row.querySelector<HTMLInputElement>('[data-job-edit-interval]')?.value);
        const jitter = Number(row.querySelector<HTMLInputElement>('[data-job-edit-jitter]')?.value);
        const built = buildIndividualJobUpdateFromForm(
          { targetUrl: url, baseIntervalSec: interval, jitterSec: jitter },
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
        await renderIndividualJobs();
      })();
    }
  });
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !(STORAGE_KEY in changes)) {
    return;
  }
  void renderIndividualJobs();
});

bindJobsListEvents();
window.setInterval(() => void tickCountdowns(), 1000);

if (addJobForm && tabSelect && urlInput && intervalInput && jitterInput) {
  addJobForm.addEventListener('submit', (e) => {
    e.preventDefault();
    void (async () => {
      if (addJobError) {
        addJobError.textContent = '';
      }
      const tabId = Number(tabSelect.value);
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find((t) => t.id === tabId);
      if (!tab?.id) {
        if (addJobError) {
          addJobError.textContent = 'Pick a tab';
        }
        return;
      }
      const built = buildIndividualJobFromForm({
        tabId: tab.id,
        windowId: tab.windowId,
        targetUrl: urlInput.value,
        baseIntervalSec: Number(intervalInput.value),
        jitterSec: Number(jitterInput.value),
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
      await renderIndividualJobs();
    })();
  });
}

void populateTabSelect().then(() => renderIndividualJobs());
