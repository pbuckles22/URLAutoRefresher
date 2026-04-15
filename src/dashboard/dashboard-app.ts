/**
 * Shared dashboard + side panel UI (Epic 5): prefs, global groups, individual jobs,
 * countdown ticks, cross-surface links.
 */
import { formatGlobalGroupCountdown, formatIndividualJobCountdown } from '../lib/dashboard-countdown';
import { buildGlobalGroupFromForm, buildGlobalGroupUpdateFromForm } from '../lib/global-group-form';
import { createGlobalGroupListRow } from '../lib/global-group-list-row';
import { createIndividualJobListRow } from '../lib/individual-job-list-row';
import { buildIndividualJobFromForm, buildIndividualJobUpdateFromForm } from '../lib/individual-job-form';
import { removeIndividualJobById, replaceIndividualJob, setIndividualJobEnabled } from '../lib/individual-jobs';
import {
  removeGlobalGroupById,
  replaceGlobalGroup,
  setGlobalGroupEnabled,
} from '../lib/global-groups';
import { defaultTargetUrlForTab, tabRowsFromWindowsSnapshot } from '../lib/window-tab-browser';
import { loadExtensionPrefs, saveExtensionPrefs } from '../lib/prefs';
import { loadAppState, saveAppState, STORAGE_KEY } from '../lib/storage';

function wireCrossSurfaceLinks(): void {
  const openSide = document.querySelector<HTMLElement>('[data-open-side-panel]');
  if (openSide) {
    openSide.addEventListener('click', () => {
      void chrome.windows.getCurrent().then((w) => {
        if (w.id !== undefined) {
          void chrome.sidePanel.open({ windowId: w.id });
        }
      });
    });
  }
  const openDash = document.querySelector<HTMLElement>('[data-open-dashboard-tab]');
  if (openDash) {
    openDash.addEventListener('click', () => {
      void chrome.tabs.create({ url: chrome.runtime.getURL('dashboard/dashboard.html') });
    });
  }
}

export function initDashboardApp(): void {
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

  const globalGroupForm = document.querySelector<HTMLFormElement>('[data-global-group-form]');
  const globalGroupName = document.querySelector<HTMLInputElement>('[data-global-group-name]');
  const globalTabBrowser = document.querySelector<HTMLUListElement>('[data-global-tab-browser]');
  const globalRefreshTabs = document.querySelector<HTMLButtonElement>('[data-global-refresh-tabs]');
  const globalIntervalInput = document.querySelector<HTMLInputElement>('[data-global-interval]');
  const globalJitterInput = document.querySelector<HTMLInputElement>('[data-global-jitter]');
  const globalFormError = document.querySelector<HTMLElement>('[data-global-form-error]');
  const globalSectionHeading = document.querySelector<HTMLElement>('[data-global-section-heading]');
  const individualSectionHeading = document.querySelector<HTMLElement>('[data-individual-section-heading]');
  const globalGroupsList = document.querySelector<HTMLUListElement>('[data-global-groups-list]');

  async function renderGlobalGroupsList(): Promise<void> {
    const state = await loadAppState();
    if (globalSectionHeading) {
      globalSectionHeading.textContent = `Global (${state.globalGroups.length})`;
    }
    if (!globalGroupsList) {
      return;
    }
    const now = Date.now();
    globalGroupsList.innerHTML = '';
    for (const g of state.globalGroups) {
      globalGroupsList.appendChild(createGlobalGroupListRow(g, now));
    }
  }

  async function renderGlobalTabBrowser(): Promise<void> {
    if (!globalTabBrowser) {
      return;
    }
    const windows = await chrome.windows.getAll({ populate: true });
    const rows = tabRowsFromWindowsSnapshot(windows);
    globalTabBrowser.innerHTML = '';
    for (const row of rows) {
      const li = document.createElement('li');
      li.setAttribute('data-global-tab-row', String(row.tabId));
      li.setAttribute('data-window-id', String(row.windowId));
      li.style.display = 'grid';
      li.style.gridTemplateColumns = 'auto minmax(6rem, 1fr) minmax(10rem, 2fr)';
      li.style.gap = '0.5rem';
      li.style.alignItems = 'center';
      li.style.marginBottom = '0.35rem';

      const pick = document.createElement('label');
      pick.style.display = 'flex';
      pick.style.alignItems = 'center';
      pick.style.gap = '0.35rem';
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.setAttribute('data-global-tab-include', '');
      pick.appendChild(cb);
      pick.appendChild(document.createTextNode('Include'));

      const titleEl = document.createElement('span');
      titleEl.setAttribute('data-global-tab-title', '');
      const tlabel = row.title.trim() || row.url || `Tab ${row.tabId}`;
      titleEl.textContent = `${tlabel} (${row.tabId})`;
      titleEl.style.overflow = 'hidden';
      titleEl.style.textOverflow = 'ellipsis';
      titleEl.style.whiteSpace = 'nowrap';
      titleEl.style.fontSize = '0.9rem';

      const urlIn = document.createElement('input');
      urlIn.type = 'text';
      urlIn.setAttribute('data-global-target-url', '');
      urlIn.placeholder = 'https://…';
      urlIn.value = defaultTargetUrlForTab(row.url);
      urlIn.autocomplete = 'off';
      urlIn.style.padding = '0.35rem 0.5rem';
      urlIn.style.borderRadius = '6px';
      urlIn.style.border = '1px solid #5f6368';
      urlIn.style.background = '#303134';
      urlIn.style.color = '#e8eaed';

      li.append(pick, titleEl, urlIn);
      globalTabBrowser.appendChild(li);
    }
  }

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

  async function tickCountdowns(): Promise<void> {
    const state = await loadAppState();
    const now = Date.now();
    if (jobsList) {
      for (const job of state.individualJobs) {
        const row = jobsList.querySelector(`[data-individual-job-row="${CSS.escape(job.id)}"]`);
        const el = row?.querySelector('[data-job-countdown]');
        if (el) {
          el.textContent = formatIndividualJobCountdown(now, job);
        }
      }
    }
    if (globalGroupsList) {
      for (const g of state.globalGroups) {
        const row = globalGroupsList.querySelector(`[data-global-group-row="${CSS.escape(g.id)}"]`);
        const el = row?.querySelector('[data-global-group-countdown]');
        if (el) {
          el.textContent = formatGlobalGroupCountdown(now, g);
        }
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

  function bindGlobalGroupsListEvents(): void {
    if (!globalGroupsList || globalGroupsList.dataset.epic42Bound === '1') {
      return;
    }
    globalGroupsList.dataset.epic42Bound = '1';

    globalGroupsList.addEventListener('click', (e) => {
      const t = e.target as HTMLElement;
      const row = t.closest('[data-global-group-row]');
      if (!row) {
        return;
      }
      const id = row.getAttribute('data-global-group-row');
      if (!id) {
        return;
      }

      if (t.closest('[data-global-group-delete]')) {
        void (async () => {
          const state = await loadAppState();
          const next = removeGlobalGroupById(state, id);
          try {
            await saveAppState(next);
          } catch (err) {
            console.error(err);
          }
          await renderGlobalGroupsList();
          await renderIndividualJobs();
        })();
        return;
      }

      if (t.closest('[data-global-group-toggle]')) {
        void (async () => {
          const rowErr = row.querySelector('[data-global-group-row-error]');
          if (rowErr) {
            rowErr.textContent = '';
          }
          const state = await loadAppState();
          const g = state.globalGroups.find((x) => x.id === id);
          if (!g) {
            return;
          }
          const next = setGlobalGroupEnabled(state, id, !g.enabled);
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
          await renderGlobalGroupsList();
          await renderIndividualJobs();
        })();
        return;
      }

      if (t.closest('[data-global-edit-save]')) {
        void (async () => {
          const errEl = row.querySelector('[data-global-edit-error]');
          if (errEl) {
            errEl.textContent = '';
          }
          const state = await loadAppState();
          const existing = state.globalGroups.find((x) => x.id === id);
          if (!existing) {
            return;
          }

          const name = row.querySelector<HTMLInputElement>('[data-global-edit-name]')?.value ?? '';
          const interval = Number(row.querySelector<HTMLInputElement>('[data-global-edit-interval]')?.value);
          const jitter = Number(row.querySelector<HTMLInputElement>('[data-global-edit-jitter]')?.value);

          const targets: Array<{
            tabId: number;
            windowId: number;
            targetUrl: string;
          }> = [];
          for (const ex of existing.targets) {
            const urlIn = row.querySelector<HTMLInputElement>(
              `[data-global-edit-target-url][data-global-edit-target-tab="${ex.tabId}"]`
            );
            targets.push({
              tabId: ex.tabId,
              windowId: ex.windowId,
              targetUrl: urlIn?.value ?? '',
            });
          }

          const built = buildGlobalGroupUpdateFromForm(
            { name, baseIntervalSec: interval, jitterSec: jitter, targets },
            existing
          );
          if (!built.ok) {
            if (errEl) {
              errEl.textContent = built.error;
            }
            return;
          }
          const next = replaceGlobalGroup(state, built.value);
          try {
            await saveAppState(next);
          } catch (err) {
            if (errEl) {
              errEl.textContent = err instanceof Error ? err.message : String(err);
            }
            return;
          }
          await renderGlobalGroupsList();
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
    void renderGlobalGroupsList();
  });

  bindJobsListEvents();
  bindGlobalGroupsListEvents();
  wireCrossSurfaceLinks();
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

  if (globalRefreshTabs) {
    globalRefreshTabs.addEventListener('click', () => void renderGlobalTabBrowser());
  }

  if (
    globalGroupForm &&
    globalGroupName &&
    globalTabBrowser &&
    globalIntervalInput &&
    globalJitterInput
  ) {
    globalGroupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      void (async () => {
        if (globalFormError) {
          globalFormError.textContent = '';
        }
        const targets: Array<{
          tabId: number;
          windowId: number;
          targetUrl: string;
          label?: string;
        }> = [];
        for (const li of globalTabBrowser.querySelectorAll('[data-global-tab-row]')) {
          const tabId = Number(li.getAttribute('data-global-tab-row'));
          const windowId = Number(li.getAttribute('data-window-id'));
          const checked = li.querySelector<HTMLInputElement>('[data-global-tab-include]')?.checked;
          if (!checked) {
            continue;
          }
          const targetUrl = li.querySelector<HTMLInputElement>('[data-global-target-url]')?.value ?? '';
          const titleText = li.querySelector('[data-global-tab-title]')?.textContent ?? '';
          const m = /^(.*) \((\d+)\)\s*$/.exec(titleText);
          const label = m?.[1]?.trim();
          targets.push({
            tabId,
            windowId,
            targetUrl,
            ...(label ? { label } : {}),
          });
        }
        const built = buildGlobalGroupFromForm({
          name: globalGroupName.value,
          baseIntervalSec: Number(globalIntervalInput.value),
          jitterSec: Number(globalJitterInput.value),
          targets,
        });
        if (!built.ok) {
          if (globalFormError) {
            globalFormError.textContent = built.error;
          }
          return;
        }
        const state = await loadAppState();
        const next = { ...state, globalGroups: [...state.globalGroups, built.value] };
        try {
          await saveAppState(next);
        } catch (err) {
          if (globalFormError) {
            globalFormError.textContent = err instanceof Error ? err.message : String(err);
          }
          return;
        }
        globalGroupName.value = '';
        await renderGlobalGroupsList();
        await renderIndividualJobs();
      })();
    });
  }

  void Promise.all([populateTabSelect(), renderGlobalTabBrowser(), renderGlobalGroupsList()]).then(() =>
    renderIndividualJobs()
  );
}
