/**
 * Best-effort Twitch channel-page live detection (Epic 8.1).
 * Twitch embeds boot JSON in inline scripts; markers change over time — adjust as needed.
 */

const MAX_SAMPLE_CHARS = 1_800_000;

/** `https://www.twitch.tv/ninja` — only single-segment paths are channel roots. */
export function isTwitchChannelRootUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (!/(^|\.)twitch\.tv$/i.test(u.hostname)) {
      return false;
    }
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length !== 1) {
      return false;
    }
    return /^[\w]+$/.test(parts[0]!);
  } catch {
    return false;
  }
}

/** Channel slug from `/{slug}` on the channel home route. */
export function twitchChannelSlugFromUrl(url: string): string | undefined {
  try {
    const u = new URL(url);
    if (!/(^|\.)twitch\.tv$/i.test(u.hostname)) {
      return undefined;
    }
    const parts = u.pathname.split('/').filter(Boolean);
    if (parts.length === 1 && /^[\w]+$/.test(parts[0]!)) {
      return parts[0];
    }
  } catch {
    /* invalid URL */
  }
  return undefined;
}

/** Popout chat window — not the main watch surface (no offline player layout). */
export function isTwitchPopoutChatUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (!/(^|\.)twitch\.tv$/i.test(u.hostname)) {
      return false;
    }
    return /^\/popout\/[\w]+\/chat\/?$/i.test(u.pathname);
  } catch {
    return false;
  }
}

export function twitchChannelSlugFromPopoutChatUrl(url: string): string | undefined {
  try {
    const u = new URL(url);
    const m = u.pathname.match(/^\/popout\/([\w]+)\/chat\/?$/i);
    return m?.[1];
  } catch {
    /* invalid URL */
  }
  return undefined;
}

/** Twitch hostname but not a single-segment channel root (homepage, directory, etc.). */
export function isTwitchBrowseUrl(url: string): boolean {
  try {
    const u = new URL(url.trim());
    if (!/(^|\.)twitch\.tv$/i.test(u.hostname)) {
      return false;
    }
    return !isTwitchChannelRootUrl(url);
  } catch {
    return false;
  }
}
export function gatherTwitchBootScriptSample(doc: Document): string {
  const out: string[] = [];
  let len = 0;
  for (const s of doc.scripts) {
    const t = s.textContent ?? '';
    if (!t) {
      continue;
    }
    if (t.includes('isLiveBroadcast') || t.includes('twilight')) {
      out.push(t);
      len += t.length;
      if (len >= MAX_SAMPLE_CHARS) {
        break;
      }
    }
  }
  const joined = out.join('\n');
  return joined.length > MAX_SAMPLE_CHARS ? joined.slice(0, MAX_SAMPLE_CHARS) : joined;
}

/**
 * Infer live vs offline from script text (unit-testable).
 * Returns `null` when neither marker appears.
 */
export function inferTwitchLiveFromScriptText(text: string): boolean | null {
  if (!text) {
    return null;
  }
  const slice = text.length > MAX_SAMPLE_CHARS ? text.slice(0, MAX_SAMPLE_CHARS) : text;
  const hasTrue = /"isLiveBroadcast"\s*:\s*true\b/.test(slice);
  const hasFalse = /"isLiveBroadcast"\s*:\s*false\b/.test(slice);
  if (hasTrue && hasFalse) {
    return null;
  }
  if (hasTrue) {
    return true;
  }
  if (hasFalse) {
    return false;
  }
  return null;
}

/** Offline channel home — banner layout (not the live watch player). */
export const TWITCH_OFFLINE_HOME_SELECTORS = [
  '[data-a-target="channel-home-header-offline"]',
  '[data-a-target="channel-offline-image"]',
] as const;

/** Live stream indicators on the watch surface. */
export const TWITCH_LIVE_DOM_SELECTORS = [
  '[data-a-target="player-live-indicator"]',
  '[data-a-target="live-indicator-button"]',
  '[data-a-target="stream-live-badge"]',
  '[data-a-target="channel-live-indicator"]',
  '[data-a-target="hero__live-indicator"]',
] as const;

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

/**
 * Best-effort live/offline from visible Twitch channel DOM.
 * Returns `null` when the page layout is ambiguous (loading, offline VOD player, etc.).
 */
export function inferTwitchLiveFromDom(root: ParentNode): boolean | null {
  if (!(root instanceof Document || root instanceof Element || root instanceof ShadowRoot)) {
    return null;
  }
  if (queryAnySelectorDeep(root, TWITCH_OFFLINE_HOME_SELECTORS)) {
    return false;
  }
  if (queryAnySelectorDeep(root, TWITCH_LIVE_DOM_SELECTORS)) {
    return true;
  }
  return null;
}

/**
 * Combine DOM and boot-script signals. DOM offline wins over stale script "live".
 * When DOM is ambiguous, fall back to script.
 */
export function mergeTwitchLiveSignals(
  dom: boolean | null,
  script: boolean | null
): boolean | null {
  if (dom === false) {
    return false;
  }
  if (dom === true) {
    return true;
  }
  return script;
}

/** DOM-first live detection for a Twitch channel tab document. */
export function inferTwitchLiveFromChannelPage(doc: Document): boolean | null {
  const dom = inferTwitchLiveFromDom(doc);
  const script = inferTwitchLiveFromScriptText(gatherTwitchBootScriptSample(doc));
  return mergeTwitchLiveSignals(dom, script);
}

/** Unknown / missing signal is treated as offline (not live). */
export function coalesceTwitchLiveSignal(live: boolean | null): boolean {
  return live === true;
}
