/**
 * Large Min/Sec countdown on pages that have an active refresh job (when enabled in prefs).
 * Pause → compact “paused” card with resume (global group tabs and individual jobs).
 */
import {
  BLIP_REFRESH_REQUEST,
  GLOBAL_GROUP_TAB_PAUSE,
  INDIVIDUAL_JOB_OVERLAY_PAUSE,
  PAGE_OVERLAY_GET_STATE,
  type PageOverlayBlipPack,
  type PageOverlayStateResponse,
} from '../lib/messages';
import { compileBlipRegex, sampleDocumentText, textMatchesBlip } from '../lib/blip-match';
import { PREFS_STORAGE_KEY } from '../lib/prefs';
import { STORAGE_KEY } from '../lib/storage';

const ROOT_ID = 'url-auto-refresher-overlay-root';

type UiKind = 'hidden' | 'timer' | 'paused';

let uiKind: UiKind = 'hidden';
let nextFireAt: number | undefined;
let overlayGroupId: string | undefined;
let overlayIndividualJobId: string | undefined;
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
    void chrome.runtime.sendMessage({ type: BLIP_REFRESH_REQUEST }).catch(() => {});
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
    .card--timer {
      padding: 12px 14px 14px;
      min-width: 132px;
    }
    .card--paused {
      padding: 10px 12px 12px;
      min-width: 0;
      max-width: 14rem;
    }
    .toolbar {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 6px;
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
      line-height: 1.35;
      margin: 0 0 8px;
    }
    .resume-btn {
      font-size: 12px;
      font-weight: 600;
      padding: 6px 12px;
      border-radius: 8px;
      border: none;
      background: #8ab4f8;
      color: #202124;
      cursor: pointer;
    }
    .resume-btn:hover {
      filter: brightness(1.05);
    }
    .timer {
      display: flex;
      align-items: flex-end;
      justify-content: center;
      gap: 4px;
    }
    .stack {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    }
    .lab {
      font-family: system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-weight: 800;
      font-size: 13px;
      letter-spacing: 0.02em;
      color: #111;
      text-align: center;
      line-height: 1.1;
      user-select: none;
    }
    .digits-row {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
    }
    .digit {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 28px;
      height: 36px;
      padding: 0 6px;
      border-radius: 8px;
      background: #2a2a2a;
      color: #f5f5f5;
      font-size: 20px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.45), 0 1px 0 rgba(255, 255, 255, 0.06) inset;
    }
    .colon {
      font-size: 22px;
      font-weight: 700;
      color: #111;
      padding: 0 2px 4px;
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
    if (t.closest('[data-overlay-pause]')) {
      e.preventDefault();
      if (gid) {
        void chrome.runtime
          .sendMessage({
            type: GLOBAL_GROUP_TAB_PAUSE,
            groupId: gid,
            paused: true,
          })
          .catch(() => {});
      } else if (jid) {
        void chrome.runtime
          .sendMessage({
            type: INDIVIDUAL_JOB_OVERLAY_PAUSE,
            jobId: jid,
            paused: true,
          })
          .catch(() => {});
      }
      return;
    }
    if (t.closest('[data-overlay-resume]')) {
      e.preventDefault();
      if (gid) {
        void chrome.runtime
          .sendMessage({
            type: GLOBAL_GROUP_TAB_PAUSE,
            groupId: gid,
            paused: false,
          })
          .catch(() => {});
      } else if (jid) {
        void chrome.runtime
          .sendMessage({
            type: INDIVIDUAL_JOB_OVERLAY_PAUSE,
            jobId: jid,
            paused: false,
          })
          .catch(() => {});
      }
    }
  });
}

function buildTimerHtml(showPause: boolean): string {
  const toolbar = showPause
    ? `<div class="toolbar"><button type="button" class="pause-btn" data-overlay-pause title="Pause auto-refresh for this tab">Pause</button></div>`
    : '';
  return `
    ${toolbar}
    <div class="timer">
      <div class="stack">
        <span class="lab">Min</span>
        <div class="digits-row" data-min-digits></div>
      </div>
      <span class="colon">:</span>
      <div class="stack">
        <span class="lab">Sec</span>
        <div class="digits-row" data-sec-digits></div>
      </div>
    </div>
  `;
}

function buildPausedHtml(): string {
  return `
    <p class="paused-text">Auto refresh paused</p>
    <button type="button" class="resume-btn" data-overlay-resume title="Resume auto-refresh">Play</button>
  `;
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

function mountTimerOverlay(opts: { globalGroupId?: string; individualJobId?: string }): void {
  overlayGroupId = opts.globalGroupId;
  overlayIndividualJobId = opts.individualJobId;
  const host = ensureShadowHost();
  const showPause = opts.globalGroupId !== undefined || opts.individualJobId !== undefined;
  if (!shadowRoot) {
    shadowRoot = host.attachShadow({ mode: 'open' });
    ensureShadowClickDelegation(shadowRoot);
    const style = document.createElement('style');
    style.textContent = shadowCss();
    const card = document.createElement('div');
    card.className = 'card card--timer';
    card.innerHTML = buildTimerHtml(showPause);
    shadowRoot.append(style, card);
  } else {
    ensureShadowClickDelegation(shadowRoot);
    const card = shadowRoot.querySelector('.card');
    if (card) {
      card.className = 'card card--timer';
      card.innerHTML = buildTimerHtml(showPause);
    }
  }
  uiKind = 'timer';
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
  const host = ensureShadowHost();
  if (!shadowRoot) {
    shadowRoot = host.attachShadow({ mode: 'open' });
    ensureShadowClickDelegation(shadowRoot);
    const style = document.createElement('style');
    style.textContent = shadowCss();
    const card = document.createElement('div');
    card.className = 'card card--paused';
    card.innerHTML = buildPausedHtml();
    shadowRoot.append(style, card);
  } else {
    ensureShadowClickDelegation(shadowRoot);
    const card = shadowRoot.querySelector('.card');
    if (card) {
      card.className = 'card card--paused';
      card.innerHTML = buildPausedHtml();
    }
  }
  uiKind = 'paused';
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
  if (!shadowRoot || uiKind !== 'timer') {
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

async function syncFromBackground(): Promise<void> {
  try {
    const res = (await chrome.runtime.sendMessage({ type: PAGE_OVERLAY_GET_STATE })) as
      | PageOverlayStateResponse
      | undefined;
    if (!res?.ok) {
      clearUi();
      clearBlipWatcher();
      return;
    }
    setBlipWatcher(res.blip);
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
  } catch {
    clearUi();
    clearBlipWatcher();
  }
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') {
    return;
  }
  if (PREFS_STORAGE_KEY in changes || STORAGE_KEY in changes) {
    void syncFromBackground();
  }
});

void syncFromBackground();
