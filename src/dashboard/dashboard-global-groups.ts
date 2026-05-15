/**
 * Epic 13.B4 — global groups: list render + events, add-group form, tab browser + search filter,
 * TwitchFavs hint on name input, countdown ticks for global rows.
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
import { defaultTargetUrlForTab, tabRowsFromWindowsSnapshot } from '../lib/window-tab-browser';
import { resolvePreferredPinTabId } from '../lib/preferred-pin-tab';
import { validateGlobalGroupResolvedEnrollment } from '../lib/global-group-enrollment';
import { loadAppState, saveAppState } from '../lib/storage';
import type { GlobalGroup } from '../lib/types';
import {
  refreshIndividualTabPickerCache,
  type IndividualTabPickerCache,
} from './dashboard-individual-tab-picker';
import type { DashboardContext } from './dashboard-shell';

export type RefreshIndividualJobs = (ctx: DashboardContext) => Promise<void>;

function globalGroupRowSelectorFragment(groupId: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(groupId);
  }
  return groupId.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

export function tickGlobalGroupCountdowns(
  globalGroupsList: HTMLUListElement | null,
  globalGroups: GlobalGroup[],
  now: number
): void {
  if (!globalGroupsList) {
    return;
  }
  for (const g of globalGroups) {
    const row = globalGroupsList.querySelector(
      `[data-global-group-row="${globalGroupRowSelectorFragment(g.id)}"]`
    );
    const el = row?.querySelector('[data-global-group-countdown]');
    if (el) {
      el.textContent = formatGlobalGroupCountdown(now, g);
    }
  }
}

export async function renderGlobalGroupsList(ctx: DashboardContext): Promise<void> {
  const { globalSectionHeading, globalGroupsList } = ctx.dom;
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

function applyGlobalTabSearchFilter(ctx: DashboardContext): void {
  const { globalTabBrowser, globalTabSearch } = ctx.dom;
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

export async function renderGlobalTabBrowser(ctx: DashboardContext): Promise<void> {
  const { globalTabBrowser } = ctx.dom;
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
  applyGlobalTabSearchFilter(ctx);
}

function populateGlobalEditNewTabSelect(
  selectEl: HTMLSelectElement,
  groupRow: HTMLElement,
  cache: IndividualTabPickerCache
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
  for (const t of cache.tabs) {
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

export function bindGlobalTwitchFavsHint(ctx: DashboardContext): void {
  const { globalGroupName, globalTwitchFavsHint } = ctx.dom;
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
}

export function bindGlobalGroupsListEvents(
  ctx: DashboardContext,
  individualTabCache: IndividualTabPickerCache,
  refreshIndividualJobs: RefreshIndividualJobs
): void {
  const { globalGroupsList } = ctx.dom;
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
        await renderGlobalGroupsList(ctx);
        await refreshIndividualJobs(ctx);
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
        await renderGlobalGroupsList(ctx);
        await refreshIndividualJobs(ctx);
      })();
      return;
    }

    if (t.closest('[data-global-edit-add-target]')) {
      e.preventDefault();
      void (async () => {
        await refreshIndividualTabPickerCache(individualTabCache);
        const container = row.querySelector('[data-global-edit-targets]');
        if (!container || !(container instanceof HTMLElement)) {
          return;
        }
        const select = appendGlobalEditNewTargetRow(container);
        populateGlobalEditNewTabSelect(select, row as HTMLElement, individualTabCache);
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
            const tabMeta = individualTabCache.tabs.find((x) => x.id === tabId);
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
        const enroll = await validateGlobalGroupResolvedEnrollment(state, built.value, existing.id);
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
        await renderGlobalGroupsList(ctx);
        await refreshIndividualJobs(ctx);
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
      const tab = individualTabCache.tabs.find((x) => x.id === tabId);
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
          populateGlobalEditNewTabSelect(other, groupRow as HTMLElement, individualTabCache);
        }
      }
    });
  }
}

export function bindGlobalTabBrowserUi(ctx: DashboardContext): void {
  const { globalRefreshTabs, globalTabSearch } = ctx.dom;
  if (globalRefreshTabs) {
    globalRefreshTabs.addEventListener('click', () => void renderGlobalTabBrowser(ctx));
  }

  if (globalTabSearch && globalTabSearch.dataset.filterBound !== '1') {
    globalTabSearch.dataset.filterBound = '1';
    globalTabSearch.addEventListener('input', () => applyGlobalTabSearchFilter(ctx));
  }
}

export function bindGlobalGroupForm(
  ctx: DashboardContext,
  refreshIndividualJobs: RefreshIndividualJobs
): void {
  const {
    globalGroupForm,
    globalGroupName,
    globalTabBrowser,
    globalIntervalInput,
    globalJitterInput,
    globalUrlPatterns,
    globalFormError,
  } = ctx.dom;

  if (
    !globalGroupForm ||
    !globalGroupName ||
    !globalTabBrowser ||
    !globalIntervalInput ||
    !globalJitterInput
  ) {
    return;
  }

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
      await renderGlobalGroupsList(ctx);
      await refreshIndividualJobs(ctx);
    })();
  });
}
