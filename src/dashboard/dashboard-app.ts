/**
 * Shared dashboard + side panel UI (Epic 5): prefs, global groups, individual jobs,
 * countdown ticks, cross-surface links.
 */
import { formatGlobalGroupCountdown } from '../lib/dashboard-countdown';
import { buildGlobalGroupFromForm, buildGlobalGroupUpdateFromForm } from '../lib/global-group-form';
import {
  appendGlobalEditNewTargetRow,
  createGlobalGroupListRow,
} from '../lib/global-group-list-row';
import {
  removeGlobalGroupById,
  replaceGlobalGroup,
  setGlobalGroupEnabled,
} from '../lib/global-groups';
import { memberKeyFromTargetUrl } from '../lib/member-url';
import { isTwitchFavsGroupName, TWITCH_FAVS_PATTERN_HINT } from '../lib/twitch-favs';
import { validateHttpUrl } from '../lib/validation';
import { mergeDistinctPatternLines } from '../lib/url-glob';
import {
  defaultTargetUrlForTab,
  pinTabIdFirst,
  tabRowsFromWindowsSnapshot,
} from '../lib/window-tab-browser';
import { onlyNonLayoutAppStateDiff } from '../lib/app-state-list-layout';
import { validateGlobalGroupResolvedEnrollment } from '../lib/global-group-enrollment';
import { loadAppState, saveAppState, STORAGE_KEY } from '../lib/storage';
import {
  bindAddIndividualJobForm,
  bindJobsListEvents,
  renderIndividualJobs,
  tickIndividualJobCountdowns,
} from './dashboard-individual-jobs';
import {
  bindOverlayPreference,
  createDashboardContext,
  wireCrossSurfaceLinks,
} from './dashboard-shell';

export function initDashboardApp(): void {
  const dashboardContext = createDashboardContext();

  const title = document.querySelector<HTMLElement>('[data-app-title]');
  if (title) {
    title.textContent = chrome.runtime.getManifest().name;
  }

  bindOverlayPreference(dashboardContext);

  const { tabSelect, urlInput } = dashboardContext.dom;
  const jobTabSearch = document.querySelector<HTMLInputElement>('[data-job-tab-search]');
  const jobTabRefresh = document.querySelector<HTMLButtonElement>('[data-job-tab-refresh]');

  const globalGroupForm = document.querySelector<HTMLFormElement>('[data-global-group-form]');
  const globalGroupName = document.querySelector<HTMLInputElement>('[data-global-group-name]');
  const globalTabBrowser = document.querySelector<HTMLUListElement>('[data-global-tab-browser]');
  const globalRefreshTabs = document.querySelector<HTMLButtonElement>('[data-global-refresh-tabs]');
  const globalTabSearch = document.querySelector<HTMLInputElement>('[data-global-tab-search]');
  const globalIntervalInput = document.querySelector<HTMLInputElement>('[data-global-interval]');
  const globalJitterInput = document.querySelector<HTMLInputElement>('[data-global-jitter]');
  const globalUrlPatterns = document.querySelector<HTMLTextAreaElement>(
    '[data-global-url-patterns]'
  );
  const globalTwitchFavsHint = document.querySelector<HTMLElement>(
    '[data-global-twitch-favs-hint]'
  );
  const globalFormError = document.querySelector<HTMLElement>('[data-global-form-error]');
  const globalSectionHeading = document.querySelector<HTMLElement>('[data-global-section-heading]');
  const globalGroupsList = document.querySelector<HTMLUListElement>('[data-global-groups-list]');

  if (globalTwitchFavsHint) {
    globalTwitchFavsHint.textContent = TWITCH_FAVS_PATTERN_HINT;
  }
  if (globalGroupName && globalTwitchFavsHint) {
    const syncGlobalTwitchFavsHint = (): void => {
      globalTwitchFavsHint.style.display = isTwitchFavsGroupName(globalGroupName.value)
        ? 'block'
        : 'none';
    };
    globalGroupName.addEventListener('input', syncGlobalTwitchFavsHint);
    syncGlobalTwitchFavsHint();
  }

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

  function applyGlobalTabSearchFilter(): void {
    if (!globalTabBrowser) {
      return;
    }
    const q = (globalTabSearch?.value ?? '').trim().toLowerCase();
    for (const li of globalTabBrowser.querySelectorAll<HTMLLIElement>('[data-global-tab-row]')) {
      const title = li.querySelector('[data-global-tab-title]')?.textContent ?? '';
      const url = li.querySelector<HTMLInputElement>('[data-global-target-url]')?.value ?? '';
      const hay = `${title} ${url}`.toLowerCase();
      if (q === '' || hay.includes(q)) {
        li.style.display = 'grid';
      } else {
        li.style.display = 'none';
      }
    }
  }

  function isSchedulableWebUrl(url: string | undefined): boolean {
    const u = (url ?? '').trim();
    return u.startsWith('http://') || u.startsWith('https://');
  }

  /** Active tab in last-focused window when it is a normal page; else first http(s) tab in that window. */
  async function resolvePreferredPinTabId(): Promise<number | undefined> {
    try {
      const win = await chrome.windows.getLastFocused({ populate: true });
      const tabs = win.tabs ?? [];
      const active = tabs.find((t) => t.active);
      if (active?.id !== undefined && isSchedulableWebUrl(active.url)) {
        return active.id;
      }
      const sorted = [...tabs].sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
      for (const t of sorted) {
        if (t.id !== undefined && isSchedulableWebUrl(t.url)) {
          return t.id;
        }
      }
    } catch {
      /* ignore */
    }
    return undefined;
  }

  async function renderGlobalTabBrowser(): Promise<void> {
    if (!globalTabBrowser) {
      return;
    }
    const [windows, pinId] = await Promise.all([
      chrome.windows.getAll({ populate: true }),
      resolvePreferredPinTabId(),
    ]);
    const rows = tabRowsFromWindowsSnapshot(windows, pinId);
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
      titleEl.textContent = tlabel;
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
    applyGlobalTabSearchFilter();
  }

  type TabWithIds = chrome.tabs.Tab & { id: number; windowId: number };
  let cachedIndividualTabs: TabWithIds[] = [];

  function applyIndividualTabSelectFilter(): void {
    if (!tabSelect) {
      return;
    }
    const q = (jobTabSearch?.value ?? '').trim().toLowerCase();
    const prev = tabSelect.value;
    tabSelect.innerHTML = '<option value="">Select a tab…</option>';
    for (const t of cachedIndividualTabs) {
      const label = t.title?.trim() || t.url || `Tab ${t.id}`;
      const url = t.url ?? '';
      const hay = `${label} (${t.id}) ${url}`.toLowerCase();
      if (q !== '' && !hay.includes(q)) {
        continue;
      }
      const opt = document.createElement('option');
      opt.value = String(t.id);
      opt.textContent = `${label} (${t.id})`;
      tabSelect.appendChild(opt);
    }
    const stillValid = prev !== '' && [...tabSelect.options].some((o) => o.value === prev);
    tabSelect.value = stillValid ? prev : '';
  }

  async function refreshCachedTabs(): Promise<void> {
    const [tabs, pinId] = await Promise.all([chrome.tabs.query({}), resolvePreferredPinTabId()]);
    const withIds = tabs.filter(
      (t): t is TabWithIds => typeof t.id === 'number' && typeof t.windowId === 'number'
    );
    withIds.sort((a, b) => a.windowId - b.windowId || (a.index ?? 0) - (b.index ?? 0));
    cachedIndividualTabs = pinTabIdFirst(withIds, pinId);
  }

  async function populateTabSelect(): Promise<void> {
    await refreshCachedTabs();
    if (!tabSelect) {
      return;
    }
    applyIndividualTabSelectFilter();
  }

  /** Options for a new global-group member row: exclude tabs already chosen on other rows. */
  function populateGlobalEditNewTabSelect(
    selectEl: HTMLSelectElement,
    groupRow: HTMLElement
  ): void {
    const selfRow = selectEl.closest('[data-global-edit-target-row]');
    const taken = new Set<number>();
    for (const tr of groupRow.querySelectorAll('[data-global-edit-target-row]')) {
      if (tr === selfRow) {
        continue;
      }
      if (tr.hasAttribute('data-global-edit-new-target')) {
        const v = tr.querySelector<HTMLSelectElement>('[data-global-edit-pick-tab]')?.value;
        if (v) {
          taken.add(Number(v));
        }
      }
    }
    const current = selectEl.value;
    selectEl.innerHTML = '<option value="">Select a tab…</option>';
    for (const t of cachedIndividualTabs) {
      if (t.id !== Number(current) && taken.has(t.id)) {
        continue;
      }
      const opt = document.createElement('option');
      opt.value = String(t.id);
      opt.setAttribute('data-window-id', String(t.windowId));
      const label = t.title?.trim() || t.url || `Tab ${t.id}`;
      opt.textContent = `${label} (${t.id})`;
      selectEl.appendChild(opt);
    }
    const still = current !== '' && [...selectEl.options].some((o) => o.value === current);
    selectEl.value = still ? current : '';
  }

  /**
   * When the user picks a tab, default Target URL to that tab’s current http(s) URL (from cache).
   * Uses synchronous cache so we don’t race with user edits; use “Refresh tab list” if tabs moved.
   */
  function syncIndividualTargetUrlFromSelectedTab(): void {
    if (!tabSelect || !urlInput) {
      return;
    }
    const raw = tabSelect.value;
    if (raw === '') {
      return;
    }
    const tabId = Number(raw);
    if (!Number.isInteger(tabId) || tabId < 1) {
      return;
    }
    const tab = cachedIndividualTabs.find((t) => t.id === tabId);
    if (tab) {
      urlInput.value = defaultTargetUrlForTab(tab.url ?? '');
      return;
    }
    void chrome.tabs.get(tabId).then((t) => {
      if (tabSelect?.value !== String(tabId) || !urlInput) {
        return;
      }
      urlInput.value = defaultTargetUrlForTab(t.url ?? '');
    });
  }

  async function tickCountdowns(): Promise<void> {
    const state = await loadAppState();
    const now = Date.now();
    tickIndividualJobCountdowns(dashboardContext.dom.jobsList, state.individualJobs, now);
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
          await renderIndividualJobs(dashboardContext);
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
          await renderIndividualJobs(dashboardContext);
        })();
        return;
      }

      if (t.closest('[data-global-edit-add-target]')) {
        e.preventDefault();
        void (async () => {
          await refreshCachedTabs();
          const container = row.querySelector('[data-global-edit-targets]');
          if (!container || !(container instanceof HTMLElement)) {
            return;
          }
          const select = appendGlobalEditNewTargetRow(container);
          populateGlobalEditNewTabSelect(select, row as HTMLElement);
        })();
        return;
      }

      if (t.closest('[data-global-edit-remove-target]')) {
        e.preventDefault();
        const tr = t.closest('[data-global-edit-target-row]');
        tr?.remove();
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
          const interval = Number(
            row.querySelector<HTMLInputElement>('[data-global-edit-interval]')?.value
          );
          const jitter = Number(
            row.querySelector<HTMLInputElement>('[data-global-edit-jitter]')?.value
          );

          const targets: Array<{ targetUrl: string; label?: string }> = [];
          const extraPatternUrls: string[] = [];

          for (const tr of row.querySelectorAll('[data-global-edit-target-row]')) {
            if (tr.hasAttribute('data-global-edit-new-target')) {
              const sel = tr.querySelector<HTMLSelectElement>('[data-global-edit-pick-tab]');
              const urlIn = tr.querySelector<HTMLInputElement>('[data-global-edit-target-url]');
              const raw = sel?.value?.trim() ?? '';
              const urlRaw = (urlIn?.value ?? '').trim();

              if (raw === '' && urlRaw === '') {
                continue;
              }

              if (raw === '') {
                const urlCheck = validateHttpUrl(urlRaw);
                if (!urlCheck.ok) {
                  if (errEl) {
                    errEl.textContent = urlCheck.error;
                  }
                  return;
                }
                extraPatternUrls.push(urlCheck.value);
                continue;
              }

              const tabId = Number(raw);
              if (!Number.isInteger(tabId) || tabId < 1) {
                if (errEl) {
                  errEl.textContent = 'Invalid tab selection';
                }
                return;
              }
              const tabMeta = cachedIndividualTabs.find((x) => x.id === tabId);
              const label = tabMeta?.title?.trim();
              targets.push({
                targetUrl: urlIn?.value ?? '',
                ...(label ? { label } : {}),
              });
            } else {
              const mkAttr = tr.getAttribute('data-global-edit-member-key') ?? '';
              const urlIn = tr.querySelector<HTMLInputElement>('[data-global-edit-target-url]');
              const prev =
                mkAttr !== ''
                  ? existing.targets.find((x) => memberKeyFromTargetUrl(x.targetUrl) === mkAttr)
                  : undefined;
              targets.push({
                targetUrl: urlIn?.value ?? '',
                ...(prev?.label ? { label: prev.label } : {}),
              });
            }
          }

          const patternsField =
            row.querySelector<HTMLTextAreaElement>('[data-global-edit-url-patterns]')?.value ?? '';
          const patternsRaw = mergeDistinctPatternLines(patternsField, extraPatternUrls);
          const built = buildGlobalGroupUpdateFromForm(
            {
              name,
              baseIntervalSec: interval,
              jitterSec: jitter,
              targets,
              urlPatternsRaw: patternsRaw,
            },
            existing
          );
          if (!built.ok) {
            if (errEl) {
              errEl.textContent = built.error;
            }
            return;
          }
          const enroll = await validateGlobalGroupResolvedEnrollment(
            state,
            built.value,
            existing.id
          );
          if (!enroll.ok) {
            if (errEl) {
              errEl.textContent = enroll.error;
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
          await renderIndividualJobs(dashboardContext);
        })();
      }
    });

    if (globalGroupsList.dataset.globalEditTabPickBound !== '1') {
      globalGroupsList.dataset.globalEditTabPickBound = '1';
      globalGroupsList.addEventListener('change', (e) => {
        const sel = e.target;
        if (!(sel instanceof HTMLSelectElement) || !sel.matches('[data-global-edit-pick-tab]')) {
          return;
        }
        const tr = sel.closest('[data-global-edit-target-row]');
        const groupRow = sel.closest('[data-global-group-row]');
        if (!tr || !groupRow) {
          return;
        }
        const urlIn = tr.querySelector<HTMLInputElement>('[data-global-edit-target-url]');
        if (!urlIn) {
          return;
        }
        const tabId = Number(sel.value);
        if (!Number.isInteger(tabId) || tabId < 1) {
          urlIn.value = '';
          return;
        }
        const tab = cachedIndividualTabs.find((x) => x.id === tabId);
        if (tab) {
          urlIn.value = defaultTargetUrlForTab(tab.url ?? '');
        } else {
          void chrome.tabs.get(tabId).then((ct) => {
            if (sel.value !== String(tabId) || !urlIn) {
              return;
            }
            urlIn.value = defaultTargetUrlForTab(ct.url ?? '');
          });
        }
        for (const other of groupRow.querySelectorAll<HTMLSelectElement>(
          '[data-global-edit-pick-tab]'
        )) {
          if (other !== sel) {
            populateGlobalEditNewTabSelect(other, groupRow as HTMLElement);
          }
        }
      });
    }
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !(STORAGE_KEY in changes)) {
      return;
    }
    const ch = changes[STORAGE_KEY]!;
    if (onlyNonLayoutAppStateDiff(ch.oldValue, ch.newValue)) {
      void tickCountdowns();
      return;
    }
    void renderIndividualJobs(dashboardContext);
    void renderGlobalGroupsList();
  });

  bindJobsListEvents(dashboardContext);
  bindAddIndividualJobForm(dashboardContext);
  bindGlobalGroupsListEvents();
  wireCrossSurfaceLinks(dashboardContext);
  window.setInterval(() => void tickCountdowns(), 1000);

  if (globalRefreshTabs) {
    globalRefreshTabs.addEventListener('click', () => void renderGlobalTabBrowser());
  }

  if (globalTabSearch && globalTabSearch.dataset.filterBound !== '1') {
    globalTabSearch.dataset.filterBound = '1';
    globalTabSearch.addEventListener('input', () => applyGlobalTabSearchFilter());
  }

  if (jobTabSearch && jobTabSearch.dataset.filterBound !== '1') {
    jobTabSearch.dataset.filterBound = '1';
    jobTabSearch.addEventListener('input', () => applyIndividualTabSelectFilter());
  }

  if (jobTabRefresh) {
    jobTabRefresh.addEventListener('click', () => void populateTabSelect());
  }

  if (tabSelect && tabSelect.dataset.targetSyncBound !== '1') {
    tabSelect.dataset.targetSyncBound = '1';
    tabSelect.addEventListener('change', () => syncIndividualTargetUrlFromSelectedTab());
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
        const targets: Array<{ targetUrl: string; label?: string }> = [];
        for (const li of globalTabBrowser.querySelectorAll('[data-global-tab-row]')) {
          const checked = li.querySelector<HTMLInputElement>('[data-global-tab-include]')?.checked;
          if (!checked) {
            continue;
          }
          const targetUrl =
            li.querySelector<HTMLInputElement>('[data-global-target-url]')?.value ?? '';
          const label = li.querySelector('[data-global-tab-title]')?.textContent?.trim();
          targets.push({
            targetUrl,
            ...(label ? { label } : {}),
          });
        }
        const built = buildGlobalGroupFromForm({
          name: globalGroupName.value,
          baseIntervalSec: Number(globalIntervalInput.value),
          jitterSec: Number(globalJitterInput.value),
          targets,
          urlPatternsRaw: globalUrlPatterns?.value,
        });
        if (!built.ok) {
          if (globalFormError) {
            globalFormError.textContent = built.error;
          }
          return;
        }
        const state = await loadAppState();
        const enroll = await validateGlobalGroupResolvedEnrollment(state, built.value);
        if (!enroll.ok) {
          if (globalFormError) {
            globalFormError.textContent = enroll.error;
          }
          return;
        }
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
        if (globalUrlPatterns) {
          globalUrlPatterns.value = '';
        }
        await renderGlobalGroupsList();
        await renderIndividualJobs(dashboardContext);
      })();
    });
  }

  void Promise.all([populateTabSelect(), renderGlobalTabBrowser(), renderGlobalGroupsList()]).then(
    () => renderIndividualJobs(dashboardContext)
  );
}
