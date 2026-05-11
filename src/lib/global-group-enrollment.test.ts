import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { AppState, GlobalGroup } from './types';

const { resolveGlobalGroupTargets } = vi.hoisted(() => ({
  resolveGlobalGroupTargets: vi.fn(),
}));

vi.mock('./global-group-targets', () => ({
  resolveGlobalGroupTargets,
}));

import { validateGlobalGroupResolvedEnrollment } from './global-group-enrollment';

function baseGroup(overrides: Partial<GlobalGroup> = {}): GlobalGroup {
  return {
    id: 'cand',
    name: 'Candidate',
    targets: [{ targetUrl: 'https://a.test/x' }],
    baseIntervalSec: 60,
    jitterSec: 0,
    enabled: true,
    ...overrides,
  };
}

describe('validateGlobalGroupResolvedEnrollment', () => {
  beforeEach(() => {
    resolveGlobalGroupTargets.mockReset();
  });

  it('rejects global-global overlap by member URL even when resolved tab ids differ', async () => {
    const state: AppState = {
      schemaVersion: 3,
      globalGroups: [
        {
          id: 'g-other',
          name: 'Other',
          targets: [{ targetUrl: 'https://b.test/y' }],
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: true,
        },
      ],
      individualJobs: [],
    };
    const candidate = baseGroup();
    resolveGlobalGroupTargets
      .mockResolvedValueOnce([
        { tabId: 1, windowId: 0, targetUrl: 'https://a.test/x' },
      ])
      .mockResolvedValueOnce([
        { tabId: 99, windowId: 0, targetUrl: 'https://www.a.test/x' },
      ]);

    const r = await validateGlobalGroupResolvedEnrollment(state, candidate);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain('Other');
      expect(r.error).toContain('member URL');
    }
  });

  it('passes when no member URL overlap with other enabled groups', async () => {
    const state: AppState = {
      schemaVersion: 3,
      globalGroups: [
        {
          id: 'g-other',
          name: 'Other',
          targets: [{ targetUrl: 'https://b.test/y' }],
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: true,
        },
      ],
      individualJobs: [],
    };
    const candidate = baseGroup({ targets: [{ targetUrl: 'https://c.test/z' }] });
    resolveGlobalGroupTargets
      .mockResolvedValueOnce([{ tabId: 1, windowId: 0, targetUrl: 'https://c.test/z' }])
      .mockResolvedValueOnce([{ tabId: 2, windowId: 0, targetUrl: 'https://b.test/y' }]);

    const r = await validateGlobalGroupResolvedEnrollment(state, candidate);
    expect(r).toEqual({ ok: true, value: undefined });
  });

  it('skips the excluded group id (edit flow) so self-overlap is not flagged', async () => {
    const state: AppState = {
      schemaVersion: 3,
      globalGroups: [
        {
          id: 'g-edit',
          name: 'Editing',
          targets: [{ targetUrl: 'https://a.test/x' }],
          baseIntervalSec: 60,
          jitterSec: 0,
          enabled: true,
        },
      ],
      individualJobs: [],
    };
    const candidate = baseGroup({ id: 'g-edit', name: 'Editing' });
    resolveGlobalGroupTargets.mockResolvedValue([
      { tabId: 1, windowId: 0, targetUrl: 'https://a.test/x' },
    ]);

    const r = await validateGlobalGroupResolvedEnrollment(state, candidate, 'g-edit');
    expect(r).toEqual({ ok: true, value: undefined });
    expect(resolveGlobalGroupTargets).toHaveBeenCalledTimes(1);
  });
});
