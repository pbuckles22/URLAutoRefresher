import { describe, expect, it } from 'vitest';
import { normalizeUrlPatternLines, urlMatchesGlob } from './url-glob';

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
