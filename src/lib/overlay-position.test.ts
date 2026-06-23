import { describe, it, expect } from 'vitest';
import {
  clampOverlayDragPosition,
  computeOverlayHostStyle,
  DEFAULT_OVERLAY_POSITION,
  parseOverlayPosition,
  toggleOverlaySnapAnchor,
} from './overlay-position';

describe('parseOverlayPosition', () => {
  it('returns default for invalid input', () => {
    expect(parseOverlayPosition(null)).toEqual(DEFAULT_OVERLAY_POSITION);
    expect(parseOverlayPosition([])).toEqual(DEFAULT_OVERLAY_POSITION);
  });

  it('parses snap anchor', () => {
    expect(parseOverlayPosition({ anchor: 'left' })).toEqual({ anchor: 'left' });
    expect(parseOverlayPosition({ anchor: 'right' })).toEqual({ anchor: 'right' });
    expect(parseOverlayPosition({ anchor: 'bogus' })).toEqual({ anchor: 'right' });
  });

  it('parses drag coords when both present', () => {
    expect(parseOverlayPosition({ anchor: 'left', dragTop: 40, dragLeft: 80 })).toEqual({
      anchor: 'left',
      dragTop: 40,
      dragLeft: 80,
    });
  });

  it('ignores partial drag coords', () => {
    expect(parseOverlayPosition({ dragTop: 40 })).toEqual({ anchor: 'right' });
  });
});

describe('toggleOverlaySnapAnchor', () => {
  it('flips anchor and clears drag', () => {
    expect(toggleOverlaySnapAnchor({ anchor: 'right', dragTop: 1, dragLeft: 2 })).toEqual({
      anchor: 'left',
    });
    expect(toggleOverlaySnapAnchor({ anchor: 'left' })).toEqual({ anchor: 'right' });
  });
});

describe('clampOverlayDragPosition', () => {
  it('keeps overlay inside viewport with margin', () => {
    expect(clampOverlayDragPosition(-10, -5, 100, 50, 800, 600)).toEqual({ top: 4, left: 4 });
    expect(clampOverlayDragPosition(900, 900, 100, 50, 800, 600)).toEqual({ top: 546, left: 696 });
  });
});

describe('computeOverlayHostStyle', () => {
  it('defaults to top-right with 12px inset', () => {
    expect(computeOverlayHostStyle(DEFAULT_OVERLAY_POSITION, false)).toEqual({
      top: '12px',
      left: 'auto',
      right: '12px',
      snapLeft: false,
    });
  });

  it('uses wider inset when minimized on right', () => {
    expect(computeOverlayHostStyle(DEFAULT_OVERLAY_POSITION, true).right).toBe('56px');
  });

  it('snaps to top-left', () => {
    expect(computeOverlayHostStyle({ anchor: 'left' }, false)).toEqual({
      top: '12px',
      left: '12px',
      right: 'auto',
      snapLeft: true,
    });
  });

  it('uses drag pixels when set', () => {
    expect(computeOverlayHostStyle({ anchor: 'right', dragTop: 88, dragLeft: 120 }, false)).toEqual(
      {
        top: '88px',
        left: '120px',
        right: 'auto',
        snapLeft: false,
      }
    );
  });
});
