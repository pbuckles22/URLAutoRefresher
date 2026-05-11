import { describe, expect, it } from 'vitest';
import { buildGlobalGroupFromForm, buildGlobalGroupUpdateFromForm } from './global-group-form';
import { canonicalTwitchChannelUrl } from './twitch-favs';
import type { GlobalGroup } from './types';

describe('buildGlobalGroupFromForm', () => {
  it('rejects empty name', () => {
    const r = buildGlobalGroupFromForm(
      {
        name: '   ',
        baseIntervalSec: 60,
        jitterSec: 0,
        targets: [{ targetUrl: 'https://a/' }],
      },
      () => 'fixed-id'
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/group name/i);
    }
  });

  it('rejects no targets and no patterns', () => {
    const r = buildGlobalGroupFromForm(
      {
        name: 'G',
        baseIntervalSec: 60,
        jitterSec: 0,
        targets: [],
      },
      () => 'fixed-id'
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/at least one tab or add at least one url pattern/i);
    }
  });

  it('allows pattern-only group', () => {
    const r = buildGlobalGroupFromForm(
      {
        name: 'Twitch',
        baseIntervalSec: 60,
        jitterSec: 0,
        targets: [],
        urlPatternsRaw: '*twitch.tv*',
      },
      () => 'pat-id'
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.targets).toEqual([]);
      expect(r.value.urlPatterns).toEqual(['*twitch.tv*']);
    }
  });

  it('rejects duplicate member URLs', () => {
    const r = buildGlobalGroupFromForm(
      {
        name: 'G',
        baseIntervalSec: 60,
        jitterSec: 0,
        targets: [
          { targetUrl: 'https://dup.example/foo' },
          { targetUrl: 'https://dup.example/foo' },
        ],
      },
      () => 'fixed-id'
    );
    expect(r.ok).toBe(false);
  });

  it('returns a valid global group', () => {
    const r = buildGlobalGroupFromForm(
      {
        name: ' Sync ',
        baseIntervalSec: 90,
        jitterSec: 3,
        targets: [
          { targetUrl: 'https://example.com/a', label: ' Tab A ' },
          { targetUrl: 'https://example.com/b' },
        ],
      },
      () => 'gid-1'
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({
        id: 'gid-1',
        name: 'Sync',
        targets: [
          { targetUrl: 'https://example.com/a', label: 'Tab A' },
          { targetUrl: 'https://example.com/b' },
        ],
        baseIntervalSec: 90,
        jitterSec: 3,
        enabled: true,
      });
    }
  });

  it('TwitchFavs: names-only patterns without explicit tabs', () => {
    const r = buildGlobalGroupFromForm(
      {
        name: 'TwitchFavs',
        baseIntervalSec: 60,
        jitterSec: 0,
        targets: [],
        urlPatternsRaw: 'ninja, shroud',
      },
      () => 'tf-1'
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.urlPatterns).toEqual([
        canonicalTwitchChannelUrl('ninja'),
        canonicalTwitchChannelUrl('shroud'),
      ]);
      expect(r.value.targets).toEqual([]);
    }
  });

  it('TwitchFavs: prunes targets not in favorites list', () => {
    const r = buildGlobalGroupFromForm(
      {
        name: 'TwitchFavs',
        baseIntervalSec: 60,
        jitterSec: 0,
        targets: [
          { targetUrl: 'https://www.twitch.tv/ninja' },
          { targetUrl: 'https://example.com/other' },
        ],
        urlPatternsRaw: 'ninja',
      },
      () => 'tf-2'
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.targets).toEqual([{ targetUrl: canonicalTwitchChannelUrl('ninja') }]);
    }
  });
});

describe('buildGlobalGroupUpdateFromForm', () => {
  const existing = (): GlobalGroup => ({
    id: 'gid',
    name: 'Old',
    targets: [
      { targetUrl: 'https://example.com/a', label: 'A' },
      { targetUrl: 'https://example.com/b' },
    ],
    baseIntervalSec: 60,
    jitterSec: 0,
    enabled: true,
    nextFireAt: 12345,
  });

  it('rejects empty name', () => {
    const r = buildGlobalGroupUpdateFromForm(
      {
        name: '  ',
        baseIntervalSec: 60,
        jitterSec: 0,
        targets: [
          { targetUrl: 'https://x/' },
          { targetUrl: 'https://y/' },
        ],
        urlPatternsRaw: '',
      },
      existing()
    );
    expect(r.ok).toBe(false);
  });

  it('allows removing a member tab when URL patterns remain', () => {
    const r = buildGlobalGroupUpdateFromForm(
      {
        name: 'N',
        baseIntervalSec: 60,
        jitterSec: 0,
        targets: [{ targetUrl: 'https://x/' }],
        urlPatternsRaw: '*example.com*',
      },
      existing()
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.targets).toHaveLength(1);
      expect(r.value.targets[0]?.targetUrl).toBe('https://x/');
      expect(r.value.urlPatterns).toEqual(['*example.com*']);
    }
  });

  it('filters pausedMemberKeys when a tab is removed', () => {
    const ex: GlobalGroup = {
      ...existing(),
      pausedMemberKeys: ['example.com/a', 'example.com/b'],
    };
    const r = buildGlobalGroupUpdateFromForm(
      {
        name: 'N',
        baseIntervalSec: 60,
        jitterSec: 0,
        targets: [{ targetUrl: 'https://example.com/a', label: 'A' }],
        urlPatternsRaw: '*example.com*',
      },
      ex
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value.pausedMemberKeys).toEqual(['example.com/a']);
    }
  });

  it('preserves id, enabled, nextFireAt and updates fields (form row order)', () => {
    const ex = existing();
    const r = buildGlobalGroupUpdateFromForm(
      {
        name: ' New ',
        baseIntervalSec: 90,
        jitterSec: 2,
        targets: [
          { targetUrl: 'https://example.com/b2' },
          { targetUrl: 'https://example.com/a2', label: ' L1 ' },
        ],
        urlPatternsRaw: '',
      },
      ex
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).toEqual({
        id: 'gid',
        name: 'New',
        enabled: true,
        nextFireAt: 12345,
        baseIntervalSec: 90,
        jitterSec: 2,
        targets: [
          { targetUrl: 'https://example.com/b2' },
          { targetUrl: 'https://example.com/a2', label: 'L1' },
        ],
      });
    }
  });
});
