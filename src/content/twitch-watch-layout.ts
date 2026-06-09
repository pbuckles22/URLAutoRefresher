/**
 * Best-effort Twitch watch-surface layout helpers reused from TwitchEnhancements.
 * Live sessions: theater + collapsed chat while live; user overrides stick until offline.
 * Offline channel view: dismiss offline interstitial via Chat, then theater + collapsed chat.
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

const CHAT_EXPAND_ARIA_LABEL_PATTERNS: RegExp[] = [/expand\s*chat/i, /show\s*chat/i];

/** Offline channel interstitial — user-facing control label is often "Chat". */
const OFFLINE_CHANNEL_NAV_PATTERNS: RegExp[] = [/^chat$/i, /visit\s*chat/i, /open\s*chat/i];

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

export function tryNavigateOfflineViaChatControl(root: Document | HTMLElement): boolean {
  const btn = findClickableByAriaLabelPatternsDeep(root, OFFLINE_CHANNEL_NAV_PATTERNS);
  if (!btn) {
    return false;
  }
  btn.click();
  return true;
}

export type TwitchWatchLayoutState = {
  theaterClickDone: boolean;
  chatCollapseDone: boolean;
  userOverrodeTheater: boolean;
  userOverrodeChat: boolean;
  sessionActive: boolean;
  offlineLayoutPassDone: boolean;
};

export function createTwitchWatchLayoutState(): TwitchWatchLayoutState {
  return {
    theaterClickDone: false,
    chatCollapseDone: false,
    userOverrodeTheater: false,
    userOverrodeChat: false,
    sessionActive: false,
    offlineLayoutPassDone: false,
  };
}

export function resetTwitchWatchLayoutSession(state: TwitchWatchLayoutState): void {
  state.theaterClickDone = false;
  state.chatCollapseDone = false;
  state.userOverrodeTheater = false;
  state.userOverrodeChat = false;
  state.sessionActive = false;
  state.offlineLayoutPassDone = false;
}

export function beginTwitchLiveWatchSession(state: TwitchWatchLayoutState): void {
  if (state.sessionActive) {
    return;
  }
  state.sessionActive = true;
  state.theaterClickDone = false;
  state.chatCollapseDone = false;
  state.userOverrodeTheater = false;
  state.userOverrodeChat = false;
  state.offlineLayoutPassDone = false;
}

type LayoutApplyOptions = {
  /** Apply theater + chat collapse even when not in a live session (offline channel view). */
  offlineChannel?: boolean;
};

export function applyTwitchWatchLayoutEnhancements(
  root: Document | HTMLElement,
  state: TwitchWatchLayoutState,
  options: LayoutApplyOptions = {}
): void {
  const offlineChannel = options.offlineChannel === true;
  if (!state.sessionActive && !offlineChannel) {
    return;
  }

  if (!state.userOverrodeTheater) {
    if (isTheaterModeLikelyActive(root)) {
      state.theaterClickDone = true;
    } else if (tryActivateTheaterMode(root)) {
      state.theaterClickDone = true;
    }
  }

  if (!state.userOverrodeChat && tryCollapseChatViaNativeControl(root)) {
    state.chatCollapseDone = true;
  }
}

export function handleTwitchOfflineChannelView(
  root: Document | HTMLElement,
  state: TwitchWatchLayoutState
): void {
  resetTwitchWatchLayoutSession(state);
  if (tryNavigateOfflineViaChatControl(root)) {
    state.offlineLayoutPassDone = false;
    return;
  }
  if (state.offlineLayoutPassDone) {
    return;
  }
  applyTwitchWatchLayoutEnhancements(root, state, { offlineChannel: true });
  if (state.theaterClickDone && state.chatCollapseDone) {
    state.offlineLayoutPassDone = true;
  }
}

const overrideRoots = new WeakSet<Document | HTMLElement>();

export function installTwitchWatchLayoutOverrideListeners(
  win: Window,
  root: Document | HTMLElement,
  state: TwitchWatchLayoutState
): void {
  if (overrideRoots.has(root)) {
    return;
  }
  overrideRoots.add(root);
  root.addEventListener(
    'click',
    (e) => {
      if (!state.sessionActive) {
        return;
      }
      const t = e.target as HTMLElement;
      const labelSource = t.closest<HTMLElement>('button, [role="button"], a[role="button"]');
      if (!labelSource) {
        return;
      }
      const label = getClickableAccessibilityLabel(labelSource);
      if (!label) {
        return;
      }
      if (THEATER_MODE_APPEARS_ACTIVE_LABEL_PATTERNS.some((p) => p.test(label))) {
        state.userOverrodeTheater = true;
        state.theaterClickDone = false;
      } else if (CHAT_EXPAND_ARIA_LABEL_PATTERNS.some((p) => p.test(label))) {
        state.userOverrodeChat = true;
        state.chatCollapseDone = false;
      }
    },
    true
  );
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
