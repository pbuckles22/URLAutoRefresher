/**
 * MV3 service worker — dashboard + side panel + scheduling (Epic 2).
 */

import { attachBadgeListeners } from './badge';
import { attachLiveAwareListeners } from './live-aware';
import { attachPageOverlayMessageHandler } from './page-overlay-handler';
import { attachPrecisionVolumeTabRoute } from './precision-volume-tab-route';
import { attachSchedulingListeners, bootstrapScheduling } from './scheduler';
import { attachTwitchFavsTabListener } from './twitch-favs-sync';
import { syncAllOpenTwitchFavsTabs } from './twitch-open-tabs-sync';
import { attachVolumeCommandListeners } from './volume-commands';

attachSchedulingListeners();
attachTwitchFavsTabListener();
attachVolumeCommandListeners();
attachPrecisionVolumeTabRoute();
attachBadgeListeners();
attachPageOverlayMessageHandler();
attachLiveAwareListeners();
void bootstrapScheduling().then(() => syncAllOpenTwitchFavsTabs({ reinjectOverlays: false }));

void chrome.sidePanel.setOptions({
  path: 'sidepanel/sidepanel.html',
  enabled: true,
});

function bootstrapAfterExtensionLoad(reinjectOverlays: boolean): void {
  void bootstrapScheduling().then(() => syncAllOpenTwitchFavsTabs({ reinjectOverlays }));
}

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setOptions({
    path: 'sidepanel/sidepanel.html',
    enabled: true,
  });
  bootstrapAfterExtensionLoad(true);
});

chrome.runtime.onStartup.addListener(() => {
  bootstrapAfterExtensionLoad(true);
});

chrome.action.onClicked.addListener((tab) => {
  const windowId = tab.windowId;
  void chrome.sidePanel.open(windowId === undefined ? {} : { windowId });
});
