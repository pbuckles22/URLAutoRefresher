/**
 * Best-effort Twitch watch-surface layout helpers reused from TwitchEnhancements.
 * Scope here is intentionally small: one-shot theater activation + one-shot chat collapse.
 */

const THEATER_MODE_ARIA_LABEL_PATTERNS: RegExp[] = [
  /theatre\s*mode/i,
  /theater\s*mode/i,
  /alt\s*\+\s*t/i,
  /enter\s+theatre/i,
  /enter\s+theater/i,
];

const THEATER_MODE_APPEARS_ACTIVE_LABEL_PATTERNS: RegExp[] = [
  /default\s*view/i,
  /exit\s*theatre/i,
  /exit\s*theater/i,
];

const CHAT_COLLAPSE_ARIA_LABEL_PATTERNS: RegExp[] = [
  /collapse\s*chat/i,
  /hide\s*chat/i,
  /minimize\s*chat/i,
];

function getClickableAccessibilityLabel(node: HTMLElement): string {
  const aria = node.getAttribute('aria-label')?.trim();
  if (aria) {
    return aria;
  }
  return node.getAttribute('title')?.trim() ?? '';
}

function findClickableByAriaLabelPatterns(
  root: ParentNode,
  patterns: RegExp[]
): HTMLElement | null {
  const candidates = root.querySelectorAll<HTMLElement>(
    'button, [role="button"], a[role="button"]'
  );
  for (let i = 0; i < candidates.length; i++) {
    const node = candidates.item(i);
    const label = getClickableAccessibilityLabel(node);
    if (!label) {
      continue;
    }
    if (patterns.some((p) => p.test(label))) {
      return node;
    }
  }
  return null;
}

function findClickableByAriaLabelPatternsDeep(
  root: Document | Element | ShadowRoot,
  patterns: RegExp[]
): HTMLElement | null {
  const hit = findClickableByAriaLabelPatterns(root as ParentNode, patterns);
  if (hit) {
    return hit;
  }

  const nodes = root.querySelectorAll('*');
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes.item(i);
    if (el.shadowRoot) {
      const inner = findClickableByAriaLabelPatternsDeep(el.shadowRoot, patterns);
      if (inner) {
        return inner;
      }
    }
  }
  return null;
}

function isTheaterToggleAlreadyActive(button: HTMLElement): boolean {
  return button.getAttribute('aria-pressed') === 'true';
}

function isTheaterModeLikelyActive(root: Document | HTMLElement): boolean {
  const activeLabel = findClickableByAriaLabelPatternsDeep(
    root,
    THEATER_MODE_APPEARS_ACTIVE_LABEL_PATTERNS
  );
  if (activeLabel) {
    return true;
  }
  const enter = findClickableByAriaLabelPatternsDeep(root, THEATER_MODE_ARIA_LABEL_PATTERNS);
  return enter !== null && isTheaterToggleAlreadyActive(enter);
}

function tryActivateTheaterMode(root: Document | HTMLElement): boolean {
  if (isTheaterModeLikelyActive(root)) {
    return false;
  }
  const btn = findClickableByAriaLabelPatternsDeep(root, THEATER_MODE_ARIA_LABEL_PATTERNS);
  if (!btn || isTheaterToggleAlreadyActive(btn)) {
    return false;
  }
  btn.click();
  return true;
}

function tryCollapseChatViaNativeControl(root: Document | HTMLElement): boolean {
  const btn = findClickableByAriaLabelPatternsDeep(root, CHAT_COLLAPSE_ARIA_LABEL_PATTERNS);
  if (!btn) {
    return false;
  }
  btn.click();
  return true;
}

export type TwitchWatchLayoutState = {
  theaterClickDone: boolean;
  chatCollapseDone: boolean;
};

export function createTwitchWatchLayoutState(): TwitchWatchLayoutState {
  return { theaterClickDone: false, chatCollapseDone: false };
}

export function applyTwitchWatchLayoutEnhancements(
  root: Document | HTMLElement,
  state: TwitchWatchLayoutState
): void {
  if (!state.theaterClickDone) {
    if (isTheaterModeLikelyActive(root)) {
      state.theaterClickDone = true;
    } else if (tryActivateTheaterMode(root)) {
      state.theaterClickDone = true;
    }
  }

  if (!state.chatCollapseDone && tryCollapseChatViaNativeControl(root)) {
    state.chatCollapseDone = true;
  }
}

export function installDebouncedTwitchWatchLayoutRunner(
  win: Window,
  run: () => void,
  debounceMs = 150,
  pollIntervalMs = 500,
  pollMaxTicks = 30
): () => void {
  if (!win.document.body) {
    run();
    return () => {
      /* no-op when body is unavailable */
    };
  }
  let disposed = false;
  let debounceTimer: number | undefined;
  let pollTicks = 0;
  let pollTimer: number | undefined;

  const schedule = () => {
    if (debounceTimer !== undefined) {
      win.clearTimeout(debounceTimer);
    }
    debounceTimer = win.setTimeout(() => {
      debounceTimer = undefined;
      if (!disposed) {
        run();
      }
    }, debounceMs);
  };

  run();

  const obs = new MutationObserver(() => {
    if (!disposed) {
      schedule();
    }
  });
  obs.observe(win.document.body, { childList: true, subtree: true, attributes: true });

  if (pollIntervalMs > 0 && pollMaxTicks > 0) {
    pollTimer = win.setInterval(() => {
      if (disposed) {
        return;
      }
      pollTicks += 1;
      if (pollTicks > pollMaxTicks) {
        if (pollTimer !== undefined) {
          win.clearInterval(pollTimer);
          pollTimer = undefined;
        }
        return;
      }
      run();
    }, pollIntervalMs);
  }

  return () => {
    disposed = true;
    obs.disconnect();
    if (debounceTimer !== undefined) {
      win.clearTimeout(debounceTimer);
      debounceTimer = undefined;
    }
    if (pollTimer !== undefined) {
      win.clearInterval(pollTimer);
      pollTimer = undefined;
    }
  };
}
