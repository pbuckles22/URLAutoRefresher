/**
 * Epic 11 — background `chrome.commands` → Web Audio gain on the primary `<video>` / `<audio>`.
 */
import {
  PV_MIN_GAIN_EXP,
  clampSignedLinearGain,
  stepGainDownLinear,
  stepGainUpLinear,
} from '../lib/precision-volume-gain';
import { gatherHtmlMediaUnderRoot } from '../lib/precision-volume-media-mutation';
import {
  pickPrimaryMediaIndex,
  type PrimaryMediaPickFields,
} from '../lib/precision-volume-primary';
import {
  PRECISION_VOLUME_APPLY,
  type PrecisionVolumeApplyMessage,
  type PrecisionVolumeShortcutAction,
} from '../lib/messages';
import {
  precisionVolumeOsdMessageForHookFailed,
  precisionVolumeOsdMessageForLevel,
  precisionVolumeOsdMessageForNoMedia,
  precisionVolumeOsdMessageForPanicMute,
} from '../lib/precision-volume-osd-text';
import { showPrecisionVolumeOsd } from './precision-volume-osd';

const RAMP_SEC = 0.035;
const ZERO_UNBLAST_SEC = 0.012;

type HookState = {
  context: AudioContext;
  source: MediaElementAudioSourceNode;
  gainNode: GainNode;
};

const hookByMedia = new WeakMap<HTMLMediaElement, HookState>();
const mediaHookFailed = new WeakSet<HTMLMediaElement>();

let sharedContext: AudioContext | null = null;

function acquireAudioContext(): AudioContext {
  if (!sharedContext || sharedContext.state === 'closed') {
    sharedContext = new AudioContext();
  }
  return sharedContext;
}

function mediaElementToPickFields(el: HTMLMediaElement, docIndex: number): PrimaryMediaPickFields {
  const kind = el instanceof HTMLVideoElement ? 'video' : 'audio';
  const r = el.getBoundingClientRect();
  const displayArea = Math.max(0, r.width) * Math.max(0, r.height);
  const intrinsicSize =
    el instanceof HTMLVideoElement ? Math.max(1, el.videoWidth * el.videoHeight) : 1;
  return {
    kind,
    paused: el.paused,
    ended: el.ended,
    readyState: el.readyState,
    intrinsicSize,
    displayArea,
    docIndex,
  };
}

function listPageMedia(): HTMLMediaElement[] {
  return [...document.querySelectorAll('video, audio')].filter(
    (n): n is HTMLMediaElement => n instanceof HTMLMediaElement
  );
}

function pickPrimaryMediaElement(): HTMLMediaElement | null {
  const list = listPageMedia();
  if (list.length === 0) {
    return null;
  }
  const fields = list.map((el, i) => mediaElementToPickFields(el, i));
  const idx = pickPrimaryMediaIndex(fields);
  if (idx < 0) {
    return null;
  }
  return list[idx] ?? null;
}

function releaseHookForMedia(el: HTMLMediaElement): void {
  const state = hookByMedia.get(el);
  if (!state) {
    return;
  }
  try {
    state.source.disconnect();
    state.gainNode.disconnect();
  } catch {
    /* graph may already be disconnected */
  }
  hookByMedia.delete(el);
  mediaHookFailed.delete(el);
}

/**
 * One `MediaElementSource` per element (PVC.6). CORS / cross-origin decode failures → WeakSet, no retry loop.
 */
function tryHookMediaElement(el: HTMLMediaElement): HookState | null {
  const existing = hookByMedia.get(el);
  if (existing) {
    return existing;
  }
  if (mediaHookFailed.has(el)) {
    return null;
  }
  try {
    const context = acquireAudioContext();
    const source = context.createMediaElementSource(el);
    const gainNode = context.createGain();
    // PVC.1 — zero-blast: silent until the user raises gain.
    gainNode.gain.value = 0;
    source.connect(gainNode);
    gainNode.connect(context.destination);
    const state: HookState = { context, source, gainNode };
    hookByMedia.set(el, state);
    return state;
  } catch {
    mediaHookFailed.add(el);
    return null;
  }
}

function readSignedLinearGain(param: AudioParam): number {
  const v = param.value;
  return Number.isFinite(v) ? v : 0;
}

/** Non-negative loudness for shortcut stepping (phase-inverted reads as 0). */
function readEffectiveLinearGain(param: AudioParam): number {
  return Math.max(0, readSignedLinearGain(param));
}

/**
 * Schedule linear-domain target on the gain AudioParam.
 * Signed targets or negative current use linear ramps (exponential curves are invalid for ≤0).
 */
function scheduleGainLinearTarget(
  gainParam: AudioParam,
  context: AudioContext,
  targetLinear: number
): void {
  const now = context.currentTime;
  const T = clampSignedLinearGain(targetLinear);
  const cur = readSignedLinearGain(gainParam);

  if (T < 0 || cur < 0) {
    gainParam.cancelScheduledValues(now);
    gainParam.setValueAtTime(cur, now);
    gainParam.linearRampToValueAtTime(T, now + RAMP_SEC);
    return;
  }

  gainParam.cancelScheduledValues(now);
  const curPos = readEffectiveLinearGain(gainParam);

  if (T === 0) {
    if (curPos <= 0) {
      gainParam.setValueAtTime(0, now);
      return;
    }
    if (curPos <= PV_MIN_GAIN_EXP) {
      gainParam.linearRampToValueAtTime(0, now + RAMP_SEC);
      return;
    }
    gainParam.setValueAtTime(curPos, now);
    gainParam.exponentialRampToValueAtTime(PV_MIN_GAIN_EXP, now + RAMP_SEC * 0.45);
    gainParam.linearRampToValueAtTime(0, now + RAMP_SEC);
    return;
  }

  const safeT = Math.max(T, PV_MIN_GAIN_EXP);
  if (curPos < PV_MIN_GAIN_EXP) {
    const tLin = now + ZERO_UNBLAST_SEC;
    gainParam.setValueAtTime(0, now);
    gainParam.linearRampToValueAtTime(PV_MIN_GAIN_EXP, tLin);
    gainParam.exponentialRampToValueAtTime(safeT, tLin + RAMP_SEC);
    return;
  }

  gainParam.setValueAtTime(curPos, now);
  gainParam.exponentialRampToValueAtTime(safeT, now + RAMP_SEC);
}

function panicMuteGain(gainParam: AudioParam, context: AudioContext): void {
  const now = context.currentTime;
  gainParam.cancelScheduledValues(now);
  gainParam.setValueAtTime(0, now);
}

function handlePrecisionVolumeShortcut(action: PrecisionVolumeShortcutAction): void {
  const el = pickPrimaryMediaElement();
  if (!el) {
    showPrecisionVolumeOsd(precisionVolumeOsdMessageForNoMedia());
    return;
  }
  const hook = tryHookMediaElement(el);
  if (!hook) {
    showPrecisionVolumeOsd(precisionVolumeOsdMessageForHookFailed());
    return;
  }
  const { context, gainNode } = hook;
  void context.resume();

  const g = gainNode.gain;
  const curLinear = readEffectiveLinearGain(g);

  if (action === 'panic-mute') {
    panicMuteGain(g, context);
    showPrecisionVolumeOsd(precisionVolumeOsdMessageForPanicMute());
    return;
  }
  if (action === 'volume-up') {
    const target = clampSignedLinearGain(stepGainUpLinear(curLinear));
    scheduleGainLinearTarget(g, context, target);
    showPrecisionVolumeOsd(precisionVolumeOsdMessageForLevel(target));
    return;
  }
  const targetDown = clampSignedLinearGain(stepGainDownLinear(curLinear));
  scheduleGainLinearTarget(g, context, targetDown);
  showPrecisionVolumeOsd(precisionVolumeOsdMessageForLevel(targetDown));
}

function handlePrecisionVolumeSetLinearGain(linearGain: number): void {
  const el = pickPrimaryMediaElement();
  if (!el) {
    return;
  }
  const hook = tryHookMediaElement(el);
  if (!hook) {
    return;
  }
  const { context, gainNode } = hook;
  void context.resume();
  scheduleGainLinearTarget(gainNode.gain, context, clampSignedLinearGain(linearGain));
}

function handlePrecisionVolumeApply(msg: PrecisionVolumeApplyMessage): void {
  if (msg.kind === 'shortcut') {
    handlePrecisionVolumeShortcut(msg.action);
    return;
  }
  handlePrecisionVolumeSetLinearGain(msg.linearGain);
}

function isShortcutAction(a: unknown): a is PrecisionVolumeShortcutAction {
  return a === 'volume-up' || a === 'volume-down' || a === 'panic-mute';
}

/** Epic 11.3 — SPA churn: tear down Web Audio when `<video>` / `<audio>` leaves the tree (do not pre-hook adds: gain 0 would mute until user acts). */
const MEDIA_REMOVAL_DEBOUNCE_MS = 200;
let mediaRemovalObserver: MutationObserver | undefined;
let mediaRemovalDebounce: ReturnType<typeof setTimeout> | undefined;
let pendingRemovalMutations: MutationRecord[] | undefined;

function flushPendingMediaRemovals(): void {
  mediaRemovalDebounce = undefined;
  if (!chrome.runtime?.id) {
    mediaRemovalObserver?.disconnect();
    mediaRemovalObserver = undefined;
    pendingRemovalMutations = undefined;
    return;
  }
  const batch = pendingRemovalMutations;
  pendingRemovalMutations = undefined;
  if (!batch?.length) {
    return;
  }
  const seen = new Set<HTMLMediaElement>();
  for (const m of batch) {
    for (const n of m.removedNodes) {
      for (const el of gatherHtmlMediaUnderRoot(n)) {
        seen.add(el);
      }
    }
  }
  for (const el of seen) {
    releaseHookForMedia(el);
  }
}

function enqueueMediaRemovalMutations(records: MutationRecord[]): void {
  if (!chrome.runtime?.id) {
    return;
  }
  pendingRemovalMutations = pendingRemovalMutations
    ? pendingRemovalMutations.concat(records)
    : records.slice();
  clearTimeout(mediaRemovalDebounce);
  mediaRemovalDebounce = setTimeout(flushPendingMediaRemovals, MEDIA_REMOVAL_DEBOUNCE_MS);
}

function attachPrecisionVolumeMediaRemovalObserver(): void {
  if (mediaRemovalObserver || typeof document === 'undefined') {
    return;
  }
  mediaRemovalObserver = new MutationObserver((records) => {
    enqueueMediaRemovalMutations(records);
  });
  mediaRemovalObserver.observe(document.documentElement, { childList: true, subtree: true });
}

attachPrecisionVolumeMediaRemovalObserver();

chrome.runtime.onMessage.addListener((msg: unknown, _sender, sendResponse) => {
  const m = msg as Partial<PrecisionVolumeApplyMessage>;
  if (m?.type !== PRECISION_VOLUME_APPLY) {
    return;
  }
  if (m.kind === 'shortcut' && isShortcutAction(m.action)) {
    handlePrecisionVolumeApply({
      type: PRECISION_VOLUME_APPLY,
      kind: 'shortcut',
      action: m.action,
    });
    sendResponse({ ok: true as const });
    return false;
  }
  if (
    m.kind === 'set-linear-gain' &&
    typeof m.linearGain === 'number' &&
    Number.isFinite(m.linearGain)
  ) {
    handlePrecisionVolumeApply({
      type: PRECISION_VOLUME_APPLY,
      kind: 'set-linear-gain',
      linearGain: m.linearGain,
    });
    sendResponse({ ok: true as const });
    return false;
  }
  return;
});
