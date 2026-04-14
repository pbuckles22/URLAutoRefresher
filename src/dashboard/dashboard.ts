/**
 * Full-page dashboard: prefs (Epic 3.0), add individual job (Epic 3.1), lifecycle (Epic 3.2).
 */
import { formatIndividualJobCountdown } from '../lib/dashboard-countdown';
import { buildIndividualJobFromForm, buildIndividualJobUpdateFromForm } from '../lib/individual-job-form';
import { removeIndividualJobById, replaceIndividualJob, setIndividualJobEnabled } from '../lib/individual-jobs';
import { loadExtensionPrefs, saveExtensionPrefs } from '../lib/prefs';
import { loadAppState, saveAppState, STORAGE_KEY } from '../lib/storage';
import type { IndividualJob } from '../lib/types';

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

function rowStyle(): string {
  return 'list-style: none; margin: 0.75rem 0; padding: 0.75rem; border: 1px solid #5f6368; border-radius: 8px; background: #303134;';
}

function btnStyle(): string {
  return 'padding: 0.3rem 0.65rem; border-radius: 6px; border: 1px solid #5f6368; background: #3c4043; color: #e8eaed; cursor: pointer; font-size: 0.85rem';
}

function dangerBtnStyle(): string {
  return `${btnStyle()} border-color: #c5221f; color: #f28b82`;
}

function primaryBtnStyle(): string {
  return 'padding: 0.35rem 0.75rem; border-radius: 6px; border: none; background: #8ab4f8; color: #202124; font-weight: 600; cursor: pointer; font-size: 0.85rem';
}

function renderJobRow(j: IndividualJob): HTMLLIElement {
  const li = document.createElement('li');
  li.setAttribute('data-individual-job-row', j.id);
  li.style.cssText = rowStyle();

  const top = document.createElement('div');
  top.style.cssText = 'display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem;';

  const summaryLine = document.createElement('span');
  summaryLine.textContent = `Tab ${j.target.tabId} → ${j.target.targetUrl} · every ${j.baseIntervalSec}s ±${j.jitterSec}s`;
  summaryLine.style.flex = '1 1 12rem';

  const countdown = document.createElement('span');
  countdown.setAttribute('data-job-countdown', '');
  countdown.textContent = formatIndividualJobCountdown(Date.now(), j);
  countdown.style.cssText = 'font-variant-numeric: tabular-nums; min-width: 3.5rem; color: #9aa0a6';

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.setAttribute('data-job-toggle', '');
  toggle.textContent = j.enabled ? 'Stop' : 'Start';
  toggle.style.cssText = btnStyle();

  const del = document.createElement('button');
  del.type = 'button';
  del.setAttribute('data-job-delete', '');
  del.textContent = 'Delete';
  del.style.cssText = dangerBtnStyle();

  top.append(summaryLine, countdown, toggle, del);
  li.appendChild(top);

  const details = document.createElement('details');
  details.style.marginTop = '0.5rem';

  const sum = document.createElement('summary');
  sum.textContent = 'Edit';
  sum.style.cursor = 'pointer';
  sum.style.color = '#8ab4f8';
  details.appendChild(sum);

  const editWrap = document.createElement('div');
  editWrap.style.cssText = 'display: flex; flex-direction: column; gap: 0.35rem; margin-top: 0.35rem; max-width: 28rem';

  const urlLab = document.createElement('label');
  urlLab.style.cssText = 'display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem';
  urlLab.innerHTML = '<span>Target URL</span>';
  const urlEdit = document.createElement('input');
  urlEdit.type = 'text';
  urlEdit.setAttribute('data-job-edit-url', '');
  urlEdit.value = j.target.targetUrl;
  urlEdit.autocomplete = 'off';
  urlEdit.style.cssText =
    'padding: 0.35rem 0.5rem; border-radius: 6px; border: 1px solid #5f6368; background: #202124; color: #e8eaed';
  urlLab.appendChild(urlEdit);

  const intLab = document.createElement('label');
  intLab.style.cssText = 'display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem';
  intLab.innerHTML = '<span>Interval (seconds)</span>';
  const intEdit = document.createElement('input');
  intEdit.type = 'number';
  intEdit.min = '1';
  intEdit.step = '1';
  intEdit.setAttribute('data-job-edit-interval', '');
  intEdit.value = String(j.baseIntervalSec);
  intEdit.style.cssText = urlEdit.style.cssText;
  intLab.appendChild(intEdit);

  const jitLab = document.createElement('label');
  jitLab.style.cssText = 'display: flex; flex-direction: column; gap: 0.2rem; font-size: 0.85rem';
  jitLab.innerHTML = '<span>Jitter (seconds)</span>';
  const jitEdit = document.createElement('input');
  jitEdit.type = 'number';
  jitEdit.min = '0';
  jitEdit.step = '1';
  jitEdit.setAttribute('data-job-edit-jitter', '');
  jitEdit.value = String(j.jitterSec);
  jitEdit.style.cssText = urlEdit.style.cssText;
  jitLab.appendChild(jitEdit);

  const editErr = document.createElement('p');
  editErr.setAttribute('data-job-edit-error', '');
  editErr.style.cssText = 'color: #f28b82; margin: 0; min-height: 1rem; font-size: 0.8rem';

  const saveBtn = document.createElement('button');
  saveBtn.type = 'button';
  saveBtn.setAttribute('data-job-edit-save', '');
  saveBtn.textContent = 'Save changes';
  saveBtn.style.cssText = `${primaryBtnStyle()} align-self: flex-start`;

  editWrap.append(urlLab, intLab, jitLab, editErr, saveBtn);
  details.appendChild(editWrap);
  li.appendChild(details);

  return li;
}

async function renderIndividualJobs(): Promise<void> {
  if (!jobsList) {
    return;
  }
  const state = await loadAppState();
  jobsList.innerHTML = '';
  for (const j of state.individualJobs) {
    jobsList.appendChild(renderJobRow(j));
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
