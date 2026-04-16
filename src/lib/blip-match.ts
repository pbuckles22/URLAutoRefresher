/** Epic 9 — user-defined phrase / regex matching against page text (best-effort, capped scan). */

export const BLIP_MAX_PHRASES = 20;
export const BLIP_MAX_PHRASE_LEN = 200;
export const BLIP_MAX_REGEX_LEN = 240;
export const BLIP_TEXT_SAMPLE_MAX = 400_000;

export function normalizeBlipPhrasesFromTextarea(raw: string | undefined): string[] {
  if (!raw?.trim()) {
    return [];
  }
  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim().slice(0, BLIP_MAX_PHRASE_LEN);
    if (!t) {
      continue;
    }
    const key = t.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(t);
    if (out.length >= BLIP_MAX_PHRASES) {
      break;
    }
  }
  return out;
}

export function compileBlipRegex(pattern: string | undefined): RegExp | undefined {
  if (!pattern?.trim()) {
    return undefined;
  }
  const p = pattern.trim().slice(0, BLIP_MAX_REGEX_LEN);
  try {
    return new RegExp(p, 'i');
  } catch {
    return undefined;
  }
}

export function sampleDocumentText(doc: Document, maxLen: number = BLIP_TEXT_SAMPLE_MAX): string {
  try {
    const t = doc.body?.innerText ?? '';
    return t.length > maxLen ? t.slice(0, maxLen) : t;
  } catch {
    return '';
  }
}

export function textMatchesBlipPhrases(phrases: readonly string[], text: string): boolean {
  const hay = text.toLowerCase();
  return phrases.some((p) => hay.includes(p.toLowerCase()));
}

export function textMatchesBlipRegex(re: RegExp | undefined, text: string): boolean {
  if (!re) {
    return false;
  }
  try {
    return re.test(text);
  } catch {
    return false;
  }
}

export function textMatchesBlip(
  phrases: readonly string[],
  regex: RegExp | undefined,
  text: string
): boolean {
  if (phrases.length > 0 && textMatchesBlipPhrases(phrases, text)) {
    return true;
  }
  return textMatchesBlipRegex(regex, text);
}
