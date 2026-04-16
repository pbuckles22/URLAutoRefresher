/**
 * Simple * wildcard URL matching (case-insensitive). * may appear anywhere; multiple * are allowed.
 */

const MAX_PATTERN_LEN = 200;

/** Escape regex metacharacters in a literal segment (between * wildcards). */
function escapeRegexLiteral(s: string): string {
  return s.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
}

/** True if `url` matches `pattern` (glob with *). */
export function urlMatchesGlob(url: string, pattern: string): boolean {
  const p = pattern.trim();
  if (!p || p.length > MAX_PATTERN_LEN) {
    return false;
  }
  if (!/^https?:\/\//i.test(url)) {
    return false;
  }
  if (!p.includes('*')) {
    return url.toLowerCase().includes(p.toLowerCase());
  }
  const parts = p.split('*').map(escapeRegexLiteral);
  const re = new RegExp(`^${parts.join('.*')}$`, 'i');
  return re.test(url);
}

export function normalizeUrlPatternLines(raw: string): string[] {
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  const out: string[] = [];
  for (const l of lines) {
    if (l.length > MAX_PATTERN_LEN) {
      continue;
    }
    out.push(l);
    if (out.length >= 20) {
      break;
    }
  }
  return out;
}
