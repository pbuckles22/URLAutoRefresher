import { describe, expect, it } from 'vitest';
import { mergeDistinctPatternLines, normalizeUrlPatternLines, urlMatchesGlob } from './url-glob';

describe('urlMatchesGlob', () => {
  it('matches literal without star', () => {
    expect(urlMatchesGlob('https://www.twitch.tv/foo', 'twitch.tv')).toBe(true);
  });

  it('matches twitch.tv* style', () => {
    expect(urlMatchesGlob('https://www.twitch.tv/directory', '*twitch.tv*')).toBe(true);
    expect(urlMatchesGlob('https://example.com/', '*twitch.tv*')).toBe(false);
  });

  it('rejects non-http(s) url', () => {
    expect(urlMatchesGlob('chrome://settings', '*')).toBe(false);
  });
});

describe('normalizeUrlPatternLines', () => {
  it('trims and drops blanks', () => {
    expect(normalizeUrlPatternLines('  a  \n\n b ')).toEqual(['a', 'b']);
  });
});

describe('mergeDistinctPatternLines', () => {
  it('appends without duplicating case-insensitively', () => {
    expect(mergeDistinctPatternLines('https://a.example/foo', ['https://A.example/foo', 'https://b/'])).toBe(
      'https://a.example/foo\nhttps://b/'
    );
  });

  it('handles empty base', () => {
    expect(mergeDistinctPatternLines('', ['https://z/'])).toBe('https://z/');
  });
});
