/**
 * Epic 11.6 — transient top-right OSD when precision volume shortcuts fire (PVC.7).
 * Separate shadow host from the refresh overlay so both can coexist.
 */

const OSD_ROOT_ID = 'url-auto-refresher-precision-volume-osd';
/** Full-opacity dwell before fade (ms). */
const VISIBLE_MS = 2000;
const FADE_MS = 280;

let hideTimer: ReturnType<typeof setTimeout> | undefined;
let fadeTimer: ReturnType<typeof setTimeout> | undefined;

function clearTimers(): void {
  clearTimeout(hideTimer);
  clearTimeout(fadeTimer);
  hideTimer = undefined;
  fadeTimer = undefined;
}

function removeRoot(): void {
  clearTimers();
  document.getElementById(OSD_ROOT_ID)?.remove();
}

function shadowMarkup(): string {
  return `
    <style>
      :host {
        all: initial;
        position: fixed;
        top: 12px;
        right: 12px;
        z-index: 2147483647;
        font-family: system-ui, "Segoe UI", Roboto, sans-serif;
        pointer-events: none;
      }
      .pill {
        box-sizing: border-box;
        margin: 0;
        max-width: min(320px, calc(100vw - 24px));
        padding: 8px 12px;
        border-radius: 10px;
        background: rgba(28, 28, 30, 0.92);
        color: #f2f2f7;
        font-size: 14px;
        font-weight: 600;
        line-height: 1.25;
        letter-spacing: 0.02em;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);
        opacity: 1;
        transition: opacity ${FADE_MS}ms ease-out;
      }
      :host(.fade) .pill {
        opacity: 0;
      }
    </style>
    <div class="pill" part="label"></div>
  `;
}

/**
 * Shows a non-blocking corner toast; repeated calls reset the hide timer.
 */
export function showPrecisionVolumeOsd(line: string): void {
  if (typeof document === 'undefined') {
    return;
  }
  if (!chrome.runtime?.id) {
    return;
  }

  clearTimers();

  let host = document.getElementById(OSD_ROOT_ID);
  if (!host) {
    host = document.createElement('div');
    host.id = OSD_ROOT_ID;
    host.setAttribute('data-precision-volume-osd', '');
    document.documentElement.appendChild(host);
    host.attachShadow({ mode: 'open' }).innerHTML = shadowMarkup();
  }

  host.classList.remove('fade');
  const sr = host.shadowRoot;
  const pill = sr?.querySelector('.pill');
  if (pill) {
    pill.textContent = line;
  }

  hideTimer = setTimeout(() => {
    hideTimer = undefined;
    if (!chrome.runtime?.id) {
      removeRoot();
      return;
    }
    const h = document.getElementById(OSD_ROOT_ID);
    if (!h) {
      return;
    }
    h.classList.add('fade');
    fadeTimer = setTimeout(() => {
      fadeTimer = undefined;
      if (!chrome.runtime?.id) {
        removeRoot();
        return;
      }
      const still = document.getElementById(OSD_ROOT_ID);
      if (still?.classList.contains('fade')) {
        still.remove();
      }
    }, FADE_MS);
  }, VISIBLE_MS);
}
