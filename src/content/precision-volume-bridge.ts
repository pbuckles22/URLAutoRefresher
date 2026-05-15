/**
 * Epic 11 — background `chrome.commands` → Web Audio gain on the primary `<video>` / `<audio>`.
 */
import {
  PV_MIN_GAIN_EXP,
  clampLinearGain,
  stepGainDownLinear,
  stepGainUpLinear,
} from '../lib/precision-volume-gain';
import {
  pickPrimaryMediaIndex,
  type PrimaryMediaPickFields,
} from '../lib/precision-volume-primary';
import {
  PRECISION_VOLUME_APPLY,
  type PrecisionVolumeApplyMessage,
  type PrecisionVolumeShortcutAction,
} from '../lib/messages';

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

function readEffectiveLinearGain(param: AudioParam): number {
  const v = param.value;
  if (!Number.isFinite(v) || v <= 0) {
    return 0;
  }
  return v;
}

/** Schedule linear-domain target `targetLinear` on the gain AudioParam (smooth + exponential-safe). */
function scheduleGainLinearTarget(
  gainParam: AudioParam,
  context: AudioContext,
  targetLinear: number
): void {
  const now = context.currentTime;
  gainParam.cancelScheduledValues(now);
  const T = clampLinearGain(targetLinear);
  const cur = readEffectiveLinearGain(gainParam);

  if (T === 0) {
    if (cur <= 0) {
      gainParam.setValueAtTime(0, now);
      return;
    }
    if (cur <= PV_MIN_GAIN_EXP) {
      gainParam.linearRampToValueAtTime(0, now + RAMP_SEC);
      return;
    }
    gainParam.setValueAtTime(cur, now);
    gainParam.exponentialRampToValueAtTime(PV_MIN_GAIN_EXP, now + RAMP_SEC * 0.45);
    gainParam.linearRampToValueAtTime(0, now + RAMP_SEC);
    return;
  }

  const safeT = Math.max(T, PV_MIN_GAIN_EXP);
  if (cur < PV_MIN_GAIN_EXP) {
    const tLin = now + ZERO_UNBLAST_SEC;
    gainParam.setValueAtTime(0, now);
    gainParam.linearRampToValueAtTime(PV_MIN_GAIN_EXP, tLin);
    gainParam.exponentialRampToValueAtTime(safeT, tLin + RAMP_SEC);
    return;
  }

  gainParam.setValueAtTime(cur, now);
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
    return;
  }
  const hook = tryHookMediaElement(el);
  if (!hook) {
    return;
  }
  const { context, gainNode } = hook;
  void context.resume();

  const g = gainNode.gain;
  const curLinear = readEffectiveLinearGain(g);

  if (action === 'panic-mute') {
    panicMuteGain(g, context);
    return;
  }
  if (action === 'volume-up') {
    scheduleGainLinearTarget(g, context, stepGainUpLinear(curLinear));
    return;
  }
  scheduleGainLinearTarget(g, context, stepGainDownLinear(curLinear));
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
  scheduleGainLinearTarget(gainNode.gain, context, clampLinearGain(linearGain));
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
