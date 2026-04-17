/**
 * MV3 service worker — dashboard + side panel + scheduling (Epic 2).
 */

import { attachBadgeListeners } from './badge';
import { attachLiveAwareListeners } from './live-aware';
import { attachPageOverlayMessageHandler } from './page-overlay-handler';
import { attachSchedulingListeners, bootstrapScheduling } from './scheduler';

attachSchedulingListeners();
attachBadgeListeners();
attachPageOverlayMessageHandler();
attachLiveAwareListeners();
void bootstrapScheduling();

void chrome.sidePanel.setOptions({
  path: 'sidepanel/sidepanel.html',
  enabled: true,
});

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setOptions({
    path: 'sidepanel/sidepanel.html',
    enabled: true,
  });
});

chrome.action.onClicked.addListener((tab) => {
  const windowId = tab.windowId;
  void chrome.sidePanel.open(windowId === undefined ? {} : { windowId });
});
