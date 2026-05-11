/**
 * Epic 11 — choose which `<video>` / `<audio>` receives shortcut-driven gain (until dashboard routing).
 * Pure logic for Tier 1 tests; DOM mapping lives in the content bridge.
 */

export type PrimaryMediaPickFields = {
  kind: 'video' | 'audio';
  paused: boolean;
  ended: boolean;
  readyState: number;
  /** `videoWidth * videoHeight` for video; 1 for audio. */
  intrinsicSize: number;
  /** Layout area (`getBoundingClientRect`) for “largest player” tie-break. */
  displayArea: number;
  /** Document order index; earlier elements win on full ties. */
  docIndex: number;
};

/** Positive if `a` should win over `b` (higher priority). */
export function comparePrimaryMediaPriority(a: PrimaryMediaPickFields, b: PrimaryMediaPickFields): number {
  const key = (m: PrimaryMediaPickFields) => {
    const playing = !m.paused && !m.ended && m.readyState >= 2;
    return [playing ? 1 : 0, m.displayArea, m.kind === 'video' ? 1 : 0, m.intrinsicSize, -m.docIndex] as const;
  };
  const ka = key(a);
  const kb = key(b);
  for (let i = 0; i < ka.length; i++) {
    if (ka[i] !== kb[i]) {
      return ka[i]! - kb[i]!;
    }
  }
  return 0;
}

export function pickPrimaryMediaIndex(candidates: readonly PrimaryMediaPickFields[]): number {
  if (candidates.length === 0) {
    return -1;
  }
  let best = 0;
  for (let i = 1; i < candidates.length; i++) {
    if (comparePrimaryMediaPriority(candidates[i]!, candidates[best]!) > 0) {
      best = i;
    }
  }
  return best;
}
