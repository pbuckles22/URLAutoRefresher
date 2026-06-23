/**
 * Best-effort Twitch watch-surface layout keyed to live/offline:
 * - **Live:** theater mode only — chat stays open for hanging out in chat.
 * - **Offline:** theater mode + collapsed chat — player pushed aside while waiting to go live.
 * Offline banner pages: click the channel sub-nav "Chat" tab to reach the watch player.
 * User overrides to theater/chat stick until live/offline transition or page refresh.
 */

const THEATER_ENTER_SELECTORS = [
  'button[data-a-target="player-theatre-mode-button"]',
  'button[data-a-target="player-theater-mode-button"]',
] as const;

const THEATER_ACTIVE_SELECTORS = ['button[data-a-target="player-default-view-button"]'] as const;

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

const CHAT_EXPAND_SELECTORS = [
  'button[data-a-target="right-sidebar__expand-button"]',
  'button[data-a-target="player-chat-toggle"]',
] as const;

function isChatExpandClick(node: HTMLElement): boolean {
  for (const selector of CHAT_EXPAND_SELECTORS) {
    if (node.closest(selector)) {
      return true;
    }
  }
  const label = getClickableAccessibilityLabel(node);
  return label !== '' && CHAT_EXPAND_ARIA_LABEL_PATTERNS.some((p) => p.test(label));
}

function isChatCollapseClick(node: HTMLElement): boolean {
  const label = getClickableAccessibilityLabel(node);
  return label !== '' && CHAT_COLLAPSE_ARIA_LABEL_PATTERNS.some((p) => p.test(label));
}

/** Offline channel home — sub-nav "Chat" tab (often shown as "↗ Chat"). */
const OFFLINE_CHANNEL_CHAT_SELECTORS = [
  'a[data-a-target="channel-chat-link"]',
  'a[data-a-target="chat-channel-tab"]',
  'a[data-a-target="channel-chat-tab"]',
  'a[data-a-target="channel-chat-tab-link"]',
  'a[data-a-target="chat-tab"]',
  '[data-a-target="channel-chat-link"]',
  '[role="tab"][data-a-target*="chat"]',
] as const;

/** Offline banner pages — click targets that reveal the watch player on the channel home. */
const OFFLINE_WATCH_ENTRY_SELECTORS = [
  '[data-a-target="channel-home-header-offline"]',
  '[data-a-target="channel-home-header-live"]',
  '[data-a-target="channel-offline-image"]',
  '[data-a-target="video-tower-card__preview-link"]',
  '[data-a-target="video-tower-card__preview"]',
  '[data-a-target="video-tower-card"]',
  '[data-a-target="channel-home-header"]',
] as const;

const OFFLINE_CHANNEL_NAV_PATTERNS: RegExp[] = [
  /^[\s↗→»]*chat[\s↗→»]*$/i,
  /^chat$/i,
  /visit\s*chat/i,
  /open\s*chat/i,
];

const WATCH_SURFACE_SELECTORS = [
  'button[data-a-target="player-theatre-mode-button"]',
  'button[data-a-target="player-theater-mode-button"]',
  '[data-a-target="video-player"]',
  '[data-a-target="player-overlay-video"]',
] as const;

function getClickableAccessibilityLabel(node: HTMLElement): string {
  const aria = node.getAttribute('aria-label')?.trim();
  if (aria) {
    return aria;
  }
  return node.getAttribute('title')?.trim() ?? '';
}

function querySelectorDeep(
  root: Document | Element | ShadowRoot,
  selector: string
): HTMLElement | null {
  const direct = root.querySelector(selector);
  if (direct instanceof HTMLElement) {
    return direct;
  }
  const nodes = root.querySelectorAll('*');
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes.item(i);
    if (el.shadowRoot) {
      const inner = querySelectorDeep(el.shadowRoot, selector);
      if (inner) {
        return inner;
      }
    }
  }
  return null;
}

function queryAnySelectorDeep(
  root: Document | Element | ShadowRoot,
  selectors: readonly string[]
): HTMLElement | null {
  for (const selector of selectors) {
    const hit = querySelectorDeep(root, selector);
    if (hit) {
      return hit;
    }
  }
  return null;
}

function normalizeVisibleText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function isPopoutOrDetachedChatNavigation(el: HTMLElement): boolean {
  if (el instanceof HTMLAnchorElement) {
    const href = el.getAttribute('href')?.trim() ?? '';
    if (el.target === '_blank') {
      return true;
    }
    if (!href) {
      return false;
    }
    try {
      const path = new URL(href, 'https://www.twitch.tv').pathname;
      if (/^\/popout\//i.test(path)) {
        return true;
      }
    } catch {
      return false;
    }
  }
  return false;
}

function isOfflineChatNavCandidate(el: HTMLElement): boolean {
  if (isPopoutOrDetachedChatNavigation(el)) {
    return false;
  }
  const text = normalizeVisibleText(el.textContent ?? '');
  if (/^[\s↗→»]*chat[\s↗→»]*$/i.test(text) || /^chat$/i.test(text)) {
    return true;
  }
  const target = el.getAttribute('data-a-target') ?? '';
  return /chat/i.test(target) && /channel|tab|link/i.test(target);
}

const CHANNEL_SUBNAV_TAB_PATTERN = /^(home|about|clips|videos|schedule|chat|recent\s+broadcast)$/i;

function queryFirstSafeSelectorDeep(
  root: Document | Element | ShadowRoot,
  selectors: readonly string[]
): HTMLElement | null {
  for (const selector of selectors) {
    const hit = querySelectorDeep(root, selector);
    if (hit && !isPopoutOrDetachedChatNavigation(hit)) {
      return hit;
    }
  }
  return null;
}

function anchorLooksLikeChannelSubnavChat(link: HTMLAnchorElement): boolean {
  if (isPopoutOrDetachedChatNavigation(link)) {
    return false;
  }
  const text = normalizeVisibleText(link.textContent ?? '');
  if (/^chat$/i.test(text) || /^[\s↗→»]*chat[\s↗→»]*$/i.test(text)) {
    return true;
  }
  const aria = link.getAttribute('aria-label')?.trim() ?? '';
  if (/^chat$/i.test(aria)) {
    return true;
  }
  try {
    const path = new URL(link.href, 'https://www.twitch.tv').pathname;
    return /^\/[\w]+\/chat\/?$/i.test(path);
  } catch {
    return false;
  }
}

function isLikelyChannelSubnavContainer(el: Element): boolean {
  const links = el.querySelectorAll<HTMLAnchorElement>('a[href]');
  if (links.length < 3) {
    return false;
  }
  let homeSeen = false;
  let chatSeen = false;
  for (let i = 0; i < links.length; i++) {
    const text = normalizeVisibleText(links.item(i)!.textContent ?? '');
    if (/^home$/i.test(text)) {
      homeSeen = true;
    }
    if (/^chat$/i.test(text)) {
      chatSeen = true;
    }
  }
  if (homeSeen && chatSeen) {
    return true;
  }
  let tabMatches = 0;
  for (let i = 0; i < links.length; i++) {
    const text = normalizeVisibleText(links.item(i)!.textContent ?? '');
    if (CHANNEL_SUBNAV_TAB_PATTERN.test(text)) {
      tabMatches += 1;
    }
  }
  return tabMatches >= 3;
}

function findChatLinkInSubnav(scope: Element | ShadowRoot): HTMLElement | null {
  const links = scope.querySelectorAll<HTMLAnchorElement>('a[href]');
  for (let i = 0; i < links.length; i++) {
    const link = links.item(i)!;
    if (anchorLooksLikeChannelSubnavChat(link)) {
      return link;
    }
  }
  return null;
}

/** Home / About / … / Chat row on offline channel home — opens the watch player in-page. */
function findChannelSubnavChatLinkDeep(root: Document | Element | ShadowRoot): HTMLElement | null {
  const scanScope = (scope: Document | Element | ShadowRoot): HTMLElement | null => {
    if (scope instanceof Element && isLikelyChannelSubnavContainer(scope)) {
      const chat = findChatLinkInSubnav(scope);
      if (chat) {
        return chat;
      }
    }
    const nodes = scope.querySelectorAll('*');
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes.item(i)!;
      if (isLikelyChannelSubnavContainer(el)) {
        const chat = findChatLinkInSubnav(el);
        if (chat) {
          return chat;
        }
      }
      if (el.shadowRoot) {
        const inner = scanScope(el.shadowRoot);
        if (inner) {
          return inner;
        }
      }
    }
    return null;
  };
  return scanScope(root);
}

function clickLayoutControl(el: HTMLElement): void {
  el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
  el.click();
}

function findOfflineChatNavLinkDeep(root: Document | Element | ShadowRoot): HTMLElement | null {
  const subnavChat = findChannelSubnavChatLinkDeep(root);
  if (subnavChat) {
    return subnavChat;
  }

  const byTarget = queryFirstSafeSelectorDeep(root, OFFLINE_CHANNEL_CHAT_SELECTORS);
  if (byTarget) {
    return byTarget;
  }

  const byAria = findClickableByAriaLabelPatternsDeep(root, OFFLINE_CHANNEL_NAV_PATTERNS);
  if (byAria && !isPopoutOrDetachedChatNavigation(byAria)) {
    return byAria;
  }

  const walkCandidates = (scope: Document | Element | ShadowRoot): HTMLElement | null => {
    const candidates = scope.querySelectorAll<HTMLElement>(
      'a[href], button, [role="tab"], [role="button"]'
    );
    for (let i = 0; i < candidates.length; i++) {
      const el = candidates.item(i);
      if (!isOfflineChatNavCandidate(el)) {
        continue;
      }
      return el;
    }
    const nodes = scope.querySelectorAll('*');
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes.item(i);
      if (el.shadowRoot) {
        const inner = walkCandidates(el.shadowRoot);
        if (inner) {
          return inner;
        }
      }
    }
    return null;
  };

  return walkCandidates(root);
}

export function isOnTwitchChannelWatchSurface(root: Document | HTMLElement): boolean {
  return queryAnySelectorDeep(root, WATCH_SURFACE_SELECTORS) !== null;
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
  if (queryAnySelectorDeep(root, THEATER_ACTIVE_SELECTORS)) {
    return true;
  }
  const activeLabel = findClickableByAriaLabelPatternsDeep(
    root,
    THEATER_MODE_APPEARS_ACTIVE_LABEL_PATTERNS
  );
  if (activeLabel) {
    return true;
  }
  const enter = findTheaterEnterButton(root);
  return enter !== null && isTheaterToggleAlreadyActive(enter);
}

function findTheaterEnterButton(root: Document | HTMLElement): HTMLElement | null {
  const byTarget = queryAnySelectorDeep(root, THEATER_ENTER_SELECTORS);
  if (byTarget) {
    return byTarget;
  }
  return findClickableByAriaLabelPatternsDeep(root, THEATER_MODE_ARIA_LABEL_PATTERNS);
}

function tryActivateTheaterMode(root: Document | HTMLElement): boolean {
  if (isTheaterModeLikelyActive(root)) {
    return false;
  }
  const btn = findTheaterEnterButton(root);
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

function findChatExpandControl(root: Document | HTMLElement): HTMLElement | null {
  for (const selector of CHAT_EXPAND_SELECTORS) {
    const hit = querySelectorDeep(root, selector);
    if (hit) {
      return hit;
    }
  }
  return findClickableByAriaLabelPatternsDeep(root, CHAT_EXPAND_ARIA_LABEL_PATTERNS);
}

function tryExpandChatViaNativeControl(root: Document | HTMLElement): boolean {
  const btn = findChatExpandControl(root);
  if (!btn) {
    return false;
  }
  btn.click();
  return true;
}

export function tryNavigateOfflineViaChatControl(root: Document | HTMLElement): boolean {
  if (isOnTwitchChannelWatchSurface(root)) {
    return false;
  }
  const link = findOfflineChatNavLinkDeep(root);
  if (!link) {
    return false;
  }
  clickLayoutControl(link);
  return true;
}

/** Banner-style offline home — click offline preview/header to reveal the watch player. */
export function tryEnterOfflineWatchSurface(root: Document | HTMLElement): boolean {
  if (isOnTwitchChannelWatchSurface(root)) {
    return false;
  }
  const hit = queryAnySelectorDeep(root, OFFLINE_WATCH_ENTRY_SELECTORS);
  if (!hit) {
    return false;
  }
  clickLayoutControl(hit);
  return true;
}

export type TwitchWatchLayoutState = {
  theaterClickDone: boolean;
  chatCollapseDone: boolean;
  userOverrodeTheater: boolean;
  userOverrodeChat: boolean;
  /** Live session — overrides reset when stream goes offline. */
  sessionActive: boolean;
  /** Offline interstitial Chat control already clicked (or not present). */
  offlineNavDone: boolean;
  /** Offline sub-nav Chat tab clicked once (opens watch player on banner-style home). */
  offlineChatNavClicked: boolean;
  /** Live session — expand collapsed chat once after offline→live transition. */
  ensureChatOpenForLive: boolean;
  /** Theater/chat layout has been applied (live or offline watch surface). */
  watchLayoutEngaged: boolean;
};

export function createTwitchWatchLayoutState(): TwitchWatchLayoutState {
  return {
    theaterClickDone: false,
    chatCollapseDone: false,
    userOverrodeTheater: false,
    userOverrodeChat: false,
    sessionActive: false,
    offlineNavDone: false,
    offlineChatNavClicked: false,
    ensureChatOpenForLive: false,
    watchLayoutEngaged: false,
  };
}

export function resetTwitchWatchLayoutSession(state: TwitchWatchLayoutState): void {
  state.theaterClickDone = false;
  state.chatCollapseDone = false;
  state.sessionActive = false;
  state.offlineNavDone = false;
}

/** Full automation reset when watch-layout pref is re-enabled without navigation. */
export function resetTwitchWatchLayoutAutomationState(state: TwitchWatchLayoutState): void {
  state.theaterClickDone = false;
  state.chatCollapseDone = false;
  state.userOverrodeTheater = false;
  state.userOverrodeChat = false;
  state.sessionActive = false;
  state.offlineNavDone = false;
  state.offlineChatNavClicked = false;
  state.ensureChatOpenForLive = false;
  state.watchLayoutEngaged = false;
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
  state.offlineNavDone = false;
  state.ensureChatOpenForLive = true;
}

function applyTheaterMode(root: Document | HTMLElement, state: TwitchWatchLayoutState): void {
  if (state.userOverrodeTheater) {
    return;
  }
  if (isTheaterModeLikelyActive(root)) {
    state.theaterClickDone = true;
  } else if (tryActivateTheaterMode(root)) {
    state.theaterClickDone = true;
  }
}

/** Live: theater only; keep chat open (expand if still collapsed from offline). */
function applyLiveWatchLayout(root: Document | HTMLElement, state: TwitchWatchLayoutState): void {
  state.watchLayoutEngaged = true;
  applyTheaterMode(root, state);

  if (state.userOverrodeChat || !state.ensureChatOpenForLive) {
    return;
  }
  if (tryExpandChatViaNativeControl(root)) {
    state.ensureChatOpenForLive = false;
    return;
  }
  if (findChatExpandControl(root) === null) {
    state.ensureChatOpenForLive = false;
  }
}

/** Offline: theater + collapsed chat — player to the side while waiting to go live. */
function applyOfflineWatchLayout(
  root: Document | HTMLElement,
  state: TwitchWatchLayoutState
): void {
  state.watchLayoutEngaged = true;
  applyTheaterMode(root, state);

  if (!state.userOverrodeChat && tryCollapseChatViaNativeControl(root)) {
    state.chatCollapseDone = true;
  }
}

/**
 * Apply watch layout for a channel page. Live = theater + open chat; offline = theater + collapsed chat.
 */
export function runTwitchChannelWatchLayout(
  root: Document | HTMLElement,
  state: TwitchWatchLayoutState,
  streamLive: boolean,
  layoutEnabled = true
): void {
  if (!layoutEnabled) {
    return;
  }
  if (streamLive) {
    if (!state.sessionActive) {
      beginTwitchLiveWatchSession(state);
    }
    applyLiveWatchLayout(root, state);
    return;
  }

  if (state.sessionActive) {
    resetTwitchWatchLayoutSession(state);
  }
  state.ensureChatOpenForLive = false;

  if (!state.offlineNavDone) {
    if (!isOnTwitchChannelWatchSurface(root)) {
      if (!state.offlineChatNavClicked && tryNavigateOfflineViaChatControl(root)) {
        state.offlineChatNavClicked = true;
        state.theaterClickDone = false;
        state.chatCollapseDone = false;
      }
      return;
    }
    state.offlineNavDone = true;
  }

  applyOfflineWatchLayout(root, state);
}

/** @deprecated Use runTwitchChannelWatchLayout */
export function applyTwitchWatchLayoutEnhancements(
  root: Document | HTMLElement,
  state: TwitchWatchLayoutState
): void {
  runTwitchChannelWatchLayout(root, state, state.sessionActive);
}

/** @deprecated Use runTwitchChannelWatchLayout */
export function handleTwitchOfflineChannelView(
  root: Document | HTMLElement,
  state: TwitchWatchLayoutState
): void {
  runTwitchChannelWatchLayout(root, state, false);
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
      if (!state.watchLayoutEngaged) {
        return;
      }
      const t = e.target as HTMLElement;
      const labelSource = t.closest<HTMLElement>('button, [role="button"], a[role="button"]');
      if (!labelSource) {
        return;
      }
      if (labelSource.closest('[data-a-target="player-default-view-button"]')) {
        state.userOverrodeTheater = true;
        state.theaterClickDone = false;
        return;
      }
      const label = getClickableAccessibilityLabel(labelSource);
      if (label && THEATER_MODE_APPEARS_ACTIVE_LABEL_PATTERNS.some((p) => p.test(label))) {
        state.userOverrodeTheater = true;
        state.theaterClickDone = false;
        return;
      }
      if (isChatExpandClick(labelSource)) {
        state.userOverrodeChat = true;
        state.chatCollapseDone = false;
        state.ensureChatOpenForLive = false;
        return;
      }
      if (isChatCollapseClick(labelSource)) {
        state.userOverrodeChat = true;
        state.chatCollapseDone = false;
        state.ensureChatOpenForLive = false;
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
  pollMaxTicks = 180
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
