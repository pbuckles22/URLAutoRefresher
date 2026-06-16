/**
 * DOM heuristics to decline an incoming Twitch raid (Leave / Leave Raid / Cancel).
 * Used by twitch-live-bridge when raid guard is armed on a TwitchFavs home tab.
 *
 * Real Twitch (2026): chat notice "X is raiding Y with N raiders" + button labeled "Leave"
 * (not always data-test-selector="raid-banner").
 */

const RAID_BANNER_SELECTORS = [
  '[data-test-selector="raid-banner"]',
  '[data-a-target="raid-banner"]',
  '[data-a-target="raid-notification"]',
] as const;

const RAID_BANNER_CONTAINER_SELECTORS = [
  '.chat-room__notifications',
  '[data-a-target="chat-room-notifications"]',
  '[data-a-target="top-chat-notifications"]',
] as const;

const DECLINE_LABEL_PATTERNS: RegExp[] = [
  /^leave\s*raid$/i,
  /^leave$/i,
  /^cancel$/i,
  /^exit$/i,
  /^decline$/i,
  /^don'?t\s*go$/i,
  /^stay$/i,
  /^opt\s*out$/i,
  /^not\s*now$/i,
];

/** Raid-in-progress copy shown above the Leave control in chat notifications. */
const RAID_NOTICE_TEXT = /\bis raiding\b/i;

function normalizeLabel(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function buttonLabel(node: HTMLElement): string {
  const aria = node.getAttribute('aria-label')?.trim();
  if (aria) {
    return normalizeLabel(aria);
  }
  return normalizeLabel(node.textContent ?? '');
}

export function isTwitchRaidDeclineLabel(label: string): boolean {
  const normalized = normalizeLabel(label);
  if (!normalized) {
    return false;
  }
  return DECLINE_LABEL_PATTERNS.some((p) => p.test(normalized));
}

export function isTwitchRaidNoticeText(text: string): boolean {
  return RAID_NOTICE_TEXT.test(normalizeLabel(text));
}

function isClickable(node: Element): node is HTMLElement {
  if (!(node instanceof HTMLElement)) {
    return false;
  }
  if (node.matches('button, [role="button"], a')) {
    return true;
  }
  return node.getAttribute('role') === 'button';
}

function findDeclineInContainer(container: ParentNode): HTMLElement | null {
  const nodes = container.querySelectorAll('button, [role="button"], a');
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes.item(i);
    if (!isClickable(node)) {
      continue;
    }
    if (isTwitchRaidDeclineLabel(buttonLabel(node))) {
      return node;
    }
  }
  return null;
}

function findRaidBannerRootBySelector(root: Document | ParentNode): Element | null {
  for (const selector of RAID_BANNER_SELECTORS) {
    const hit = root.querySelector(selector);
    if (hit) {
      return hit;
    }
  }
  for (const containerSel of RAID_BANNER_CONTAINER_SELECTORS) {
    const container = root.querySelector(containerSel);
    if (!container) {
      continue;
    }
    for (const bannerSel of RAID_BANNER_SELECTORS) {
      const hit = container.querySelector(bannerSel);
      if (hit) {
        return hit;
      }
    }
  }
  return null;
}

/** Leave/Cancel control only when an ancestor subtree includes raid-notice copy. */
function findDeclineNearRaidNotice(root: Document | ParentNode): HTMLElement | null {
  for (const containerSel of RAID_BANNER_CONTAINER_SELECTORS) {
    const containers = root.querySelectorAll(containerSel);
    for (let c = 0; c < containers.length; c++) {
      const container = containers.item(c);
      const btn = findDeclineInRaidNoticeSubtree(container);
      if (btn) {
        return btn;
      }
    }
  }

  const buttons = root.querySelectorAll('button, [role="button"], a');
  for (let i = 0; i < buttons.length; i++) {
    const node = buttons.item(i);
    if (!isClickable(node) || !isTwitchRaidDeclineLabel(buttonLabel(node))) {
      continue;
    }
    let anc: Element | null = node.parentElement;
    for (let depth = 0; depth < 14 && anc; depth++) {
      const text = anc.textContent ?? '';
      if (isTwitchRaidNoticeText(text)) {
        return node;
      }
      anc = anc.parentElement;
    }
  }
  return null;
}

function findDeclineInRaidNoticeSubtree(container: Element): HTMLElement | null {
  const nodes = container.querySelectorAll('*');
  for (let i = 0; i < nodes.length; i++) {
    const el = nodes.item(i);
    const text = el.textContent ?? '';
    if (!isTwitchRaidNoticeText(text)) {
      continue;
    }
    const btn = findDeclineInContainer(el);
    if (btn) {
      return btn;
    }
  }
  return null;
}

/** Find Twitch raid decline control when raid banner or chat notice is visible. */
export function findTwitchRaidDeclineControl(root: Document | ParentNode): HTMLElement | null {
  const banner = findRaidBannerRootBySelector(root);
  if (banner) {
    const inBanner = findDeclineInContainer(banner);
    if (inBanner) {
      return inBanner;
    }
  }
  return findDeclineNearRaidNotice(root);
}

/** Click decline if raid UI is present; returns whether a click was dispatched. */
export function tryDeclineTwitchRaidInDocument(root: Document | ParentNode): boolean {
  const control = findTwitchRaidDeclineControl(root);
  if (!control) {
    return false;
  }
  control.click();
  return true;
}
