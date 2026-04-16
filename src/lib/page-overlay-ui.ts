import type { ExtensionPrefs } from './prefs';
import type { AppState } from './types';
import { getPageOverlayVmForTab, type PageOverlayVm } from './page-overlay-state';

export type { PageOverlayVm };

/** @deprecated Use getPageOverlayVmForTab — kept for tests importing the name. */
export async function getPageOverlayUiState(
  state: AppState,
  prefs: ExtensionPrefs,
  tabId: number
): Promise<
  | { show: false }
  | {
      show: true;
      nextFireAt: number | undefined;
      globalGroupId?: string;
      individualJobId?: string;
      mode?: 'timer';
    }
  | { show: true; mode: 'paused'; globalGroupId: string }
  | { show: true; mode: 'paused'; individualJobId: string }
> {
  const vm = await getPageOverlayVmForTab(state, prefs, tabId);
  if (!vm.show) {
    return { show: false };
  }
  if (vm.mode === 'paused') {
    if ('individualJobId' in vm) {
      return { show: true, mode: 'paused', individualJobId: vm.individualJobId };
    }
    return { show: true, mode: 'paused', globalGroupId: vm.globalGroupId };
  }
  return {
    show: true,
    mode: 'timer',
    nextFireAt: vm.nextFireAt,
    globalGroupId: vm.globalGroupId,
    individualJobId: vm.individualJobId,
  };
}
