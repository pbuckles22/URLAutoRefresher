/**
 * Best-effort Twitch channel-page live detection (Epic 8.1).
 * Twitch embeds boot JSON in inline scripts; markers change over time — adjust as needed.
 */

const MAX_SAMPLE_CHARS = 1_800_000;

/** `https://www.twitch.tv/ninja` or `/videos` etc. — only single-segment paths are channel roots. */
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

/** Concatenate script bodies likely to contain Twitch boot state (browser only). */
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
  if (hasTrue) {
    return true;
  }
  if (hasFalse) {
    return false;
  }
  return null;
}
