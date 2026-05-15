/**
 * Epic 11.4 — extension UI pages call background to drive precision volume on a tab.
 */
import { sendExtensionMessageAsync } from './extension-runtime-send';
import {
  PRECISION_VOLUME_TAB_REQUEST,
  type PrecisionVolumeApplyPayload,
  type PrecisionVolumeTabRequestMessage,
  type PrecisionVolumeTabRouteResponse,
} from './messages';

export type { PrecisionVolumeApplyPayload, PrecisionVolumeTabRouteResponse };

export async function sendPrecisionVolumeTabRequest(
  tabId: number,
  apply: PrecisionVolumeApplyPayload
): Promise<PrecisionVolumeTabRouteResponse | undefined> {
  const msg: PrecisionVolumeTabRequestMessage = {
    type: PRECISION_VOLUME_TAB_REQUEST,
    tabId,
    ...apply,
  };
  return sendExtensionMessageAsync<PrecisionVolumeTabRouteResponse>(msg);
}
