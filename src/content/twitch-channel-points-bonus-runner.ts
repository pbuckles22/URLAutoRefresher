/**
 * Content-side channel points bonus auto-click runner (Backlog #12).
 */
import {
  findTwitchChannelPointsBonusControl,
  tryClaimTwitchChannelPointsBonusInDocument,
} from '../lib/twitch-channel-points-bonus';

const SCAN_DEBOUNCE_MS = 400;
const MIN_CLICK_INTERVAL_MS = 2_000;

export type TwitchChannelPointsBonusRunner = {
  setArmed: (armed: boolean) => void;
  dispose: () => void;
};

export function installTwitchChannelPointsBonusRunner(
  root: Document,
  onClaimed?: () => void
): TwitchChannelPointsBonusRunner {
  let armed = false;
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;
  let lastClickAt = 0;
  let claimReportedForVisibleBonus = false;

  function scanNow(): void {
    if (!armed) {
      return;
    }
    if (!findTwitchChannelPointsBonusControl(root)) {
      claimReportedForVisibleBonus = false;
      return;
    }
    if (claimReportedForVisibleBonus) {
      return;
    }
    const now = Date.now();
    if (now - lastClickAt < MIN_CLICK_INTERVAL_MS) {
      return;
    }
    if (tryClaimTwitchChannelPointsBonusInDocument(root)) {
      lastClickAt = now;
      claimReportedForVisibleBonus = true;
      onClaimed?.();
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
