/**
 * Epic 13.B5 — `chrome.storage.local` app-state listener + 1s countdown ticker for dashboard lists.
 * Keeps `onlyNonLayoutAppStateDiff` layout-only updates on a cheap tick path without full re-render.
 */
import { onlyNonLayoutAppStateDiff } from '../lib/app-state-list-layout';
import { loadAppState, STORAGE_KEY } from '../lib/storage';
import { renderGlobalGroupsList, tickGlobalGroupCountdowns } from './dashboard-global-groups';
import { renderIndividualJobs, tickIndividualJobCountdowns } from './dashboard-individual-jobs';
import type { DashboardContext } from './dashboard-shell';

export async function tickDashboardCountdowns(ctx: DashboardContext): Promise<void> {
  const state = await loadAppState();
  const now = Date.now();
  tickIndividualJobCountdowns(ctx.dom.jobsList, state.individualJobs, now);
  tickGlobalGroupCountdowns(ctx.dom.globalGroupsList, state.globalGroups, now);
}

/** Subscribes to app storage changes and starts the 1s countdown interval. */
export function wireDashboardStorageSync(ctx: DashboardContext): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !(STORAGE_KEY in changes)) {
      return;
    }
    const ch = changes[STORAGE_KEY]!;
    if (onlyNonLayoutAppStateDiff(ch.oldValue, ch.newValue)) {
      void tickDashboardCountdowns(ctx);
      return;
    }
    void renderIndividualJobs(ctx);
    void renderGlobalGroupsList(ctx);
  });

  window.setInterval(() => void tickDashboardCountdowns(ctx), 1000);
}
