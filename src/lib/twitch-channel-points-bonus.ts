/**
 * DOM heuristics to find and click Twitch channel points bonus claim controls.
 * Used when channel-points auto-click is armed on a TwitchFavs home tab (Backlog #12).
 */

const BONUS_BUTTON_SELECTORS = [
  'button[aria-label="Claim Bonus"]',
  '[data-test-selector="community-points-claim"]',
  '[data-a-target="chat-claim-bonus-button"]',
  '.community-points-summary button[aria-label*="Claim" i]',
] as const;

const CLAIM_LABEL_PATTERNS: RegExp[] = [
  /^claim\s+bonus$/i,
  /^claim\s+channel\s+points\s+bonus$/i,
  /^collect\s+bonus$/i,
];

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

export function isTwitchChannelPointsBonusClaimLabel(label: string): boolean {
  const normalized = normalizeLabel(label);
  if (!normalized) {
    return false;
  }
  return CLAIM_LABEL_PATTERNS.some((p) => p.test(normalized));
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

export function isTwitchChannelPointsBonusControlVisible(node: HTMLElement): boolean {
  if (node.disabled) {
    return false;
  }
  if (node.getAttribute('aria-disabled') === 'true') {
    return false;
  }
  if (node.style.display === 'none' || node.hidden) {
    return false;
  }
  if (!node.isConnected) {
    return false;
  }
  if (node.offsetParent !== null) {
    return true;
  }
  // jsdom reports offsetParent null for in-document controls; real hidden nodes use display:none.
  return true;
}

function findClaimByLabelScan(root: Document | ParentNode): HTMLElement | null {
  const nodes = root.querySelectorAll('button, [role="button"], a');
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes.item(i);
    if (!isClickable(node)) {
      continue;
    }
    if (!isTwitchChannelPointsBonusClaimLabel(buttonLabel(node))) {
      continue;
    }
    if (isTwitchChannelPointsBonusControlVisible(node)) {
      return node;
    }
  }
  return null;
}

/** Find a visible channel points bonus claim control when present. */
export function findTwitchChannelPointsBonusControl(
  root: Document | ParentNode
): HTMLElement | null {
  for (const selector of BONUS_BUTTON_SELECTORS) {
    const hits = root.querySelectorAll(selector);
    for (let i = 0; i < hits.length; i++) {
      const node = hits.item(i);
      if (!isClickable(node)) {
        continue;
      }
      if (isTwitchChannelPointsBonusControlVisible(node)) {
        return node;
      }
    }
  }
  return findClaimByLabelScan(root);
}

/** Click claim control if visible; returns whether a click was dispatched. */
export function tryClaimTwitchChannelPointsBonusInDocument(root: Document | ParentNode): boolean {
  const control = findTwitchChannelPointsBonusControl(root);
  if (!control) {
    return false;
  }
  control.click();
  return true;
}
