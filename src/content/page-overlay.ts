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
  type PageOverlayBlipPack,
  type PageOverlaySnapBackDebug,
  type PageOverlayStateResponse,
} from '../lib/messages';
import { compileBlipRegex, sampleDocumentText, textMatchesBlip } from '../lib/blip-match';
import { formatOverlayDebugLines } from '../lib/page-overlay-debug';
import {
  sendExtensionMessageAsync,
  sendExtensionMessageFireAndForget,
} from '../lib/extension-runtime-send';
import './precision-volume-bridge';
import { PREFS_STORAGE_KEY } from '../lib/prefs';
import { STORAGE_KEY } from '../lib/storage';

const ROOT_ID = 'url-auto-refresher-overlay-root';

type UiKind = 'hidden' | 'timer' | 'paused';

let uiKind: UiKind = 'hidden';
let nextFireAt: number | undefined;
let overlayGroupId: string | undefined;
let overlayIndividualJobId: string | undefined;
let overlayDebug: PageOverlaySnapBackDebug | undefined;
let overlayMinimized = false;
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

function shadowCss(): string {
  return `
    :host {
      all: initial;
      font-family: system-ui, "Segoe UI", Roboto, sans-serif;
    }
    .card {
      position: fixed;
      top: 12px;
      right: 12px;
      z-index: 2147483646;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
      box-sizing: border-box;
    }
    .card--minimized {
      padding: 4px 8px;
      min-width: 0;
      border-radius: 10px;
    }
    .m-badge {
      display: block;
      border: none;
      background: transparent;
      font-weight: 700;
      font-size: 14px;
      line-height: 1;
      color: #111;
      cursor: pointer;
      padding: 2px 4px;
      font-family: inherit;
    }
    .m-badge:hover {
      color: #1a73e8;
    }
    .minimize-hit {
      position: absolute;
      top: 4px;
      right: 6px;
      z-index: 2;
      border: none;
      background: transparent;
      color: #5f6368;
      font-size: 16px;
      font-weight: 700;
      line-height: 1;
      cursor: pointer;
      padding: 0 4px;
      font-family: inherit;
    }
    .minimize-hit:hover {
      color: #111;
    }
    .card-body {
      position: relative;
    }
    .card-body--has-minimize {
      padding-top: 2px;
      padding-right: 18px;
    }
    .debug-strip {
      margin: 0 0 6px;
      padding: 4px 6px;
      border-radius: 6px;
      background: #f1f3f4;
      font-size: 9px;
      line-height: 1.35;
      font-family: ui-monospace, Consolas, monospace;
      color: #3c4043;
      word-break: break-all;
      cursor: pointer;
      user-select: text;
    }
    .debug-strip:hover {
      background: #e8eaed;
    }
    .debug-line {
      margin: 0;
    }
    .debug-line--live {
      color: #137333;
      font-weight: 600;
    }
    .debug-line--warn {
      color: #c5221f;
      font-weight: 600;
    }
    .card--timer {
      padding: 8px 10px 10px;
      min-width: 0;
    }
    .card--paused {
      padding: 8px 10px 10px;
      min-width: 0;
      max-width: min(22rem, calc(100vw - 32px));
    }
    .paused-compact-row {
      display: flex;
      flex-direction: row;
      align-items: center;
      gap: 8px;
      flex-wrap: nowrap;
    }
    .timer-compact-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .timer-compact-row--with-pause {
      min-width: 168px;
    }
    .timer-compact-row:not(.timer-compact-row--with-pause) {
      justify-content: center;
      padding: 2px 4px;
    }
    .timer-readout {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2px;
    }
    .pause-btn {
      font-size: 11px;
      font-weight: 600;
      padding: 3px 10px;
      border-radius: 6px;
      border: 1px solid #5f6368;
      background: #f1f3f4;
      color: #202124;
      cursor: pointer;
    }
    .pause-btn:hover {
      background: #e8eaed;
    }
    .paused-text {
      font-size: 13px;
      font-weight: 600;
      color: #111;
      line-height: 1.25;
      margin: 0;
      flex: 0 1 auto;
      min-width: 0;
    }
    .resume-btn {
      flex-shrink: 0;
      font-size: 9px;
      font-weight: 600;
      padding: 4px 9px;
      border-radius: 6px;
      border: none;
      background: #8ab4f8;
      color: #202124;
      cursor: pointer;
    }
    .resume-btn:hover {
      filter: brightness(1.05);
    }
    .digits-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 3px;
    }
    .digit {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 21px;
      height: 27px;
      padding: 0 4px;
      border-radius: 6px;
      background: #2a2a2a;
      color: #f5f5f5;
      font-size: 15px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.45), 0 1px 0 rgba(255, 255, 255, 0.06) inset;
    }
    .colon {
      font-size: 17px;
      font-weight: 700;
      color: #111;
      padding: 0 1px 2px;
      user-select: none;
      line-height: 1;
    }
  `;
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
    if (t.closest('[data-overlay-minimize]') || t.closest('[data-overlay-debug-minimize]')) {
      e.preventDefault();
      overlayMinimized = true;
      remountOverlayCard();
      return;
    }
    if (t.closest('[data-overlay-expand]')) {
      e.preventDefault();
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
      } else if (line.includes('Page URL')) {
        cls += ' debug-line--warn';
      }
      return `<p class="${cls}">${escapeHtmlText(line)}</p>`;
    })
    .join('');
  return `<div class="debug-strip" data-overlay-debug-minimize title="Click to minimize overlay">${inner}</div>`;
}

function buildMinimizedHtml(): string {
  return `<button type="button" class="m-badge" data-overlay-expand title="Expand overlay">M</button>`;
}

function buildTimerHtml(showPause: boolean): string {
  const pauseBtn = showPause
    ? `<button type="button" class="pause-btn" data-overlay-pause title="Pause auto-refresh for this tab">Pause</button>`
    : '';
  const rowClass = showPause
    ? 'timer-compact-row timer-compact-row--with-pause'
    : 'timer-compact-row';
  return `
    <button type="button" class="minimize-hit" data-overlay-minimize title="Minimize overlay" aria-label="Minimize overlay">−</button>
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

function buildPausedHtml(): string {
  return `
    <button type="button" class="minimize-hit" data-overlay-minimize title="Minimize overlay" aria-label="Minimize overlay">−</button>
    ${buildDebugHtml(overlayDebug)}
    <div class="paused-compact-row">
      <p class="paused-text">Auto refresh paused</p>
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
    style.textContent = shadowCss();
    root.append(style);
  }
  let card = root.querySelector('.card');
  if (!card) {
    card = document.createElement('div');
    root.append(card);
  }
  return card as HTMLDivElement;
}

function ensureShadowHost(): HTMLDivElement {
  let host = document.getElementById(ROOT_ID) as HTMLDivElement | null;
  if (!host) {
    host = document.createElement('div');
    host.id = ROOT_ID;
    document.documentElement.appendChild(host);
  }
  return host;
}

function remountOverlayCard(): void {
  if (!shadowRoot) {
    return;
  }
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
    card.innerHTML = buildPausedHtml();
  } else if (uiKind === 'timer') {
    card.className = 'card card--timer';
    card.innerHTML = buildTimerHtml(showPause);
    paintDigits();
  }
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

async function syncFromBackgroundInner(): Promise<void> {
  const res = await sendExtensionMessageAsync<PageOverlayStateResponse>({
    type: PAGE_OVERLAY_GET_STATE,
  });
  if (!res?.ok) {
    clearUi();
    clearBlipWatcher();
    return;
  }
  setBlipWatcher(res.blip);
  overlayDebug = res.debug;
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
    return;
  }
  showTimer(res.globalGroupId, res.individualJobId, res.nextFireAt);
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
};

if (!overlayGlobal.__urlarPageOverlayBootstrapped) {
  overlayGlobal.__urlarPageOverlayBootstrapped = true;

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
    if (PREFS_STORAGE_KEY in changes || STORAGE_KEY in changes) {
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

void syncFromBackground();
