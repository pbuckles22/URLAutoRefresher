// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { gatherHtmlMediaUnderRoot } from './precision-volume-media-mutation';

describe('gatherHtmlMediaUnderRoot', () => {
  it('returns the element itself when the root is a media element', () => {
    const v = document.createElement('video');
    expect(gatherHtmlMediaUnderRoot(v)).toEqual([v]);
  });

  it('returns descendants only when the root is a non-media element', () => {
    const wrap = document.createElement('div');
    const a = document.createElement('audio');
    const v = document.createElement('video');
    wrap.append(a, v);
    expect(gatherHtmlMediaUnderRoot(wrap)).toEqual([a, v]);
  });

  it('returns nested media under a subtree root', () => {
    const outer = document.createElement('div');
    const inner = document.createElement('section');
    const v = document.createElement('video');
    inner.appendChild(v);
    outer.appendChild(inner);
    expect(gatherHtmlMediaUnderRoot(outer)).toEqual([v]);
  });

  it('returns empty for non-element nodes', () => {
    expect(gatherHtmlMediaUnderRoot(document.createTextNode('x'))).toEqual([]);
  });
});
