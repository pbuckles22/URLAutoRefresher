/**
 * Epic 8.1: report Twitch channel live/offline to the service worker (Twitch-first).
 * Live-aware globals: theater/chat layout while live; offline channel cleanup when not live.
 */
import { TWITCH_LIVE_REPORT, TWITCH_LIVE_STATE_PUSH } from '../lib/messages';
import {
  gatherTwitchBootScriptSample,
  inferTwitchLiveFromScriptText,
} from '../lib/twitch-live-detect';
import {
  applyTwitchWatchLayoutEnhancements,
  beginTwitchLiveWatchSession,
  createTwitchWatchLayoutState,
  handleTwitchOfflineChannelView,
  installDebouncedTwitchWatchLayoutRunner,
  installTwitchWatchLayoutOverrideListeners,
  resetTwitchWatchLayoutSession,
} from './twitch-watch-layout';

const POLL_MS = 22_000;
const DEBOUNCE_MS = 1_600;

function sampleLive(): boolean | null {
  return inferTwitchLiveFromScriptText(gatherTwitchBootScriptSample(document));
}

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let pollTimer: ReturnType<typeof setInterval> | undefined;
let mo: MutationObserver | undefined;
let tornDown = false;
let lastReportedLive: boolean | null | undefined;
let liveSessionActive = false;
let disposeLayoutRunner: (() => void) | undefined;
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

function ensureLayoutRunner(): void {
  if (disposeLayoutRunner) {
    return;
  }
  installTwitchWatchLayoutOverrideListeners(window, document, layoutState);
  disposeLayoutRunner = installDebouncedTwitchWatchLayoutRunner(window, () => {
    if (liveSessionActive) {
      applyTwitchWatchLayoutEnhancements(document, layoutState);
      return;
    }
    if (lastReportedLive === false) {
      handleTwitchOfflineChannelView(document, layoutState);
    }
  });
}

function applyLiveSessionState(live: boolean | null, sessionActive: boolean): void {
  const prevLive = lastReportedLive;
  lastReportedLive = live;
  liveSessionActive = sessionActive;

  if (sessionActive && live === true) {
    beginTwitchLiveWatchSession(layoutState);
    ensureLayoutRunner();
    applyTwitchWatchLayoutEnhancements(document, layoutState);
    window.dispatchEvent(
      new CustomEvent('urlar:twitch-live-session', {
        detail: { live: true, minimizeOverlay: true },
      })
    );
    return;
  }

  if (live === false && (prevLive === true || prevLive === undefined || prevLive === null)) {
    resetTwitchWatchLayoutSession(layoutState);
    ensureLayoutRunner();
    handleTwitchOfflineChannelView(document, layoutState);
    window.dispatchEvent(
      new CustomEvent('urlar:twitch-live-session', {
        detail: { live: false, minimizeOverlay: false },
      })
    );
    return;
  }

  if (live === false) {
    ensureLayoutRunner();
    handleTwitchOfflineChannelView(document, layoutState);
  }
}

function send(live: boolean | null): void {
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

function startBridge(): void {
  try {
    window.addEventListener('unhandledrejection', (ev) => {
      if (isContextInvalidatedError(ev.reason)) {
        ev.preventDefault();
        teardown();
      }
    });

    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type !== TWITCH_LIVE_STATE_PUSH) {
        return;
      }
      applyLiveSessionState(message.live ?? null, message.liveSessionActive === true);
    });

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
