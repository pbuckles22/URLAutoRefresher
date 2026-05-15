import { afterEach, describe, expect, it, vi } from 'vitest';
import { PV_MAX_GAIN_LINEAR } from '../lib/precision-volume-gain';
import {
  PRECISION_VOLUME_APPLY,
  PRECISION_VOLUME_TAB_REQUEST,
  precisionVolumeTabRequestToApply,
} from '../lib/messages';
import {
  isTrustedPrecisionVolumeSender,
  isLinearGainRoutable,
  parsePrecisionVolumeTabRequest,
} from './precision-volume-tab-route';

describe('precision-volume-tab-route', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('isTrustedPrecisionVolumeSender accepts dashboard and side panel extension URLs', () => {
    vi.stubGlobal('chrome', { runtime: { id: 'extid' } });
    expect(
      isTrustedPrecisionVolumeSender({
        url: 'chrome-extension://extid/dashboard/dashboard.html',
      } as chrome.runtime.MessageSender)
    ).toBe(true);
    expect(
      isTrustedPrecisionVolumeSender({
        url: 'chrome-extension://extid/sidepanel/sidepanel.html',
      } as chrome.runtime.MessageSender)
    ).toBe(true);
  });

  it('isTrustedPrecisionVolumeSender rejects other origins and paths', () => {
    vi.stubGlobal('chrome', { runtime: { id: 'extid' } });
    expect(
      isTrustedPrecisionVolumeSender({
        url: 'chrome-extension://otherid/dashboard/dashboard.html',
      } as chrome.runtime.MessageSender)
    ).toBe(false);
    expect(
      isTrustedPrecisionVolumeSender({
        url: 'chrome-extension://extid/options.html',
      } as chrome.runtime.MessageSender)
    ).toBe(false);
    expect(
      isTrustedPrecisionVolumeSender({ url: 'https://evil.test/' } as chrome.runtime.MessageSender)
    ).toBe(false);
  });

  it('parsePrecisionVolumeTabRequest accepts shortcut and set-linear-gain', () => {
    expect(
      parsePrecisionVolumeTabRequest({
        type: PRECISION_VOLUME_TAB_REQUEST,
        tabId: 3,
        kind: 'shortcut',
        action: 'volume-up',
      })
    ).toEqual({
      type: PRECISION_VOLUME_TAB_REQUEST,
      tabId: 3,
      kind: 'shortcut',
      action: 'volume-up',
    });
    expect(
      parsePrecisionVolumeTabRequest({
        type: PRECISION_VOLUME_TAB_REQUEST,
        tabId: 1,
        kind: 'set-linear-gain',
        linearGain: 1.5,
      })
    ).toEqual({
      type: PRECISION_VOLUME_TAB_REQUEST,
      tabId: 1,
      kind: 'set-linear-gain',
      linearGain: 1.5,
    });
  });

  it('parsePrecisionVolumeTabRequest rejects bad tab id, kind, or action', () => {
    expect(
      parsePrecisionVolumeTabRequest({
        type: PRECISION_VOLUME_TAB_REQUEST,
        tabId: -1,
        kind: 'shortcut',
        action: 'volume-up',
      })
    ).toBeNull();
    expect(
      parsePrecisionVolumeTabRequest({
        type: PRECISION_VOLUME_TAB_REQUEST,
        tabId: 1.2,
        kind: 'shortcut',
        action: 'volume-up',
      })
    ).toBeNull();
    expect(
      parsePrecisionVolumeTabRequest({
        type: PRECISION_VOLUME_TAB_REQUEST,
        tabId: 1,
        kind: 'shortcut',
        action: 'bogus',
      })
    ).toBeNull();
    expect(
      parsePrecisionVolumeTabRequest({
        type: PRECISION_VOLUME_TAB_REQUEST,
        tabId: 1,
        kind: 'other',
      })
    ).toBeNull();
    expect(
      parsePrecisionVolumeTabRequest({ type: 'x', tabId: 1, kind: 'shortcut', action: 'volume-up' })
    ).toBeNull();
  });

  it('precisionVolumeTabRequestToApply maps to PRECISION_VOLUME_APPLY', () => {
    const req = {
      type: PRECISION_VOLUME_TAB_REQUEST,
      tabId: 9,
      kind: 'set-linear-gain' as const,
      linearGain: 2,
    };
    expect(precisionVolumeTabRequestToApply(req)).toEqual({
      type: PRECISION_VOLUME_APPLY,
      kind: 'set-linear-gain',
      linearGain: 2,
    });
  });

  it('isLinearGainRoutable allows signed Epic 11.5 domain', () => {
    expect(isLinearGainRoutable(0)).toBe(true);
    expect(isLinearGainRoutable(PV_MAX_GAIN_LINEAR)).toBe(true);
    expect(isLinearGainRoutable(-PV_MAX_GAIN_LINEAR)).toBe(true);
    expect(isLinearGainRoutable(-0.001)).toBe(true);
    expect(isLinearGainRoutable(PV_MAX_GAIN_LINEAR + 0.001)).toBe(false);
    expect(isLinearGainRoutable(-PV_MAX_GAIN_LINEAR - 0.001)).toBe(false);
  });
});
