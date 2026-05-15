/**
 * Epic 11.6 — copy for in-page precision volume shortcut OSD (PVC.7).
 */
import { clampSignedLinearGain } from './precision-volume-gain';
import { formatPercentInput, linearGainToPercent } from './precision-volume-fader';

export function precisionVolumeOsdMessageForNoMedia(): string {
  return 'No media on this page';
}

export function precisionVolumeOsdMessageForHookFailed(): string {
  return "Can't attach to this media";
}

export function precisionVolumeOsdMessageForPanicMute(): string {
  return 'Muted';
}

/** Signed linear gain → same percent style as the dashboard numeric field. */
export function precisionVolumeOsdMessageForLevel(signedLinearGain: number): string {
  const g = clampSignedLinearGain(signedLinearGain);
  return `${formatPercentInput(linearGainToPercent(g))}%`;
}
