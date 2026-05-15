/**
 * Epic 11 — `chrome.commands` → active tab content script (precision volume).
 */
import {
  PRECISION_VOLUME_APPLY,
  type PrecisionVolumeApplyMessage,
  type PrecisionVolumeShortcutAction,
} from '../lib/messages';

const COMMAND_TO_ACTION: Record<string, PrecisionVolumeShortcutAction | undefined> = {
  'volume-up': 'volume-up',
  'volume-down': 'volume-down',
  'panic-mute': 'panic-mute',
};

export function attachVolumeCommandListeners(): void {
  chrome.commands.onCommand.addListener((command) => {
    const action = COMMAND_TO_ACTION[command];
    if (!action) {
      return;
    }
    void deliverPrecisionVolumeCommand(action);
  });
}

async function deliverPrecisionVolumeCommand(action: PrecisionVolumeShortcutAction): Promise<void> {
  let tabId: number | undefined;
  try {
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    tabId = tab?.id;
  } catch {
    return;
  }
  if (tabId === undefined) {
    return;
  }

  const payload: PrecisionVolumeApplyMessage = {
    type: PRECISION_VOLUME_APPLY,
    kind: 'shortcut',
    action,
  };

  try {
    await chrome.tabs.sendMessage(tabId, payload);
  } catch {
    /* Tab may have no receiver (chrome://, PDF, or script not injected). */
  }
}
