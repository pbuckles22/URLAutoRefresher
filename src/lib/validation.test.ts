import { describe, it, expect } from 'vitest';
import {
  validateHttpUrl,
  validateIntervalSec,
  validateJitterSec,
} from './validation';

describe('validateHttpUrl', () => {
  it('accepts https URLs', () => {
    const r = validateHttpUrl('https://example.com/path?q=1');
    expect(r).toEqual({ ok: true, value: 'https://example.com/path?q=1' });
  });

  it('accepts http URLs', () => {
    expect(validateHttpUrl('http://localhost:8080/')).toMatchObject({
      ok: true,
    });
  });

  it('rejects empty and non-http schemes', () => {
    expect(validateHttpUrl('')).toMatchObject({ ok: false });
    expect(validateHttpUrl('ftp://x')).toMatchObject({ ok: false });
    expect(validateHttpUrl('not a url')).toMatchObject({ ok: false });
  });
});

describe('validateIntervalSec', () => {
  it('requires finite positive number', () => {
    expect(validateIntervalSec(1)).toEqual({ ok: true, value: 1 });
    expect(validateIntervalSec(0)).toMatchObject({ ok: false });
    expect(validateIntervalSec(-3)).toMatchObject({ ok: false });
    expect(validateIntervalSec(NaN)).toMatchObject({ ok: false });
  });
});

describe('validateJitterSec', () => {
  it('allows zero', () => {
    expect(validateJitterSec(0)).toEqual({ ok: true, value: 0 });
  });

  it('allows positive', () => {
    expect(validateJitterSec(30)).toEqual({ ok: true, value: 30 });
  });

  it('rejects negative', () => {
    expect(validateJitterSec(-1)).toMatchObject({ ok: false });
  });
});
