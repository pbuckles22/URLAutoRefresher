/**
 * Content-side proactive raid guard runner (Epic 14).
 */
import {
  findTwitchRaidDeclineControl,
  tryDeclineTwitchRaidInDocument,
} from '../lib/twitch-raid-guard';

const SCAN_DEBOUNCE_MS = 400;
const MIN_CLICK_INTERVAL_MS = 2_000;

export type TwitchRaidGuardRunner = {
  setArmed: (armed: boolean) => void;
  dispose: () => void;
};

export function installTwitchRaidGuardRunner(
  root: Document,
  onDeclined?: () => void
): TwitchRaidGuardRunner {
  let armed = false;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let lastClickAt = 0;
  let declineReportedForVisibleBanner = false;

  function scanNow(): void {
    if (!armed) {
      return;
    }
    if (!findTwitchRaidDeclineControl(root)) {
      declineReportedForVisibleBanner = false;
      return;
    }
    if (declineReportedForVisibleBanner) {
      return;
    }
    const now = Date.now();
    if (now - lastClickAt < MIN_CLICK_INTERVAL_MS) {
      return;
    }
    if (tryDeclineTwitchRaidInDocument(root)) {
      lastClickAt = now;
      declineReportedForVisibleBanner = true;
      onDeclined?.();
    }
  }

  function scheduleScan(): void {
    if (!armed) {
      return;
    }
    if (debounceTimer !== undefined) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = undefined;
      scanNow();
    }, SCAN_DEBOUNCE_MS);
  }

  const observer = new MutationObserver(() => {
    scheduleScan();
  });
  observer.observe(root.documentElement, { childList: true, subtree: true });

  const intervalId = window.setInterval(() => {
    scanNow();
  }, 2_500);

  return {
    setArmed(next) {
      armed = next;
      if (armed) {
        scanNow();
      }
    },
    dispose() {
      armed = false;
      observer.disconnect();
      clearInterval(intervalId);
      if (debounceTimer !== undefined) {
        clearTimeout(debounceTimer);
        debounceTimer = undefined;
      }
    },
  };
}
