import { describe, it, expect } from 'vitest';
import type { AppState, GlobalGroup } from './types';
import { removeGlobalGroupById, replaceGlobalGroup, setGlobalGroupEnabled } from './global-groups';

function sampleGroup(overrides: Partial<GlobalGroup> = {}): GlobalGroup {
  return {
    id: 'g-a',
    name: 'Group A',
    targets: [{ tabId: 1, windowId: 0, targetUrl: 'https://example.com' }],
    baseIntervalSec: 60,
    jitterSec: 0,
    enabled: true,
    nextFireAt: 9_000_000,
    ...overrides,
  };
}

function emptyState(): AppState {
  return { schemaVersion: 1, globalGroups: [], individualJobs: [] };
}

describe('global-groups (Epic 4.2)', () => {
  it('removeGlobalGroupById drops the group', () => {
    const g1 = sampleGroup({ id: 'keep' });
    const g2 = sampleGroup({
      id: 'drop',
      targets: [{ tabId: 2, windowId: 0, targetUrl: 'https://b.com' }],
    });
    const state: AppState = { ...emptyState(), globalGroups: [g1, g2] };
    const next = removeGlobalGroupById(state, 'drop');
    expect(next.globalGroups).toEqual([g1]);
  });

  it('setGlobalGroupEnabled toggles enabled and clears schedule when stopping', () => {
    const g = sampleGroup({ tabNextFireAt: { '1': 100, '2': 200 } });
    const state: AppState = { ...emptyState(), globalGroups: [g] };
    const stopped = setGlobalGroupEnabled(state, 'g-a', false);
    expect(stopped.globalGroups[0]).toMatchObject({
      enabled: false,
      nextFireAt: undefined,
      tabNextFireAt: undefined,
    });
    const started = setGlobalGroupEnabled(stopped, 'g-a', true);
    expect(started.globalGroups[0]).toMatchObject({ enabled: true });
  });

  it('setGlobalGroupEnabled leaves other groups unchanged', () => {
    const a = sampleGroup({ id: 'a' });
    const b = sampleGroup({
      id: 'b',
      targets: [{ tabId: 2, windowId: 0, targetUrl: 'https://b.com' }],
    });
    const state: AppState = { ...emptyState(), globalGroups: [a, b] };
    const next = setGlobalGroupEnabled(state, 'b', false);
    expect(next.globalGroups[0]).toBe(a);
    expect(next.globalGroups[1]?.enabled).toBe(false);
  });

  it('replaceGlobalGroup updates the matching row by id', () => {
    const g = sampleGroup();
    const state: AppState = { ...emptyState(), globalGroups: [g] };
    const edited: GlobalGroup = {
      ...g,
      name: 'Renamed',
      baseIntervalSec: 120,
      jitterSec: 3,
      targets: [{ tabId: 1, windowId: 0, targetUrl: 'https://edited.example' }],
    };
    const next = replaceGlobalGroup(state, edited);
    expect(next.globalGroups).toHaveLength(1);
    expect(next.globalGroups[0]).toEqual(edited);
  });

  it('replaceGlobalGroup is a no-op when id is missing', () => {
    const state: AppState = { ...emptyState(), globalGroups: [sampleGroup()] };
    const ghost: GlobalGroup = {
      ...sampleGroup({ id: 'missing' }),
      baseIntervalSec: 1,
    };
    const next = replaceGlobalGroup(state, ghost);
    expect(next).toEqual(state);
  });
});
