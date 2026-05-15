/**
 * Epic 11.4 — dashboard / side panel → background → tab content (precision volume apply).
 */
import { PV_MAX_GAIN_LINEAR } from '../lib/precision-volume-gain';
import {
  PRECISION_VOLUME_TAB_REQUEST,
  precisionVolumeTabRequestToApply,
  type PrecisionVolumeTabRequestMessage,
  type PrecisionVolumeTabRouteResponse,
} from '../lib/messages';

export function isLinearGainRoutable(linearGain: number): boolean {
  return (
    Number.isFinite(linearGain) &&
    linearGain >= -PV_MAX_GAIN_LINEAR &&
    linearGain <= PV_MAX_GAIN_LINEAR
  );
}

export function isTrustedPrecisionVolumeSender(sender: chrome.runtime.MessageSender): boolean {
  const url = sender.url;
  const extId = chrome.runtime?.id;
  if (!url || !extId) {
    return false;
  }
  const prefix = `chrome-extension://${extId}/`;
  if (!url.startsWith(prefix)) {
    return false;
  }
  const path = url.slice(prefix.length);
  return path.startsWith('dashboard/') || path.startsWith('sidepanel/');
}

export function parsePrecisionVolumeTabRequest(
  message: unknown
): PrecisionVolumeTabRequestMessage | null {
  if (!message || typeof message !== 'object') {
    return null;
  }
  const m = message as Record<string, unknown>;
  if (m.type !== PRECISION_VOLUME_TAB_REQUEST) {
    return null;
  }
  if (typeof m.tabId !== 'number' || !Number.isInteger(m.tabId) || m.tabId < 0) {
    return null;
  }
  const tabId = m.tabId;
  if (m.kind === 'shortcut') {
    const a = m.action;
    if (a !== 'volume-up' && a !== 'volume-down' && a !== 'panic-mute') {
      return null;
    }
    return { type: PRECISION_VOLUME_TAB_REQUEST, tabId, kind: 'shortcut', action: a };
  }
  if (m.kind === 'set-linear-gain') {
    if (typeof m.linearGain !== 'number' || !Number.isFinite(m.linearGain)) {
      return null;
    }
    return {
      type: PRECISION_VOLUME_TAB_REQUEST,
      tabId,
      kind: 'set-linear-gain',
      linearGain: m.linearGain,
    };
  }
  return null;
}

function validateGainForRoute(
  msg: PrecisionVolumeTabRequestMessage
): PrecisionVolumeTabRouteResponse | null {
  if (msg.kind !== 'set-linear-gain') {
    return null;
  }
  if (!isLinearGainRoutable(msg.linearGain)) {
    return { ok: false, reason: 'bad-gain' };
  }
  return null;
}

export function attachPrecisionVolumeTabRoute(): void {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const parsed = parsePrecisionVolumeTabRequest(message);
    if (!parsed) {
      return false;
    }

    void (async (): Promise<void> => {
      const fail = (r: PrecisionVolumeTabRouteResponse) => {
        sendResponse(r);
      };

      if (!isTrustedPrecisionVolumeSender(sender)) {
        fail({ ok: false, reason: 'forbidden' });
        return;
      }

      const badGain = validateGainForRoute(parsed);
      if (badGain) {
        fail(badGain);
        return;
      }

      const apply = precisionVolumeTabRequestToApply(parsed);
      try {
        await chrome.tabs.sendMessage(parsed.tabId, apply);
        sendResponse({ ok: true } satisfies PrecisionVolumeTabRouteResponse);
      } catch {
        fail({ ok: false, reason: 'send' });
      }
    })();

    return true;
  });
}
