/**
 * Shared dashboard + side panel UI (Epic 5): prefs, global groups, individual jobs,
 * countdown ticks, cross-surface links.
 */
import {
  bindGlobalGroupForm,
  bindGlobalGroupsListEvents,
  bindGlobalTabBrowserUi,
  bindGlobalTwitchFavsHint,
  renderGlobalGroupsList,
  renderGlobalTabBrowser,
} from './dashboard-global-groups';
import {
  bindAddIndividualJobForm,
  bindJobsListEvents,
  renderIndividualJobs,
} from './dashboard-individual-jobs';
import {
  bindIndividualTabPickerUi,
  createIndividualTabPickerCache,
  populateIndividualTabSelect,
} from './dashboard-individual-tab-picker';
import {
  applyPrecisionVolumeTabSelectFilter,
  bindPrecisionVolumeUi,
  populatePrecisionVolumeTabSelect,
} from './dashboard-precision-volume';
import {
  bindOverlayPreference,
  createDashboardContext,
  wireCrossSurfaceLinks,
} from './dashboard-shell';
import { wireDashboardStorageSync } from './dashboard-storage-sync';

export function initDashboardApp(): void {
  const dashboardContext = createDashboardContext();
  const individualTabCache = createIndividualTabPickerCache();

  const title = document.querySelector<HTMLElement>('[data-app-title]');
  if (title) {
    title.textContent = chrome.runtime.getManifest().name;
  }

  bindOverlayPreference(dashboardContext);

  wireDashboardStorageSync(dashboardContext);

  bindGlobalTwitchFavsHint(dashboardContext);
  bindJobsListEvents(dashboardContext);
  bindAddIndividualJobForm(dashboardContext);
  bindIndividualTabPickerUi(dashboardContext, individualTabCache, {
    afterTabListRefresh: () =>
      applyPrecisionVolumeTabSelectFilter(dashboardContext, individualTabCache),
  });
  bindPrecisionVolumeUi(dashboardContext, individualTabCache);
  bindGlobalGroupsListEvents(dashboardContext, individualTabCache, renderIndividualJobs);
  bindGlobalTabBrowserUi(dashboardContext);
  bindGlobalGroupForm(dashboardContext, renderIndividualJobs);
  wireCrossSurfaceLinks(dashboardContext);

  void Promise.all([
    populateIndividualTabSelect(dashboardContext, individualTabCache),
    populatePrecisionVolumeTabSelect(dashboardContext, individualTabCache),
    renderGlobalTabBrowser(dashboardContext),
    renderGlobalGroupsList(dashboardContext),
  ]).then(() => renderIndividualJobs(dashboardContext));
}
