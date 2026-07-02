/**
 * Epic 8.1: report Twitch channel live/offline to the service worker (Twitch-first).
 * Live/offline channel visits: live = theater + open chat; offline = theater + collapsed chat.
 */
import {
  coalesceTwitchLiveSignal,
  isTwitchChannelRootUrl,
  isTwitchPopoutChatUrl,
  twitchChannelSlugFromPopoutChatUrl,
} from '../lib/twitch-live-detect';
import {
  TWITCH_LIVE_REPORT,
  TWITCH_LIVE_STATE_PUSH,
  TWITCH_RAID_BLOCK_REPORT,
  TWITCH_RAID_GUARD_PUSH,
  TWITCH_RAID_GUARD_SYNC_REQUEST,
  TWITCH_CHANNEL_POINTS_BONUS_PUSH,
  TWITCH_CHANNEL_POINTS_BONUS_SYNC_REQUEST,
} from '../lib/messages';
import { sendExtensionMessageFireAndForget } from '../lib/extension-runtime-send';
import { loadExtensionPrefs, parsePrefs, PREFS_STORAGE_KEY } from '../lib/prefs';
import { inferTwitchLiveFromChannelPage } from '../lib/twitch-live-detect';
import {
  createTwitchWatchLayoutState,
  installDebouncedTwitchWatchLayoutRunner,
  installTwitchWatchLayoutOverrideListeners,
  resetTwitchWatchLayoutAutomationState,
  runTwitchChannelWatchLayout,
} from './twitch-watch-layout';
import { installTwitchRaidGuardRunner } from './twitch-raid-guard-runner';
import { installTwitchChannelPointsBonusRunner } from './twitch-channel-points-bonus-runner';
import {
  applyWatchLayoutPrefChange,
  canRunWatchLayout,
  completeWatchLayoutPrefHydration,
  createWatchLayoutPrefState,
  watchLayoutEnabledFromStorageChange,
  type WatchLayoutPrefState,
} from './twitch-watch-layout-pref';

const POLL_MS = 22_000;
const DEBOUNCE_MS = 1_600;

function sampleLive(): boolean | null {
  return inferTwitchLiveFromChannelPage(document);
}

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let pollTimer: ReturnType<typeof setInterval> | undefined;
let mo: MutationObserver | undefined;
let tornDown = false;
let lastReportedLive: boolean | null | undefined;
let disposeLayoutRunner: (() => void) | undefined;
let raidGuardRunner: ReturnType<typeof installTwitchRaidGuardRunner> | undefined;
let channelPointsBonusRunner: ReturnType<typeof installTwitchChannelPointsBonusRunner> | undefined;
const layoutState = createTwitchWatchLayoutState();
const watchLayoutPrefState: WatchLayoutPrefState = createWatchLayoutPrefState();

function disposeWatchLayoutRunner(): void {
  disposeLayoutRunner?.();
  disposeLayoutRunner = undefined;
}

function applyWatchLayoutPrefAction(action: ReturnType<typeof applyWatchLayoutPrefChange>): void {
  if (action.shouldStopLayout) {
    disposeWatchLayoutRunner();
  }
  if (action.shouldResetLayoutState) {
    resetTwitchWatchLayoutAutomationState(layoutState);
  }
  if (action.shouldRunLayout) {
    runWatchLayoutIfChannelPage();
  }
}

function hydrateWatchLayoutPref(): void {
  void loadExtensionPrefs().then((p) => {
    applyWatchLayoutPrefAction(
      completeWatchLayoutPrefHydration(watchLayoutPrefState, p.twitchWatchLayoutEnabled)
    );
  });
}

function teardown(): void {
  if (tornDown) {
    return;
  }
  tornDown = true;
  if (debounceTimer !== undefined) {
    clearTimeout(debounceTimer);
    debounceTimer = undefined;
  }
  if (pollTimer !== undefined) {
    clearInterval(pollTimer);
    pollTimer = undefined;
  }
  mo?.disconnect();
  mo = undefined;
  disposeWatchLayoutRunner();
  raidGuardRunner?.dispose();
  raidGuardRunner = undefined;
  channelPointsBonusRunner?.dispose();
  channelPointsBonusRunner = undefined;
  document.removeEventListener('visibilitychange', onVisibilityChange);
}

function isExtensionContextAlive(): boolean {
  try {
    return typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id);
  } catch {
    return false;
  }
}

function isContextInvalidatedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes('Extension context invalidated') || msg.includes('context invalidated');
}

function streamIsLive(): boolean {
  return coalesceTwitchLiveSignal(lastReportedLive ?? null);
}

function notifyOverlayMinimizeIfLive(rawLive: boolean | null): void {
  if (!coalesceTwitchLiveSignal(rawLive)) {
    return;
  }
  window.dispatchEvent(
    new CustomEvent('urlar:twitch-live-session', {
      detail: { live: true, minimizeOverlay: true },
    })
  );
}

function recoverPopoutChatToChannelHome(): boolean {
  if (!isTwitchPopoutChatUrl(location.href)) {
    return false;
  }
  const slug = twitchChannelSlugFromPopoutChatUrl(location.href);
  if (!slug) {
    return false;
  }
  location.replace(`https://www.twitch.tv/${slug}`);
  return true;
}

function runWatchLayoutIfChannelPage(): void {
  if (recoverPopoutChatToChannelHome()) {
    return;
  }
  if (!canRunWatchLayout(watchLayoutPrefState) || !isTwitchChannelRootUrl(location.href)) {
    return;
  }
  if (location.href !== lastLayoutHref) {
    lastLayoutHref = location.href;
    layoutState.offlineNavDone = false;
    layoutState.offlineChatNavClicked = false;
    layoutState.theaterClickDone = false;
    layoutState.chatCollapseDone = false;
    layoutState.userOverrodeTheater = false;
    layoutState.userOverrodeChat = false;
    layoutState.watchLayoutEngaged = false;
  }
  ensureLayoutRunner();
  runTwitchChannelWatchLayout(
    document,
    layoutState,
    streamIsLive(),
    watchLayoutPrefState.watchLayoutEnabled
  );
}

let lastLayoutHref = location.href;

function ensureLayoutRunner(): void {
  if (!canRunWatchLayout(watchLayoutPrefState) || disposeLayoutRunner) {
    return;
  }
  installTwitchWatchLayoutOverrideListeners(window, document, layoutState);
  disposeLayoutRunner = installDebouncedTwitchWatchLayoutRunner(window, () => {
    runTwitchChannelWatchLayout(
      document,
      layoutState,
      streamIsLive(),
      watchLayoutPrefState.watchLayoutEnabled
    );
  });
}

function applyLiveSessionState(live: boolean | null, sessionActive: boolean): void {
  const prevCoalesced = coalesceTwitchLiveSignal(lastReportedLive ?? null);
  lastReportedLive = live;

  const coalesced = coalesceTwitchLiveSignal(live);
  if (sessionActive && coalesced) {
    notifyOverlayMinimizeIfLive(live);
  } else if (!coalesced && prevCoalesced) {
    window.dispatchEvent(
      new CustomEvent('urlar:twitch-live-session', {
        detail: { live: false, minimizeOverlay: false },
      })
    );
  }

  runWatchLayoutIfChannelPage();
}

function send(rawLive: boolean | null): void {
  const live = coalesceTwitchLiveSignal(rawLive);
  try {
    if (!isExtensionContextAlive()) {
      teardown();
      return;
    }
    const p = chrome.runtime.sendMessage({ type: TWITCH_LIVE_REPORT, live });
    if (p !== undefined && typeof (p as Promise<unknown>).catch === 'function') {
      void (p as Promise<unknown>).catch((err) => {
        if (isContextInvalidatedError(err)) {
          teardown();
        }
      });
    }
    lastReportedLive = rawLive;
    notifyOverlayMinimizeIfLive(rawLive);
    runWatchLayoutIfChannelPage();
  } catch {
    teardown();
  }
}

function scheduleReport(): void {
  if (debounceTimer !== undefined) {
    clearTimeout(debounceTimer);
  }
  debounceTimer = setTimeout(() => {
    debounceTimer = undefined;
    try {
      if (!isExtensionContextAlive()) {
        teardown();
        return;
      }
      send(sampleLive());
    } catch {
      teardown();
    }
  }, DEBOUNCE_MS);
}

function onVisibilityChange(): void {
  if (document.visibilityState === 'visible') {
    try {
      send(sampleLive());
    } catch {
      teardown();
    }
  }
}

function ensureRaidGuardRunner(): ReturnType<typeof installTwitchRaidGuardRunner> {
  if (!raidGuardRunner) {
    raidGuardRunner = installTwitchRaidGuardRunner(document, () => {
      sendExtensionMessageFireAndForget({ type: TWITCH_RAID_BLOCK_REPORT });
    });
  }
  return raidGuardRunner;
}

function setRaidGuardArmed(armed: boolean): void {
  ensureRaidGuardRunner().setArmed(armed);
}

function ensureChannelPointsBonusRunner(): ReturnType<
  typeof installTwitchChannelPointsBonusRunner
> {
  if (!channelPointsBonusRunner) {
    channelPointsBonusRunner = installTwitchChannelPointsBonusRunner(document);
  }
  return channelPointsBonusRunner;
}

function setChannelPointsBonusArmed(armed: boolean): void {
  ensureChannelPointsBonusRunner().setArmed(armed);
}

function startBridge(): void {
  try {
    window.addEventListener('unhandledrejection', (ev) => {
      if (isContextInvalidatedError(ev.reason)) {
        ev.preventDefault();
        teardown();
      }
    });

    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type === TWITCH_LIVE_STATE_PUSH) {
        applyLiveSessionState(message.live ?? null, message.liveSessionActive === true);
        return;
      }
      if (message?.type === TWITCH_RAID_GUARD_PUSH) {
        setRaidGuardArmed(message.armed === true);
      }
      if (message?.type === TWITCH_CHANNEL_POINTS_BONUS_PUSH) {
        setChannelPointsBonusArmed(message.armed === true);
      }
    });

    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local' || !(PREFS_STORAGE_KEY in changes)) {
        return;
      }
      applyWatchLayoutPrefAction(
        applyWatchLayoutPrefChange(
          watchLayoutPrefState,
          watchLayoutEnabledFromStorageChange(changes[PREFS_STORAGE_KEY]?.newValue, parsePrefs)
        )
      );
    });

    hydrateWatchLayoutPref();
    sendExtensionMessageFireAndForget({ type: TWITCH_RAID_GUARD_SYNC_REQUEST });
    sendExtensionMessageFireAndForget({ type: TWITCH_CHANNEL_POINTS_BONUS_SYNC_REQUEST });
    send(sampleLive());
    pollTimer = window.setInterval(() => {
      try {
        if (!isExtensionContextAlive()) {
          teardown();
          return;
        }
        send(sampleLive());
      } catch {
        teardown();
      }
    }, POLL_MS);

    document.addEventListener('visibilitychange', onVisibilityChange);

    mo = new MutationObserver(() => {
      try {
        if (!isExtensionContextAlive()) {
          teardown();
          return;
        }
        scheduleReport();
      } catch {
        teardown();
      }
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  } catch {
    teardown();
  }
}

startBridge();
