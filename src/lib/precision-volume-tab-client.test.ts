import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PRECISION_VOLUME_TAB_REQUEST } from './messages';
import { sendPrecisionVolumeTabRequest } from './precision-volume-tab-client';

vi.mock('./extension-runtime-send', () => ({
  sendExtensionMessageAsync: vi.fn(),
}));

import { sendExtensionMessageAsync } from './extension-runtime-send';

describe('precision-volume-tab-client', () => {
  beforeEach(() => {
    vi.mocked(sendExtensionMessageAsync).mockReset();
  });

  it('sendPrecisionVolumeTabRequest delegates to runtime with tab id and apply payload', async () => {
    vi.mocked(sendExtensionMessageAsync).mockResolvedValue({ ok: true });
    await expect(
      sendPrecisionVolumeTabRequest(12, { kind: 'shortcut', action: 'volume-down' })
    ).resolves.toEqual({ ok: true });
    expect(sendExtensionMessageAsync).toHaveBeenCalledWith({
      type: PRECISION_VOLUME_TAB_REQUEST,
      tabId: 12,
      kind: 'shortcut',
      action: 'volume-down',
    });
  });

  it('passes set-linear-gain through unchanged', async () => {
    vi.mocked(sendExtensionMessageAsync).mockResolvedValue({ ok: true });
    await sendPrecisionVolumeTabRequest(3, { kind: 'set-linear-gain', linearGain: 0.25 });
    expect(sendExtensionMessageAsync).toHaveBeenCalledWith({
      type: PRECISION_VOLUME_TAB_REQUEST,
      tabId: 3,
      kind: 'set-linear-gain',
      linearGain: 0.25,
    });
  });
});
