/**
 * Compact mm:ss countdown on pages that have an active refresh job (when enabled in prefs).
 * Pause → compact “paused” card with resume (global group tabs and individual jobs).
 */
import {
  BLIP_REFRESH_REQUEST,
  GLOBAL_GROUP_TAB_PAUSE,
  INDIVIDUAL_JOB_OVERLAY_PAUSE,
  PAGE_OVERLAY_GET_STATE,
  PAGE_OVERLAY_SYNC_REQUEST,
  TWITCH_LIVE_MANUAL_OVERRIDE,
  type PageOverlayBlipPack,
  type PageOverlaySnapBackDebug,
  type PageOverlayStateResponse,
} from '../lib/messages';
import { compileBlipRegex, sampleDocumentText, textMatchesBlip } from '../lib/blip-match';
import { formatOverlayDebugLines, isLastRefreshOverMaxIdle } from '../lib/page-overlay-debug';
import {
  extensionRuntimeContextLikelyAlive,
  sendExtensionMessageAsync,
  sendExtensionMessageFireAndForget,
} from '../lib/extension-runtime-send';
import './precision-volume-bridge';
import {
  PREFS_STORAGE_KEY,
  loadExtensionPrefs,
  parsePrefs,
  saveExtensionPrefsIfRuntimeAlive,
} from '../lib/prefs';
import { STORAGE_KEY } from '../lib/storage';
import {
  clampOverlayDragPosition,
  computeOverlayHostStyle,
  DEFAULT_OVERLAY_POSITION,
  toggleOverlaySnapAnchor,
  type OverlayPosition,
} from '../lib/overlay-position';
import { PAGE_OVERLAY_SHADOW_CSS } from './page-overlay-shadow-css';

const ROOT_ID = 'url-auto-refresher-overlay-root';
const OVERLAY_KEYBOARD_NUDGE_PX = 8;
const DRAG_HANDLE_LABEL = 'Drag to move overlay. Use arrow keys to nudge.';

type UiKind = 'hidden' | 'timer' | 'paused';

let uiKind: UiKind = 'hidden';
let nextFireAt: number | undefined;
let overlayGroupId: string | undefined;
let overlayIndividualJobId: string | undefined;
let overlayDebug: PageOverlaySnapBackDebug | undefined;
let overlayMinimized = false;
let overlayUserExpanded = false;
let overlayStreamLive: boolean | undefined;
let overlayLivePaused = false;
let overlayPosition: OverlayPosition = { ...DEFAULT_OVERLAY_POSITION };
let shadowRoot: ShadowRoot | null = null;
let tickHandle: ReturnType<typeof setInterval> | undefined;

let blipPack: PageOverlayBlipPack | null = null;
let blipRegex: RegExp | undefined;
let blipMo: MutationObserver | undefined;
let blipIv: ReturnType<typeof setInterval> | undefined;
let blipDebounce: ReturnType<typeof setTimeout> | undefined;
let blipHits: number[] = [];

function clearUi() {
  clearInterval(tickHandle);
  tickHandle = undefined;
  document.getElementById(ROOT_ID)?.remove();
  shadowRoot = null;
  uiKind = 'hidden';
  overlayGroupId = undefined;
  overlayIndividualJobId = undefined;
  overlayDebug = undefined;
  overlayMinimized = false;
  overlayUserExpanded = false;
  overlayStreamLive = undefined;
  overlayLivePaused = false;
}

function clearBlipWatcher(): void {
  clearInterval(blipIv);
  blipIv = undefined;
  clearTimeout(blipDebounce);
  blipDebounce = undefined;
  blipMo?.disconnect();
  blipMo = undefined;
  blipPack = null;
  blipRegex = undefined;
  blipHits = [];
}

function runBlipScan(): void {
  if (!blipPack) {
    return;
  }
  const now = Date.now();
  blipHits = blipHits.filter((t) => t > now - 60_000);
  if (blipHits.length >= blipPack.maxPerMinute) {
    return;
  }
  const text = sampleDocumentText(document);
  if (textMatchesBlip(blipPack.phrases, blipRegex, text)) {
    blipHits.push(now);
    void sendExtensionMessageFireAndForget({ type: BLIP_REFRESH_REQUEST });
  }
}

function scheduleBlipScan(): void {
  clearTimeout(blipDebounce);
  blipDebounce = setTimeout(() => {
    blipDebounce = undefined;
    runBlipScan();
  }, 600);
}

function setBlipWatcher(cfg: PageOverlayBlipPack | undefined): void {
  if (!cfg || (cfg.phrases.length === 0 && !cfg.regex)) {
    clearBlipWatcher();
    return;
  }
  const key = JSON.stringify(cfg);
  const cur = blipPack ? JSON.stringify(blipPack) : '';
  if (key === cur) {
    return;
  }
  clearBlipWatcher();
  blipPack = cfg;
  blipRegex = compileBlipRegex(cfg.regex);
  blipMo = new MutationObserver(() => scheduleBlipScan());
  blipMo.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
  blipIv = setInterval(() => runBlipScan(), 5_000);
  scheduleBlipScan();
  runBlipScan();
}

const shadowRootsWithDelegation = new WeakSet<ShadowRoot>();

function ensureShadowClickDelegation(root: ShadowRoot): void {
  if (shadowRootsWithDelegation.has(root)) {
    return;
  }
  shadowRootsWithDelegation.add(root);
  root.addEventListener('click', (e) => {
    const t = e.target as HTMLElement;
    const gid = overlayGroupId;
    const jid = overlayIndividualJobId;
    const teardownIfDead = (sent: boolean) => {
      if (!sent) {
        clearUi();
        clearBlipWatcher();
      }
    };
    if (t.closest('[data-overlay-stream-toggle]')) {
      e.stopPropagation();
      return;
    }
    if (t.closest('[data-overlay-snap]')) {
      e.preventDefault();
      void persistOverlayPosition(toggleOverlaySnapAnchor(overlayPosition));
      return;
    }
    if (t.closest('[data-overlay-drag-handle]')) {
      e.stopPropagation();
      return;
    }
    if (t.closest('[data-overlay-minimize]') || t.closest('[data-overlay-debug-minimize]')) {
      e.preventDefault();
      overlayUserExpanded = false;
      overlayMinimized = true;
      remountOverlayCard();
      return;
    }
    if (t.closest('[data-overlay-expand]')) {
      e.preventDefault();
      overlayUserExpanded = true;
      overlayMinimized = false;
      remountOverlayCard();
      return;
    }
    if (t.closest('[data-overlay-pause]')) {
      e.preventDefault();
      if (gid) {
        teardownIfDead(
          sendExtensionMessageFireAndForget({
            type: GLOBAL_GROUP_TAB_PAUSE,
            groupId: gid,
            paused: true,
          })
        );
      } else if (jid) {
        teardownIfDead(
          sendExtensionMessageFireAndForget({
            type: INDIVIDUAL_JOB_OVERLAY_PAUSE,
            jobId: jid,
            paused: true,
          })
        );
      }
      return;
    }
    if (t.closest('[data-overlay-resume]')) {
      e.preventDefault();
      if (gid) {
        teardownIfDead(
          sendExtensionMessageFireAndForget({
            type: GLOBAL_GROUP_TAB_PAUSE,
            groupId: gid,
            paused: false,
          })
        );
      } else if (jid) {
        teardownIfDead(
          sendExtensionMessageFireAndForget({
            type: INDIVIDUAL_JOB_OVERLAY_PAUSE,
            jobId: jid,
            paused: false,
          })
        );
      }
    }
  });
}

function escapeHtmlText(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildStreamToggleHtml(debug: PageOverlaySnapBackDebug | undefined): string {
  if (!debug || debug.twitchStreamLive === undefined) {
    return '';
  }
  const on = debug.twitchStreamLive === true;
  const checked = on ? ' checked' : '';
  return `<label class="debug-stream-toggle" title="On pauses interval refresh; Off resumes auto-detect">
    <span>Off</span>
    <input type="checkbox" data-overlay-stream-toggle${checked} aria-label="Stream refresh on or off" />
    <span>On</span>
  </label>`;
}

function bindStreamToggleListener(root: ShadowRoot): void {
  const input = root.querySelector<HTMLInputElement>('[data-overlay-stream-toggle]');
  if (!input || input.dataset.bound === '1') {
    return;
  }
  input.dataset.bound = '1';
  input.addEventListener('change', () => {
    void sendStreamRefreshToggle(input.checked);
  });
}

function buildDebugHtml(debug: PageOverlaySnapBackDebug | undefined): string {
  if (!debug) {
    return '';
  }
  const lines = formatOverlayDebugLines(debug);
  const inner = lines
    .map((line, i) => {
      let cls = 'debug-line';
      if (i === 0 && debug.schedulerUsesThisTab) {
        cls += ' debug-line--live';
      } else if (line.startsWith('Stream: LIVE')) {
        cls += ' debug-line--live';
      } else if (line.startsWith('Stream: offline')) {
        cls += ' debug-line--warn';
      } else if (
        line.startsWith('Last refresh:') &&
        debug.lastRefreshAtMs !== undefined &&
        isLastRefreshOverMaxIdle(debug.lastRefreshAtMs)
      ) {
        cls += ' debug-line--warn';
      } else if (line.includes('Page URL')) {
        cls += ' debug-line--warn';
      }
      if (i === 1 && debug.twitchStreamLive !== undefined) {
        return `<div class="debug-stream-row"><p class="${cls}">${escapeHtmlText(line)}</p>${buildStreamToggleHtml(debug)}</div>`;
      }
      return `<p class="${cls}">${escapeHtmlText(line)}</p>`;
    })
    .join('');
  return `<div class="debug-strip" data-overlay-debug-minimize title="Click to minimize overlay">${inner}</div>`;
}

async function sendStreamRefreshToggle(on: boolean): Promise<void> {
  const gid = overlayGroupId;
  const jid = overlayIndividualJobId;
  if (!gid && !jid) {
    return;
  }
  const sent = sendExtensionMessageFireAndForget({
    type: TWITCH_LIVE_MANUAL_OVERRIDE,
    ...(gid ? { groupId: gid } : {}),
    ...(jid ? { jobId: jid } : {}),
    on,
  });
  if (sent) {
    await syncFromBackground();
  }
}

function buildPositionBarHtml(): string {
  const onRight =
    overlayPosition.dragTop === undefined &&
    overlayPosition.dragLeft === undefined &&
    overlayPosition.anchor === 'right';
  const snapTitle = onRight ? 'Snap overlay to top-left' : 'Snap overlay to top-right';
  return `<div class="position-bar position-bar--with-body">
    <span class="drag-handle" data-overlay-drag-handle title="${escapeHtmlText(DRAG_HANDLE_LABEL)}" aria-label="${escapeHtmlText(DRAG_HANDLE_LABEL)}" role="button" tabindex="0">⋮⋮</span>
    <button type="button" class="snap-hit" data-overlay-snap title="${escapeHtmlText(snapTitle)}" aria-label="${escapeHtmlText(snapTitle)}">⇄</button>
    <button type="button" class="minimize-hit" data-overlay-minimize title="Minimize overlay" aria-label="Minimize overlay">−</button>
  </div>`;
}

function applyOverlayHostPosition(): void {
  const host = document.getElementById(ROOT_ID);
  if (!host) {
    return;
  }
  const style = computeOverlayHostStyle(overlayPosition, overlayMinimized);
  host.style.top = style.top;
  host.style.left = style.left;
  host.style.right = style.right;
  host.classList.toggle('urlar-overlay--snap-left', style.snapLeft);
}

async function loadOverlayPositionFromPrefs(): Promise<void> {
  const prefs = await loadExtensionPrefs();
  overlayPosition = prefs.overlayPosition;
  applyOverlayHostPosition();
}

async function persistOverlayPosition(next: OverlayPosition): Promise<void> {
  overlayPosition = next;
  applyOverlayHostPosition();
  await saveExtensionPrefsIfRuntimeAlive({ overlayPosition: next });
}

function nudgeOverlayPosition(deltaTop: number, deltaLeft: number): void {
  const host = document.getElementById(ROOT_ID);
  if (!host) {
    return;
  }
  const rect = host.getBoundingClientRect();
  const baseTop = overlayPosition.dragTop ?? rect.top;
  const baseLeft = overlayPosition.dragLeft ?? rect.left;
  const clamped = clampOverlayDragPosition(
    baseTop + deltaTop,
    baseLeft + deltaLeft,
    rect.width,
    rect.height,
    window.innerWidth,
    window.innerHeight
  );
  void persistOverlayPosition({
    anchor: overlayPosition.anchor,
    dragTop: clamped.top,
    dragLeft: clamped.left,
  });
}

let dragSession:
  | {
      startX: number;
      startY: number;
      originTop: number;
      originLeft: number;
      hostW: number;
      hostH: number;
    }
  | undefined;

function bindDragHandleListener(root: ShadowRoot): void {
  const handle = root.querySelector('[data-overlay-drag-handle]') as HTMLElement | null;
  if (!handle || handle.dataset.bound === '1') {
    return;
  }
  handle.dataset.bound = '1';
  handle.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const host = document.getElementById(ROOT_ID);
    if (!host) {
      return;
    }
    const rect = host.getBoundingClientRect();
    dragSession = {
      startX: e.clientX,
      startY: e.clientY,
      originTop: rect.top,
      originLeft: rect.left,
      hostW: rect.width,
      hostH: rect.height,
    };
    handle.setPointerCapture(e.pointerId);

    const onMove = (ev: PointerEvent) => {
      if (!dragSession) {
        return;
      }
      const deltaX = ev.clientX - dragSession.startX;
      const deltaY = ev.clientY - dragSession.startY;
      const clamped = clampOverlayDragPosition(
        dragSession.originTop + deltaY,
        dragSession.originLeft + deltaX,
        dragSession.hostW,
        dragSession.hostH,
        window.innerWidth,
        window.innerHeight
      );
      overlayPosition = {
        anchor: overlayPosition.anchor,
        dragTop: clamped.top,
        dragLeft: clamped.left,
      };
      applyOverlayHostPosition();
    };

    const onEnd = (ev: PointerEvent) => {
      if (!dragSession) {
        return;
      }
      dragSession = undefined;
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onEnd);
      handle.removeEventListener('pointercancel', onEnd);
      try {
        handle.releasePointerCapture(ev.pointerId);
      } catch {
        /* pointer may already be released */
      }
      void saveExtensionPrefsIfRuntimeAlive({ overlayPosition });
    };

    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onEnd);
    handle.addEventListener('pointercancel', onEnd);
  });

  handle.addEventListener('keydown', (e) => {
    let deltaTop = 0;
    let deltaLeft = 0;
    if (e.key === 'ArrowUp') {
      deltaTop = -OVERLAY_KEYBOARD_NUDGE_PX;
    } else if (e.key === 'ArrowDown') {
      deltaTop = OVERLAY_KEYBOARD_NUDGE_PX;
    } else if (e.key === 'ArrowLeft') {
      deltaLeft = -OVERLAY_KEYBOARD_NUDGE_PX;
    } else if (e.key === 'ArrowRight') {
      deltaLeft = OVERLAY_KEYBOARD_NUDGE_PX;
    } else {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    nudgeOverlayPosition(deltaTop, deltaLeft);
  });
}

function buildMinimizedHtml(): string {
  const live = overlayStreamLive === true;
  const statusClass = live ? 'm-badge--live' : 'm-badge--offline';
  const timerRunning = uiKind === 'timer';
  const timerPaused = uiKind === 'paused';
  const runIcon = timerPaused ? '⏸' : timerRunning ? '▶' : '';
  const streamWord = live ? 'Live stream' : 'Offline';
  const timerWord = timerPaused ? 'refresh paused' : timerRunning ? 'refresh running' : '';
  const title = timerWord
    ? `URL Auto Refresher — ${streamWord}, ${timerWord}. Click to expand.`
    : `URL Auto Refresher — ${streamWord}. Click to expand.`;
  return `<button type="button" class="m-badge ${statusClass}" data-overlay-expand title="${escapeHtmlText(title)}" aria-label="${escapeHtmlText(title)}">
    <span class="m-badge-dot" aria-hidden="true"></span>
    ${runIcon ? `<span class="m-badge-run" aria-hidden="true">${runIcon}</span>` : ''}
  </button>`;
}

function buildTimerHtml(showPause: boolean): string {
  const pauseBtn = showPause
    ? `<button type="button" class="pause-btn" data-overlay-pause title="Pause auto-refresh for this tab">Pause</button>`
    : '';
  const rowClass = showPause
    ? 'timer-compact-row timer-compact-row--with-pause'
    : 'timer-compact-row';
  return `
    ${buildPositionBarHtml()}
    ${buildDebugHtml(overlayDebug)}
    <div class="timer-compact-row-wrap">
      <div class="${rowClass}">
        ${pauseBtn}
        <div class="timer-readout">
          <div class="digits-row" data-min-digits></div>
          <span class="colon">:</span>
          <div class="digits-row" data-sec-digits></div>
        </div>
      </div>
    </div>
  `;
}

function buildPausedHtml(livePaused?: boolean): string {
  const label = livePaused ? 'Auto refresh paused (stream live)' : 'Auto refresh paused';
  return `
    ${buildPositionBarHtml()}
    ${buildDebugHtml(overlayDebug)}
    <div class="paused-compact-row">
      <p class="paused-text">${escapeHtmlText(label)}</p>
      <button type="button" class="resume-btn" data-overlay-resume title="Resume auto-refresh">Play</button>
    </div>
  `;
}

function resolveShadowRoot(host: HTMLDivElement): ShadowRoot | null {
  if (host.shadowRoot) {
    shadowRoot = host.shadowRoot;
    ensureShadowClickDelegation(shadowRoot);
    return shadowRoot;
  }
  try {
    shadowRoot = host.attachShadow({ mode: 'open' });
  } catch {
    shadowRoot = host.shadowRoot ?? null;
    if (!shadowRoot) {
      host.remove();
      const fresh = ensureShadowHost();
      try {
        shadowRoot = fresh.attachShadow({ mode: 'open' });
      } catch {
        shadowRoot = fresh.shadowRoot ?? null;
      }
    }
  }
  if (!shadowRoot) {
    return null;
  }
  ensureShadowClickDelegation(shadowRoot);
  return shadowRoot;
}

function ensureShadowCard(root: ShadowRoot): HTMLDivElement {
  if (!root.querySelector('style')) {
    const style = document.createElement('style');
    style.textContent = PAGE_OVERLAY_SHADOW_CSS;
    root.append(style);
  }
  let card = root.querySelector('.card');
  if (!card) {
    card = document.createElement('div');
    card.className = 'card';
    root.append(card);
  }
  return card as HTMLDivElement;
}

function ensureShadowHost(): HTMLDivElement {
  let host = document.getElementById(ROOT_ID) as HTMLDivElement | null;
  if (!host) {
    host = document.createElement('div');
    host.id = ROOT_ID;
  }
  const mount = document.body ?? document.documentElement;
  if (host.parentElement !== mount) {
    mount.appendChild(host);
  }
  return host;
}

function syncHostMinimizedClass(): void {
  const host = document.getElementById(ROOT_ID);
  if (!host) {
    return;
  }
  host.classList.toggle('urlar-overlay--minimized', overlayMinimized);
  applyOverlayHostPosition();
}

function remountOverlayCard(): void {
  if (!shadowRoot) {
    return;
  }
  syncHostMinimizedClass();
  const card = shadowRoot.querySelector('.card');
  if (!card) {
    return;
  }
  if (overlayMinimized) {
    card.className = 'card card--minimized';
    card.innerHTML = buildMinimizedHtml();
    return;
  }
  const showPause = overlayGroupId !== undefined || overlayIndividualJobId !== undefined;
  if (uiKind === 'paused') {
    card.className = 'card card--paused';
    card.innerHTML = buildPausedHtml(overlayLivePaused);
  } else if (uiKind === 'timer') {
    card.className = 'card card--timer';
    card.innerHTML = buildTimerHtml(showPause);
    paintDigits();
  } else {
    card.className = 'card';
    card.innerHTML = '';
  }
  bindStreamToggleListener(shadowRoot);
  bindDragHandleListener(shadowRoot);
}

function mountTimerOverlay(opts: { globalGroupId?: string; individualJobId?: string }): void {
  overlayGroupId = opts.globalGroupId;
  overlayIndividualJobId = opts.individualJobId;
  const root = resolveShadowRoot(ensureShadowHost());
  if (!root) {
    return;
  }
  ensureShadowCard(root);
  uiKind = 'timer';
  remountOverlayCard();
}

function mountPausedOverlay(
  scope: { type: 'global'; groupId: string } | { type: 'individual'; jobId: string }
): void {
  if (scope.type === 'global') {
    overlayGroupId = scope.groupId;
    overlayIndividualJobId = undefined;
  } else {
    overlayGroupId = undefined;
    overlayIndividualJobId = scope.jobId;
  }
  const root = resolveShadowRoot(ensureShadowHost());
  if (!root) {
    return;
  }
  ensureShadowCard(root);
  uiKind = 'paused';
  remountOverlayCard();
}

function formatParts(nowMs: number): { minDigits: string[]; secTens: string; secOnes: string } {
  if (nextFireAt === undefined) {
    return { minDigits: ['-', '-'], secTens: '-', secOnes: '-' };
  }
  const remain = nextFireAt - nowMs;
  if (remain <= 0) {
    return { minDigits: ['0', '0'], secTens: '0', secOnes: '0' };
  }
  const totalSec = Math.ceil(remain / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const minStr = m < 100 ? String(m).padStart(2, '0') : String(m);
  const secStr = String(s).padStart(2, '0');
  return {
    minDigits: minStr.split(''),
    secTens: secStr[0]!,
    secOnes: secStr[1]!,
  };
}

function paintDigits() {
  if (!shadowRoot || uiKind !== 'timer' || overlayMinimized) {
    return;
  }
  const minRow = shadowRoot.querySelector('[data-min-digits]');
  const secRow = shadowRoot.querySelector('[data-sec-digits]');
  if (!minRow || !secRow) {
    return;
  }
  const { minDigits, secTens, secOnes } = formatParts(Date.now());
  const minParts: string[] = [];
  for (const ch of minDigits) {
    minParts.push(`<span class="digit">${escapeHtml(ch)}</span>`);
  }
  minRow.innerHTML = minParts.join('');
  secRow.innerHTML = `<span class="digit">${escapeHtml(secTens)}</span><span class="digit">${escapeHtml(
    secOnes
  )}</span>`;
}

function escapeHtml(c: string): string {
  if (c === '-') {
    return '-';
  }
  const n = c.charCodeAt(0);
  if (n < 48 || n > 57) {
    return '?';
  }
  return c;
}

function showTimer(
  globalGroupIdFromState: string | undefined,
  individualJobIdFromState: string | undefined,
  fireAt: number | undefined
) {
  clearInterval(tickHandle);
  tickHandle = undefined;
  nextFireAt = fireAt;
  mountTimerOverlay({
    globalGroupId: globalGroupIdFromState,
    individualJobId: individualJobIdFromState,
  });
  paintDigits();
  if (!tickHandle) {
    tickHandle = setInterval(() => paintDigits(), 500);
  }
}

function showPaused(
  scope: { type: 'global'; groupId: string } | { type: 'individual'; jobId: string }
) {
  clearInterval(tickHandle);
  tickHandle = undefined;
  nextFireAt = undefined;
  mountPausedOverlay(scope);
}

type PageOverlayStateSuccess = Exclude<PageOverlayStateResponse, { ok: false }>;

function isOverlayStateSuccess(
  res: PageOverlayStateResponse | undefined
): res is PageOverlayStateSuccess {
  return res !== undefined && res.ok === true;
}

/** Backoff for MV3 SW wake / first-message failures (not for definitive { ok: false }). */
const OVERLAY_STATE_RETRY_DELAYS_MS = [0, 120, 250, 500, 1000] as const;

async function requestOverlayState(): Promise<PageOverlayStateSuccess | undefined> {
  for (const delayMs of OVERLAY_STATE_RETRY_DELAYS_MS) {
    if (delayMs > 0) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
    const res = await sendExtensionMessageAsync<PageOverlayStateResponse>({
      type: PAGE_OVERLAY_GET_STATE,
    });
    if (isOverlayStateSuccess(res)) {
      return res;
    }
    // Background answered definitively — do not treat { ok: false } as partial success.
    if (res !== undefined && res.ok === false) {
      return undefined;
    }
  }
  return undefined;
}

function applyOverlayMinimize(minimize: boolean): void {
  if (!minimize || overlayMinimized || overlayUserExpanded) {
    return;
  }
  overlayMinimized = true;
  remountOverlayCard();
}

async function syncFromBackgroundInner(): Promise<void> {
  const res = await requestOverlayState();
  if (!isOverlayStateSuccess(res)) {
    clearUi();
    clearBlipWatcher();
    return;
  }
  setBlipWatcher(res.blip);
  overlayDebug = res.debug;
  overlayStreamLive = res.debug?.twitchStreamLive;
  overlayLivePaused = res.mode === 'paused' && res.livePaused === true;
  if (!res.show) {
    clearUi();
    return;
  }
  if (res.mode === 'paused') {
    if ('individualJobId' in res) {
      showPaused({ type: 'individual', jobId: res.individualJobId });
    } else {
      showPaused({ type: 'global', groupId: res.globalGroupId });
    }
  } else {
    showTimer(res.globalGroupId, res.individualJobId, res.nextFireAt);
  }
  applyOverlayMinimize(true);
}

let overlaySyncChain: Promise<void> = Promise.resolve();

async function syncFromBackground(): Promise<void> {
  overlaySyncChain = overlaySyncChain
    .then(() => syncFromBackgroundInner())
    .catch(() => {
      /* extension context or messaging may fail transiently */
    });
  await overlaySyncChain;
}

const overlayGlobal = globalThis as typeof globalThis & {
  __urlarPageOverlayBootstrapped?: boolean;
  __urlarPageOverlayRuntimeId?: string;
};

/** Re-register listeners after extension reload / programmatic re-inject (same tab, new runtime id). */
function overlayBootstrapStale(): boolean {
  if (!extensionRuntimeContextLikelyAlive()) {
    return false;
  }
  const id = chrome.runtime.id;
  if (overlayGlobal.__urlarPageOverlayRuntimeId !== id) {
    overlayGlobal.__urlarPageOverlayRuntimeId = id;
    overlayGlobal.__urlarPageOverlayBootstrapped = false;
  }
  return !overlayGlobal.__urlarPageOverlayBootstrapped;
}

if (overlayBootstrapStale()) {
  overlayGlobal.__urlarPageOverlayBootstrapped = true;

  if (/twitch\.tv/i.test(location.hostname)) {
    window.addEventListener('urlar:twitch-live-session', (ev) => {
      const detail = (ev as CustomEvent<{ live?: boolean; minimizeOverlay?: boolean }>).detail;
      if (detail?.live !== undefined) {
        overlayStreamLive = detail.live;
        if (overlayMinimized && shadowRoot) {
          remountOverlayCard();
        }
      }
      if (detail?.minimizeOverlay === true) {
        applyOverlayMinimize(true);
      }
    });
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== PAGE_OVERLAY_SYNC_REQUEST) {
      return;
    }
    void syncFromBackground().then(() => sendResponse({ ok: true }));
    return true;
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') {
      return;
    }
    if (PREFS_STORAGE_KEY in changes) {
      const raw = changes[PREFS_STORAGE_KEY]?.newValue;
      overlayPosition = parsePrefs(raw).overlayPosition;
      applyOverlayHostPosition();
      void syncFromBackground();
      return;
    }
    if (STORAGE_KEY in changes) {
      void syncFromBackground();
    }
  });

  let lastOverlayPageUrl = location.href;
  if (/twitch\.tv/i.test(location.hostname)) {
    window.setInterval(() => {
      const href = location.href;
      if (href === lastOverlayPageUrl) {
        return;
      }
      lastOverlayPageUrl = href;
      void syncFromBackground();
    }, 1500);
  }
}

void loadOverlayPositionFromPrefs().then(() => syncFromBackground());
