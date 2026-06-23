/** Shadow DOM styles for the page overlay card (extracted for eslint max-lines). */
export const PAGE_OVERLAY_SHADOW_CSS = `
    :host {
      all: initial;
      box-sizing: border-box;
      display: block !important;
      position: fixed !important;
      z-index: 2147483647 !important;
      pointer-events: none;
      font-family: system-ui, "Segoe UI", Roboto, sans-serif;
    }
    .card {
      position: relative;
      pointer-events: auto;
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
      display: inline-flex;
      align-items: center;
      gap: 4px;
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
    .m-badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .m-badge--live .m-badge-dot {
      background: #137333;
    }
    .m-badge--offline .m-badge-dot {
      background: #c5221f;
    }
    .m-badge-run {
      font-size: 11px;
      line-height: 1;
      font-weight: 700;
      opacity: 0.9;
      min-width: 0.75em;
      text-align: center;
    }
    .minimize-hit {
      position: static;
      flex-shrink: 0;
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
    .position-bar {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      z-index: 3;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 2px;
      padding: 2px 4px 0;
      min-height: 18px;
    }
    .position-bar--with-body {
      position: relative;
      padding: 0 0 4px;
      min-height: 0;
    }
    .drag-handle {
      margin-right: auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 16px;
      border: none;
      background: transparent;
      color: #9aa0a6;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: -2px;
      line-height: 1;
      cursor: grab;
      padding: 0;
      font-family: inherit;
      user-select: none;
      touch-action: none;
    }
    .drag-handle:active {
      cursor: grabbing;
    }
    .drag-handle:hover {
      color: #5f6368;
    }
    .drag-handle:focus-visible {
      outline: 2px solid #1a73e8;
      outline-offset: 2px;
      border-radius: 2px;
    }
    .snap-hit {
      border: none;
      background: transparent;
      color: #5f6368;
      font-size: 13px;
      font-weight: 700;
      line-height: 1;
      cursor: pointer;
      padding: 0 4px;
      font-family: inherit;
    }
    .snap-hit:hover {
      color: #111;
    }
    .card-body {
      position: relative;
    }
    .card-body--has-minimize {
      padding-top: 0;
      padding-right: 0;
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
    .debug-stream-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 8px;
    }
    .debug-stream-toggle {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 9px;
      font-weight: 600;
      color: #202124;
      cursor: pointer;
      user-select: none;
    }
    .debug-stream-toggle input {
      margin: 0;
      cursor: pointer;
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
