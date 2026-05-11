import { describe, expect, it } from 'vitest';
import {
  memberKeyFromTargetUrl,
  pickBestOpenTabForMemberTarget,
  pageMatchesExplicitTarget,
} from './member-url';

describe('memberKeyFromTargetUrl', () => {
  it('normalizes host and path like overlay (no www, trailing slash)', () => {
    expect(memberKeyFromTargetUrl('https://www.Twitch.tv/foo/')).toBe('twitch.tv/foo');
    expect(memberKeyFromTargetUrl('https://twitch.tv/foo')).toBe('twitch.tv/foo');
  });

  it('returns null for non-http(s)', () => {
    expect(memberKeyFromTargetUrl('chrome://settings')).toBeNull();
    expect(memberKeyFromTargetUrl('not a url')).toBeNull();
  });
});

describe('pageMatchesExplicitTarget (re-export contract)', () => {
  it('matches glob and www variants', () => {
    expect(pageMatchesExplicitTarget('https://www.a.com/x', 'https://a.com/x')).toBe(true);
  });
});

describe('pickBestOpenTabForMemberTarget', () => {
  const target = 'https://example.com/channel';

  it('returns undefined when no candidates match', () => {
    expect(
      pickBestOpenTabForMemberTarget(
        [{ id: 1, url: 'https://other.com/', windowId: 1 }],
        target
      )
    ).toBeUndefined();
  });

  it('returns the only matching tab id', () => {
    expect(
      pickBestOpenTabForMemberTarget(
        [
          { id: 1, url: 'https://other.com/', windowId: 1 },
          { id: 2, url: 'https://example.com/channel', windowId: 1 },
        ],
        target
      )
    ).toBe(2);
  });

  it('prefers last-focused window when provided', () => {
    const picked = pickBestOpenTabForMemberTarget(
      [
        { id: 1, url: 'https://example.com/channel', windowId: 10, active: false, index: 0 },
        { id: 2, url: 'https://example.com/channel', windowId: 20, active: true, index: 0 },
      ],
      target,
      { lastFocusedWindowId: 10 }
    );
    expect(picked).toBe(1);
  });

  it('prefers active tab when still tied after window filter', () => {
    const picked = pickBestOpenTabForMemberTarget(
      [
        { id: 5, url: 'https://example.com/channel', windowId: 1, active: false, index: 0 },
        { id: 6, url: 'https://example.com/channel', windowId: 1, active: true, index: 2 },
      ],
      target,
      { lastFocusedWindowId: 1 }
    );
    expect(picked).toBe(6);
  });

  it('uses lowest index then lowest id when no active in pool', () => {
    const picked = pickBestOpenTabForMemberTarget(
      [
        { id: 100, url: 'https://example.com/channel', windowId: 1, active: false, index: 5 },
        { id: 50, url: 'https://example.com/channel', windowId: 1, active: false, index: 1 },
      ],
      target,
      { lastFocusedWindowId: 1 }
    );
    expect(picked).toBe(50);
  });

  it('deterministic lowest tab id when index equal and none active', () => {
    const picked = pickBestOpenTabForMemberTarget(
      [
        { id: 9, url: 'https://example.com/channel', windowId: 1, active: false, index: 0 },
        { id: 3, url: 'https://example.com/channel', windowId: 1, active: false, index: 0 },
      ],
      target,
      { lastFocusedWindowId: 1 }
    );
    expect(picked).toBe(3);
  });
});
