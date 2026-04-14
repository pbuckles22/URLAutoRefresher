/**
 * Full-page dashboard: prefs (Epic 3.0) + add individual job (Epic 3.1).
 */
import { buildIndividualJobFromForm } from '../lib/individual-job-form';
import { loadExtensionPrefs, saveExtensionPrefs } from '../lib/prefs';
import { loadAppState, saveAppState } from '../lib/storage';

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
  jobsList.innerHTML = '';
  for (const j of state.individualJobs) {
    const li = document.createElement('li');
    li.textContent = `Tab ${j.target.tabId} → ${j.target.targetUrl} · every ${j.baseIntervalSec}s ±${j.jitterSec}s`;
    jobsList.appendChild(li);
  }
}

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
