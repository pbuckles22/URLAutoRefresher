import { describe, it, expect } from 'vitest';
import {
  DEFAULT_STATE,
  parseStoredPayload,
  validateStateFields,
  validateUniqueIds,
  validateEnabledEnrollment,
  validateGlobalGroupTargets,
} from './state';

describe('parseStoredPayload', () => {
  it('returns default when missing or not an object', () => {
    expect(parseStoredPayload(undefined)).toEqual(DEFAULT_STATE);
    expect(parseStoredPayload(null)).toEqual(DEFAULT_STATE);
    expect(parseStoredPayload([])).toEqual(DEFAULT_STATE);
  });

  it('accepts minimal valid payload', () => {
    const raw = {
      schemaVersion: 2,
      globalGroups: [],
      individualJobs: [],
    };
    expect(parseStoredPayload(raw)).toEqual({
      schemaVersion: 3,
      globalGroups: [],
      individualJobs: [],
    });
  });

  it('rejects wrong schema version', () => {
    const r = parseStoredPayload({
      schemaVersion: 99,
      globalGroups: [],
      individualJobs: [],
    });
    expect(r).toMatchObject({ schemaVersion: 3, globalGroups: [], individualJobs: [] });
  });

  it('migrates v1 tab-id schedule and pause to member keys', () => {
    const raw = {
      schemaVersion: 1,
      globalGroups: [
        {
          id: 'g1',
          name: 'G',
          targets: [{ tabId: 1, windowId: 1, targetUrl: 'https://a.com/x' }],
          tabNextFireAt: { '1': 999 },
          pausedTabIds: [1],
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: true,
        },
      ],
      individualJobs: [],
    };
    const out = parseStoredPayload(raw);
    expect(out.schemaVersion).toBe(3);
    expect(out.globalGroups[0].memberNextFireAt?.['a.com/x']).toBe(999);
    expect(out.globalGroups[0].pausedMemberKeys).toEqual(['a.com/x']);
  });
});

describe('validateUniqueIds', () => {
  it('passes when ids are unique', () => {
    const r = validateUniqueIds({
      ...DEFAULT_STATE,
      globalGroups: [
        {
          id: 'g1',
          name: 'A',
          targets: [],
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: false,
        },
      ],
      individualJobs: [
        { id: 'i1', target: sampleTarget('https://id.example/1'), baseIntervalSec: 60, jitterSec: 0, enabled: false },
      ],
    });
    expect(r.ok).toBe(true);
  });

  it('fails when two global groups share an id', () => {
    const r = validateUniqueIds({
      ...DEFAULT_STATE,
      globalGroups: [
        group('dup', []),
        group('dup', []),
      ],
    });
    expect(r.ok).toBe(false);
  });

  it('fails when global id collides with individual id', () => {
    const r = validateUniqueIds({
      ...DEFAULT_STATE,
      globalGroups: [group('x', [])],
      individualJobs: [
        { id: 'x', target: sampleTarget('https://id.example/2'), baseIntervalSec: 60, jitterSec: 0, enabled: false },
      ],
    });
    expect(r.ok).toBe(false);
  });

  it('fails when two individual jobs share an id', () => {
    const r = validateUniqueIds({
      ...DEFAULT_STATE,
      individualJobs: [
        { id: 'dup', target: sampleTarget('https://id.example/a'), baseIntervalSec: 60, jitterSec: 0, enabled: false },
        { id: 'dup', target: sampleTarget('https://id.example/b'), baseIntervalSec: 60, jitterSec: 0, enabled: false },
      ],
    });
    expect(r.ok).toBe(false);
  });
});

describe('validateGlobalGroupTargets', () => {
  it('fails when the same member URL appears twice in one group', () => {
    const r = validateGlobalGroupTargets({
      id: 'g',
      name: 'G',
      targets: [{ targetUrl: 'https://x.example/foo' }, { targetUrl: 'https://x.example/foo' }],
      baseIntervalSec: 60,
      jitterSec: 0,
      enabled: true,
    });
    expect(r.ok).toBe(false);
  });
});

describe('validateStateFields (Epic 1.2)', () => {
  it('accepts valid global and individual URLs and intervals', () => {
    const r = validateStateFields({
      schemaVersion: 3,
      globalGroups: [
        {
          id: 'g1',
          name: 'G',
          targets: [{ targetUrl: 'https://a.com' }],
          baseIntervalSec: 10,
          jitterSec: 0,
          enabled: false,
        },
      ],
      individualJobs: [
        {
          id: 'i1',
          target: { targetUrl: 'https://b.com' },
          baseIntervalSec: 20,
          jitterSec: 5,
          enabled: false,
        },
      ],
    });
    expect(r.ok).toBe(true);
  });

  it('rejects non-http(s) target URL on individual job', () => {
    const r = validateStateFields({
      ...DEFAULT_STATE,
      individualJobs: [
        {
          id: 'i1',
          target: { targetUrl: 'ftp://example.com' },
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: false,
        },
      ],
    });
    expect(r.ok).toBe(false);
  });

  it('rejects invalid interval on global group', () => {
    const r = validateStateFields({
      ...DEFAULT_STATE,
      globalGroups: [
        {
          id: 'g1',
          name: 'G',
          targets: [{ targetUrl: 'https://a.com' }],
          baseIntervalSec: 0,
          jitterSec: 0,
          enabled: false,
        },
      ],
    });
    expect(r.ok).toBe(false);
  });

  it('rejects negative jitter', () => {
    const r = validateStateFields({
      ...DEFAULT_STATE,
      individualJobs: [
        {
          id: 'i1',
          target: { targetUrl: 'https://a.com' },
          baseIntervalSec: 60,
          jitterSec: -1,
          enabled: false,
        },
      ],
    });
    expect(r.ok).toBe(false);
  });
});

describe('validateEnabledEnrollment', () => {
  it('allows same tab disabled in both places', () => {
    const r = validateEnabledEnrollment({
      schemaVersion: 3,
      globalGroups: [
        {
          id: 'g1',
          name: 'G',
          targets: [sampleTarget('https://overlap.example')],
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: false,
        },
      ],
      individualJobs: [
        {
          id: 'i1',
          target: sampleTarget('https://overlap.example'),
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: false,
        },
      ],
    });
    expect(r.ok).toBe(true);
  });

  it('fails when tab is enabled in global and individual', () => {
    const r = validateEnabledEnrollment({
      schemaVersion: 3,
      globalGroups: [
        {
          id: 'g1',
          name: 'G',
          targets: [sampleTarget('https://collision.example')],
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: true,
        },
      ],
      individualJobs: [
        {
          id: 'i1',
          target: sampleTarget('https://collision.example'),
          baseIntervalSec: 120,
          jitterSec: 0,
          enabled: true,
        },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain('cannot be in an enabled global group and an enabled individual job');
    }
  });

  it('fails when two enabled individual jobs target the same tab', () => {
    const r = validateEnabledEnrollment({
      schemaVersion: 3,
      globalGroups: [],
      individualJobs: [
        {
          id: 'i1',
          target: sampleTarget('https://same.example'),
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: true,
        },
        {
          id: 'i2',
          target: sampleTarget('https://same.example'),
          baseIntervalSec: 120,
          jitterSec: 0,
          enabled: true,
        },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain('another enabled individual');
    }
  });

  it('fails when tab is in two enabled globals', () => {
    const r = validateEnabledEnrollment({
      schemaVersion: 2,
      globalGroups: [
        {
          id: 'g1',
          name: 'A',
          targets: [sampleTarget('https://cross.example')],
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: true,
        },
        {
          id: 'g2',
          name: 'B',
          targets: [sampleTarget('https://cross.example')],
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: true,
        },
      ],
      individualJobs: [],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/global group/i);
    }
  });
});

function sampleTarget(url = 'https://example.com') {
  return { targetUrl: url };
}

function group(id: string, targets: ReturnType<typeof sampleTarget>[]) {
  return {
    id,
    name: id,
    targets,
    baseIntervalSec: 60,
    jitterSec: 0,
    enabled: false,
  };
}
