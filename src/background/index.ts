/**
 * MV3 service worker — dashboard + side panel + scheduling (Epic 2).
 */

import { attachBadgeListeners } from './badge';
import { attachPageOverlayMessageHandler } from './page-overlay-handler';
import { attachSchedulingListeners, bootstrapScheduling } from './scheduler';

attachSchedulingListeners();
attachBadgeListeners();
attachPageOverlayMessageHandler();
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

chrome.action.onClicked.addListener(() => {
  const url = chrome.runtime.getURL('dashboard/dashboard.html');
  void chrome.tabs.create({ url });
});
