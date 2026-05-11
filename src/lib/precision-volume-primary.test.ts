import { describe, expect, it } from 'vitest';
import {
  comparePrimaryMediaPriority,
  pickPrimaryMediaIndex,
  type PrimaryMediaPickFields,
} from './precision-volume-primary';

const base = (over: Partial<PrimaryMediaPickFields>): PrimaryMediaPickFields => ({
  kind: 'video',
  paused: true,
  ended: false,
  readyState: 0,
  intrinsicSize: 100,
  displayArea: 100,
  docIndex: 0,
  ...over,
});

describe('comparePrimaryMediaPriority', () => {
  it('prefers actively rendering media', () => {
    const idle = base({ paused: true, readyState: 4 });
    const playing = base({ paused: false, ended: false, readyState: 4, docIndex: 1 });
    expect(comparePrimaryMediaPriority(playing, idle)).toBeGreaterThan(0);
    expect(comparePrimaryMediaPriority(idle, playing)).toBeLessThan(0);
  });

  it('prefers larger display when play state matches', () => {
    const small = base({ displayArea: 10, docIndex: 0 });
    const big = base({ displayArea: 500, docIndex: 1 });
    expect(comparePrimaryMediaPriority(big, small)).toBeGreaterThan(0);
  });

  it('prefers video over audio on ties', () => {
    const audio = base({ kind: 'audio', displayArea: 100, docIndex: 0 });
    const video = base({ kind: 'video', displayArea: 100, docIndex: 1 });
    expect(comparePrimaryMediaPriority(video, audio)).toBeGreaterThan(0);
  });

  it('prefers earlier docIndex on full ties', () => {
    const a = base({ docIndex: 0 });
    const b = base({ docIndex: 1 });
    expect(comparePrimaryMediaPriority(a, b)).toBeGreaterThan(0);
  });
});

describe('pickPrimaryMediaIndex', () => {
  it('returns -1 for empty', () => {
    expect(pickPrimaryMediaIndex([])).toBe(-1);
  });

  it('returns the best candidate index', () => {
    const c = [
      base({ docIndex: 0, displayArea: 1 }),
      base({ docIndex: 1, paused: false, ended: false, readyState: 3, displayArea: 1 }),
    ];
    expect(pickPrimaryMediaIndex(c)).toBe(1);
  });
});
