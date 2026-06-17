/**
 * Epic 8.1: report Twitch channel live/offline to the service worker (Twitch-first).
 * All channel visits: theater + collapsed chat; offline/unknown clicks Chat first.
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
} from '../lib/messages';
import { sendExtensionMessageFireAndForget } from '../lib/extension-runtime-send';
import { inferTwitchLiveFromChannelPage } from '../lib/twitch-live-detect';
import {
  createTwitchWatchLayoutState,
  installDebouncedTwitchWatchLayoutRunner,
  installTwitchWatchLayoutOverrideListeners,
  runTwitchChannelWatchLayout,
} from './twitch-watch-layout';
import { installTwitchRaidGuardRunner } from './twitch-raid-guard-runner';

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
const layoutState = createTwitchWatchLayoutState();

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
  disposeLayoutRunner?.();
  disposeLayoutRunner = undefined;
  raidGuardRunner?.dispose();
  raidGuardRunner = undefined;
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
  if (!isTwitchChannelRootUrl(location.href)) {
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
  runTwitchChannelWatchLayout(document, layoutState, streamIsLive());
}

let lastLayoutHref = location.href;

function ensureLayoutRunner(): void {
  if (disposeLayoutRunner) {
    return;
  }
  installTwitchWatchLayoutOverrideListeners(window, document, layoutState);
  disposeLayoutRunner = installDebouncedTwitchWatchLayoutRunner(window, () => {
    runTwitchChannelWatchLayout(document, layoutState, streamIsLive());
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
    });

    sendExtensionMessageFireAndForget({ type: TWITCH_RAID_GUARD_SYNC_REQUEST });
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
