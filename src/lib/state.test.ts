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
      schemaVersion: 1,
      globalGroups: [],
      individualJobs: [],
    };
    expect(parseStoredPayload(raw)).toEqual(raw);
  });

  it('rejects wrong schema version', () => {
    const r = parseStoredPayload({
      schemaVersion: 99,
      globalGroups: [],
      individualJobs: [],
    });
    expect(r).toMatchObject({ schemaVersion: 1, globalGroups: [], individualJobs: [] });
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
      individualJobs: [{ id: 'i1', target: sampleTarget(1), baseIntervalSec: 60, jitterSec: 0, enabled: false }],
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
        { id: 'x', target: sampleTarget(2), baseIntervalSec: 60, jitterSec: 0, enabled: false },
      ],
    });
    expect(r.ok).toBe(false);
  });

  it('fails when two individual jobs share an id', () => {
    const r = validateUniqueIds({
      ...DEFAULT_STATE,
      individualJobs: [
        { id: 'dup', target: sampleTarget(1), baseIntervalSec: 60, jitterSec: 0, enabled: false },
        { id: 'dup', target: sampleTarget(2), baseIntervalSec: 60, jitterSec: 0, enabled: false },
      ],
    });
    expect(r.ok).toBe(false);
  });
});

describe('validateGlobalGroupTargets', () => {
  it('fails when same tab appears twice in one group', () => {
    const r = validateGlobalGroupTargets({
      id: 'g',
      name: 'G',
      targets: [sampleTarget(1), { ...sampleTarget(1), targetUrl: 'https://b.com' }],
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
      schemaVersion: 1,
      globalGroups: [
        {
          id: 'g1',
          name: 'G',
          targets: [{ tabId: 1, windowId: 1, targetUrl: 'https://a.com' }],
          baseIntervalSec: 10,
          jitterSec: 0,
          enabled: false,
        },
      ],
      individualJobs: [
        {
          id: 'i1',
          target: { tabId: 2, windowId: 1, targetUrl: 'https://b.com' },
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
          target: { tabId: 1, windowId: 1, targetUrl: 'ftp://example.com' },
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
          targets: [{ tabId: 1, windowId: 1, targetUrl: 'https://a.com' }],
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
          target: { tabId: 1, windowId: 1, targetUrl: 'https://a.com' },
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
      schemaVersion: 1,
      globalGroups: [
        {
          id: 'g1',
          name: 'G',
          targets: [sampleTarget(5)],
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: false,
        },
      ],
      individualJobs: [
        {
          id: 'i1',
          target: sampleTarget(5),
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
      schemaVersion: 1,
      globalGroups: [
        {
          id: 'g1',
          name: 'G',
          targets: [sampleTarget(7)],
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: true,
        },
      ],
      individualJobs: [
        {
          id: 'i1',
          target: sampleTarget(7),
          baseIntervalSec: 120,
          jitterSec: 0,
          enabled: true,
        },
      ],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toMatch(/tab/i);
    }
  });

  it('fails when tab is in two enabled globals', () => {
    const r = validateEnabledEnrollment({
      schemaVersion: 1,
      globalGroups: [
        {
          id: 'g1',
          name: 'A',
          targets: [sampleTarget(3)],
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: true,
        },
        {
          id: 'g2',
          name: 'B',
          targets: [sampleTarget(3)],
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: true,
        },
      ],
      individualJobs: [],
    });
    expect(r.ok).toBe(false);
  });
});

function sampleTarget(tabId: number) {
  return {
    tabId,
    windowId: 1,
    targetUrl: 'https://example.com',
  };
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
