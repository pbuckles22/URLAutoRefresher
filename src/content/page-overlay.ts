/**
 * Large Min/Sec countdown on pages that have an active refresh job (when enabled in prefs).
 */
import { PAGE_OVERLAY_GET_STATE } from '../lib/messages';
import { PREFS_STORAGE_KEY } from '../lib/prefs';
import { STORAGE_KEY } from '../lib/storage';

const ROOT_ID = 'url-auto-refresher-overlay-root';

type OverlayMode = 'hidden' | 'show';

let mode: OverlayMode = 'hidden';
let nextFireAt: number | undefined;
let shadowRoot: ShadowRoot | null = null;
let tickHandle: ReturnType<typeof setInterval> | undefined;

function clearUi() {
  clearInterval(tickHandle);
  tickHandle = undefined;
  document.getElementById(ROOT_ID)?.remove();
  shadowRoot = null;
  mode = 'hidden';
}

function shadowCss(): string {
  return `
    :host {
      all: initial;
      font-family: system-ui, "Segoe UI", Roboto, sans-serif;
    }
    .card {
      position: fixed;
      top: 72px;
      right: 16px;
      z-index: 2147483646;
      background: #ffffff;
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
      padding: 10px 14px 12px;
      min-width: 132px;
      box-sizing: border-box;
    }
    .labels {
      display: flex;
      justify-content: space-between;
      font-weight: 700;
      font-size: 11px;
      color: #111;
      margin-bottom: 6px;
      padding: 0 2px;
    }
    .labels .minlab { flex: 1; text-align: left; }
    .labels .seclab { flex: 1; text-align: right; }
    .row {
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
      background: #1f1f1f;
      color: #f5f5f5;
      font-size: 20px;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
    .colon {
      font-size: 22px;
      font-weight: 700;
      color: #111;
      padding: 0 2px;
      user-select: none;
    }
  `;
}

function buildShadow(host: HTMLDivElement): ShadowRoot {
  const root = host.attachShadow({ mode: 'closed' });
  const style = document.createElement('style');
  style.textContent = shadowCss();
  const card = document.createElement('div');
  card.className = 'card';
  card.innerHTML = `
    <div class="labels"><span class="minlab">Min</span><span class="seclab">Sec</span></div>
    <div class="row" data-digits></div>
  `;
  root.append(style, card);
  return root;
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
  if (!shadowRoot || mode !== 'show') {
    return;
  }
  const row = shadowRoot.querySelector('[data-digits]');
  if (!row) {
    return;
  }
  const { minDigits, secTens, secOnes } = formatParts(Date.now());
  const parts: string[] = [];
  for (const ch of minDigits) {
    parts.push(`<span class="digit">${escapeHtml(ch)}</span>`);
  }
  parts.push('<span class="colon">:</span>');
  parts.push(`<span class="digit">${escapeHtml(secTens)}</span>`);
  parts.push(`<span class="digit">${escapeHtml(secOnes)}</span>`);
  row.innerHTML = parts.join('');
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

function showOverlay() {
  let host = document.getElementById(ROOT_ID) as HTMLDivElement | null;
  if (!host) {
    host = document.createElement('div');
    host.id = ROOT_ID;
    document.documentElement.appendChild(host);
    shadowRoot = buildShadow(host);
  } else {
    shadowRoot = host.shadowRoot ?? buildShadow(host);
  }
  mode = 'show';
  paintDigits();
  if (!tickHandle) {
    tickHandle = setInterval(() => paintDigits(), 500);
  }
}

async function syncFromBackground(): Promise<void> {
  try {
    const res = (await chrome.runtime.sendMessage({ type: PAGE_OVERLAY_GET_STATE })) as
      | { ok: true; show: false }
      | { ok: true; show: true; nextFireAt: number | undefined }
      | undefined;
    if (!res?.ok || !res.show) {
      nextFireAt = undefined;
      clearUi();
      return;
    }
    nextFireAt = res.nextFireAt;
    showOverlay();
    paintDigits();
  } catch {
    clearUi();
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
