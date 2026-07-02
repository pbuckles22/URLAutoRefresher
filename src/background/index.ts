/**
 * MV3 service worker — dashboard + side panel + scheduling (Epic 2).
 */

import { attachBadgeListeners } from './badge';
import { attachLiveAwareListeners } from './live-aware';
import { attachPageOverlayMessageHandler } from './page-overlay-handler';
import { attachPrecisionVolumeTabRoute } from './precision-volume-tab-route';
import { attachSchedulingListeners, bootstrapScheduling } from './scheduler';
import { attachTwitchFavsTabListener } from './twitch-favs-sync';
import {
  attachTwitchRaidGuardListeners,
  syncTwitchRaidGuardForAllOpenTabs,
} from './twitch-raid-guard';
import {
  attachTwitchChannelPointsBonusListeners,
  syncTwitchChannelPointsBonusForAllOpenTabs,
} from './twitch-channel-points-bonus';
import { syncAllOpenTwitchFavsTabs } from './twitch-open-tabs-sync';
import { attachVolumeCommandListeners } from './volume-commands';

attachSchedulingListeners();
attachTwitchFavsTabListener();
attachVolumeCommandListeners();
attachPrecisionVolumeTabRoute();
attachBadgeListeners();
attachPageOverlayMessageHandler();
attachLiveAwareListeners();
attachTwitchRaidGuardListeners();
attachTwitchChannelPointsBonusListeners();

/** Serialize SW bootstrap so module load, onInstalled, and onStartup do not interleave. */
let bootstrapChain: Promise<void> = Promise.resolve();

function enqueueBootstrap(reinjectOverlays: boolean): void {
  bootstrapChain = bootstrapChain
    .then(async () => {
      await bootstrapScheduling();
      await syncAllOpenTwitchFavsTabs({ reinjectOverlays });
      await syncTwitchRaidGuardForAllOpenTabs();
      await syncTwitchChannelPointsBonusForAllOpenTabs();
    })
    .catch(() => {
      /* storage or alarm APIs may fail transiently on SW wake */
    });
}

enqueueBootstrap(false);

void chrome.sidePanel.setOptions({
  path: 'sidepanel/sidepanel.html',
  enabled: true,
});

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setOptions({
    path: 'sidepanel/sidepanel.html',
    enabled: true,
  });
  enqueueBootstrap(true);
});

chrome.runtime.onStartup.addListener(() => {
  enqueueBootstrap(true);
});

chrome.action.onClicked.addListener((tab) => {
  const windowId = tab.windowId;
  void chrome.sidePanel.open(windowId === undefined ? {} : { windowId });
});
