import { describe, expect, it } from 'vitest';
import {
  normalizeBlipPhrasesFromTextarea,
  textMatchesBlip,
  compileBlipRegex,
} from './blip-match';

describe('normalizeBlipPhrasesFromTextarea', () => {
  it('splits lines, trims, dedupes case-insensitively, and caps count', () => {
    const raw = '  Hello \nworld\nhello\n';
    expect(normalizeBlipPhrasesFromTextarea(raw)).toEqual(['Hello', 'world']);
  });

  it('returns empty for blank input', () => {
    expect(normalizeBlipPhrasesFromTextarea('  \n  ')).toEqual([]);
    expect(normalizeBlipPhrasesFromTextarea(undefined)).toEqual([]);
  });
});

describe('textMatchesBlip', () => {
  it('matches phrase case-insensitively', () => {
    expect(textMatchesBlip(['offline'], undefined, 'The Stream is OFFLINE now')).toBe(true);
  });

  it('matches regex when phrases miss', () => {
    const re = compileBlipRegex('error\\s+\\d+');
    expect(textMatchesBlip([], re, 'prefix error 404 suffix')).toBe(true);
  });

  it('returns false when nothing matches', () => {
    expect(textMatchesBlip(['nope'], compileBlipRegex('z{3}'), 'hello')).toBe(false);
  });
});
