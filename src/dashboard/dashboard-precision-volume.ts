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
import {
  applyIndividualTabSelectFilter,
  refreshIndividualTabPickerCache,
  type IndividualTabPickerCache,
} from './dashboard-individual-tab-picker';
import type { DashboardContext } from './dashboard-shell';

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
  precisionVolumeTabSelect.innerHTML = '<option value="">Select a tab…</option>';
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

  const readTabId = (): number | null => {
    const raw = precisionVolumeTabSelect.value;
    if (raw === '') {
      return null;
    }
    const id = Number(raw);
    return Number.isInteger(id) && id >= 0 ? id : null;
  };

  const scheduleApply = (linearGain: number): void => {
    const tabId = readTabId();
    if (tabId === null) {
      return;
    }
    const g = clampSignedLinearGain(linearGain);
    window.clearTimeout(applyTimer);
    applyTimer = window.setTimeout(() => {
      void sendPrecisionVolumeTabRequest(tabId, { kind: 'set-linear-gain', linearGain: g });
    }, 70);
  };

  const scheduleSave = (linearGain: number): void => {
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(() => {
      const tabId = readTabId();
      void saveExtensionPrefs({
        precisionVolume: {
          lastTabId: tabId,
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

  void loadExtensionPrefs().then((p) => {
    const pv = p.precisionVolume;
    syncControlsFromLinearGain(pv.lastLinearGain);
    if (pv.lastTabId !== null) {
      const idStr = String(pv.lastTabId);
      if ([...precisionVolumeTabSelect.options].some((o) => o.value === idStr)) {
        precisionVolumeTabSelect.value = idStr;
      }
    }
  });

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
    scheduleApply(currentLinearGain);
    scheduleSave(currentLinearGain);
  });
}
