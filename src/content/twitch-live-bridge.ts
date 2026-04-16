/**
 * Epic 8.1: report Twitch channel live/offline to the service worker (Twitch-first).
 */
import { TWITCH_LIVE_REPORT } from '../lib/messages';
import { gatherTwitchBootScriptSample, inferTwitchLiveFromScriptText } from '../lib/twitch-live-detect';

const POLL_MS = 22_000;
const DEBOUNCE_MS = 1_600;

function sampleLive(): boolean | null {
  return inferTwitchLiveFromScriptText(gatherTwitchBootScriptSample(document));
}

let debounceTimer: ReturnType<typeof setTimeout> | undefined;
let pollTimer: ReturnType<typeof setInterval> | undefined;
let mo: MutationObserver | undefined;
let tornDown = false;

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
  document.removeEventListener('visibilitychange', onVisibilityChange);
}

/** After reload/disable/update, the page keeps running but messaging is dead (any `chrome.runtime` use can throw). */
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
