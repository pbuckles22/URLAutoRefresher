/**
 * Epic 11.5 — dashboard / side panel precision volume controls (tab-routed).
 */
import { clampSignedLinearGain } from '../lib/precision-volume-gain';
import {
  applyShiftFineFaderPosition,
  faderValueToLinearGain,
  faderValueToPosition,
  formatPercentInput,
  linearGainFromFaderPosition,
  linearGainToFaderValue,
  linearGainToPercent,
  parsePercentInput,
  percentToLinearGain,
} from '../lib/precision-volume-fader';
import { loadExtensionPrefs, saveExtensionPrefs } from '../lib/prefs';
import { sendPrecisionVolumeTabRequest } from '../lib/precision-volume-tab-client';
import { resolvePrecisionVolumeTargetTabId } from '../lib/precision-volume-target-tab';
import {
  applyIndividualTabSelectFilter,
  refreshIndividualTabPickerCache,
  type IndividualTabPickerCache,
} from './dashboard-individual-tab-picker';
import type { DashboardContext } from './dashboard-shell';

type PrecisionVolumeController = {
  readExplicitTabId: () => number | null;
  syncControlsFromLinearGain: (linearGain: number) => void;
  applyToTargetTab: (linearGain: number) => void;
  refreshApplyHint: () => void;
};

let precisionVolumeController: PrecisionVolumeController | null = null;

const ACTIVE_TAB_OPTION = '<option value="">Active tab (focused window)</option>';

function readExplicitTabIdFromSelect(select: HTMLSelectElement): number | null {
  const raw = select.value;
  if (raw === '') {
    return null;
  }
  const id = Number(raw);
  return Number.isInteger(id) && id >= 0 ? id : null;
}

async function updatePrecisionVolumeApplyHint(ctx: DashboardContext): Promise<void> {
  const hint = ctx.dom.precisionVolumeApplyHint;
  if (!hint || !precisionVolumeController) {
    return;
  }
  const explicit = precisionVolumeController.readExplicitTabId();
  const target = await resolvePrecisionVolumeTargetTabId(explicit);
  hint.style.display = target === undefined ? 'block' : 'none';
}

/** After tab list is populated, restore saved tab + push gain to target tab. */
export async function restorePrecisionVolumeAfterTabListReady(
  ctx: DashboardContext
): Promise<void> {
  const ctrl = precisionVolumeController;
  const { precisionVolumeTabSelect } = ctx.dom;
  if (!ctrl || !precisionVolumeTabSelect) {
    return;
  }
  const p = await loadExtensionPrefs();
  const pv = p.precisionVolume;
  ctrl.syncControlsFromLinearGain(pv.lastLinearGain);
  if (pv.lastTabId !== null) {
    const idStr = String(pv.lastTabId);
    if ([...precisionVolumeTabSelect.options].some((o) => o.value === idStr)) {
      precisionVolumeTabSelect.value = idStr;
    }
  }
  await ctrl.refreshApplyHint();
  ctrl.applyToTargetTab(pv.lastLinearGain);
}

export function applyPrecisionVolumeTabSelectFilter(
  ctx: DashboardContext,
  cache: IndividualTabPickerCache
): void {
  const { precisionVolumeTabSelect, precisionVolumeTabSearch } = ctx.dom;
  if (!precisionVolumeTabSelect) {
    return;
  }
  const q = (precisionVolumeTabSearch?.value ?? '').trim().toLowerCase();
  const prev = precisionVolumeTabSelect.value;
  precisionVolumeTabSelect.innerHTML = ACTIVE_TAB_OPTION;
  for (const t of cache.tabs) {
    const label = t.title?.trim() || t.url || `Tab ${t.id}`;
    const url = t.url ?? '';
    const hay = `${label} (${t.id}) ${url}`.toLowerCase();
    if (q !== '' && !hay.includes(q)) {
      continue;
    }
    const opt = document.createElement('option');
    opt.value = String(t.id);
    opt.textContent = `${label} (${t.id})`;
    precisionVolumeTabSelect.appendChild(opt);
  }
  const stillValid =
    prev !== '' && [...precisionVolumeTabSelect.options].some((o) => o.value === prev);
  precisionVolumeTabSelect.value = stillValid ? prev : '';
}

export async function populatePrecisionVolumeTabSelect(
  ctx: DashboardContext,
  cache: IndividualTabPickerCache
): Promise<void> {
  await refreshIndividualTabPickerCache(cache);
  applyIndividualTabSelectFilter(ctx, cache);
  applyPrecisionVolumeTabSelectFilter(ctx, cache);
  await restorePrecisionVolumeAfterTabListReady(ctx);
}

function updatePhaseLabel(ctx: DashboardContext, linearGain: number): void {
  const el = ctx.dom.precisionVolumePhaseLabel;
  if (!el) {
    return;
  }
  el.style.display = linearGain < 0 ? 'block' : 'none';
}

export function bindPrecisionVolumeUi(
  ctx: DashboardContext,
  cache: IndividualTabPickerCache
): void {
  const {
    precisionVolumeTabSelect,
    precisionVolumeTabSearch,
    precisionVolumeTabRefresh,
    precisionVolumeFader,
    precisionVolumeNumeric,
  } = ctx.dom;

  if (!precisionVolumeFader || !precisionVolumeNumeric || !precisionVolumeTabSelect) {
    return;
  }

  let lastFaderPosition = faderValueToPosition(precisionVolumeFader.valueAsNumber);
  let currentLinearGain = clampSignedLinearGain(
    faderValueToLinearGain(precisionVolumeFader.valueAsNumber)
  );
  let applyTimer: ReturnType<typeof setTimeout> | undefined;
  let saveTimer: ReturnType<typeof setTimeout> | undefined;

  const readExplicitTabId = (): number | null =>
    readExplicitTabIdFromSelect(precisionVolumeTabSelect);

  const scheduleApply = (linearGain: number): void => {
    const g = clampSignedLinearGain(linearGain);
    window.clearTimeout(applyTimer);
    applyTimer = window.setTimeout(() => {
      void (async () => {
        const tabId = await resolvePrecisionVolumeTargetTabId(readExplicitTabId());
        if (tabId === undefined) {
          return;
        }
        await sendPrecisionVolumeTabRequest(tabId, { kind: 'set-linear-gain', linearGain: g });
      })();
    }, 70);
  };

  const scheduleSave = (linearGain: number): void => {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      void saveExtensionPrefs({
        precisionVolume: {
          lastTabId: readExplicitTabId(),
          lastLinearGain: clampSignedLinearGain(linearGain),
        },
      });
    }, 450);
  };

  const syncControlsFromLinearGain = (linearGain: number): void => {
    const g = clampSignedLinearGain(linearGain);
    currentLinearGain = g;
    precisionVolumeNumeric.value = formatPercentInput(linearGainToPercent(g));
    if (g >= 0) {
      const fv = linearGainToFaderValue(g);
      precisionVolumeFader.valueAsNumber = fv;
      lastFaderPosition = faderValueToPosition(fv);
    } else {
      precisionVolumeFader.valueAsNumber = 0;
      lastFaderPosition = 0;
    }
    updatePhaseLabel(ctx, g);
  };

  const refreshApplyHint = (): Promise<void> => updatePrecisionVolumeApplyHint(ctx);

  precisionVolumeController = {
    readExplicitTabId,
    syncControlsFromLinearGain,
    applyToTargetTab: (linearGain: number) => {
      scheduleApply(linearGain);
    },
    refreshApplyHint,
  };
  void refreshApplyHint();

  if (precisionVolumeTabSearch && precisionVolumeTabSearch.dataset.pvFilterBound !== '1') {
    precisionVolumeTabSearch.dataset.pvFilterBound = '1';
    precisionVolumeTabSearch.addEventListener('input', () =>
      applyPrecisionVolumeTabSelectFilter(ctx, cache)
    );
  }

  if (precisionVolumeTabRefresh) {
    precisionVolumeTabRefresh.addEventListener('click', () => {
      void populatePrecisionVolumeTabSelect(ctx, cache);
    });
  }

  precisionVolumeFader.addEventListener('pointerdown', () => {
    lastFaderPosition = faderValueToPosition(precisionVolumeFader.valueAsNumber);
  });

  precisionVolumeFader.addEventListener('input', (ev) => {
    const rawPos = faderValueToPosition(precisionVolumeFader.valueAsNumber);
    const shift = (ev as InputEvent).shiftKey === true;
    const effectivePos = applyShiftFineFaderPosition(lastFaderPosition, rawPos, shift);
    lastFaderPosition = effectivePos;
    precisionVolumeFader.valueAsNumber = Math.round(effectivePos * 10000);
    const g = linearGainFromFaderPosition(effectivePos);
    currentLinearGain = g;
    precisionVolumeNumeric.value = formatPercentInput(linearGainToPercent(g));
    updatePhaseLabel(ctx, g);
    scheduleApply(g);
    scheduleSave(g);
  });

  const applyNumeric = (): void => {
    const parsed = parsePercentInput(precisionVolumeNumeric.value);
    if (parsed === null) {
      precisionVolumeNumeric.value = formatPercentInput(linearGainToPercent(currentLinearGain));
      return;
    }
    const g = clampSignedLinearGain(percentToLinearGain(parsed));
    syncControlsFromLinearGain(g);
    scheduleApply(g);
    scheduleSave(g);
  };

  precisionVolumeNumeric.addEventListener('change', applyNumeric);
  precisionVolumeNumeric.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      applyNumeric();
    }
  });

  precisionVolumeTabSelect.addEventListener('change', () => {
    void (async () => {
      await refreshApplyHint();
      scheduleApply(currentLinearGain);
      scheduleSave(currentLinearGain);
    })();
  });
}
