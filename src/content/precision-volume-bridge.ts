/**
 * Epic 11 — receives shortcut payloads from the background; Web Audio hook lands in 11.2+.
 */
import {
  PRECISION_VOLUME_COMMAND,
  type PrecisionVolumeCommandMessage,
} from '../lib/messages';

chrome.runtime.onMessage.addListener((msg: unknown, _sender, sendResponse) => {
  const m = msg as Partial<PrecisionVolumeCommandMessage>;
  if (m?.type !== PRECISION_VOLUME_COMMAND) {
    return;
  }
  // Epic 11.2: attach GainNode graph; 11.6: OSD on shortcut
  sendResponse({ ok: true as const });
  return false;
});
