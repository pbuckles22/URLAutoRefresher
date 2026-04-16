import { describe, it, expect } from 'vitest';
import type { IndividualJob } from './types';
import { buildIndividualJobFromForm, buildIndividualJobUpdateFromForm } from './individual-job-form';

describe('buildIndividualJobFromForm (Epic 3.1)', () => {
  const newId = () => 'job-test-id';

  it('builds enabled job with validated fields', () => {
    const r = buildIndividualJobFromForm(
      {
        tabId: 12,
        windowId: 3,
        targetUrl: '  https://example.com/path  ',
        baseIntervalSec: 60,
        jitterSec: 5,
      },
      newId
    );
    expect(r).toEqual({
      ok: true,
      value: {
        id: 'job-test-id',
        target: { tabId: 12, windowId: 3, targetUrl: 'https://example.com/path' },
        baseIntervalSec: 60,
        jitterSec: 5,
        enabled: true,
      },
    });
  });

  it('rejects non-integer or non-positive tabId', () => {
    expect(buildIndividualJobFromForm({ tabId: 0, windowId: 1, targetUrl: 'https://a.com', baseIntervalSec: 1, jitterSec: 0 }, newId).ok).toBe(
      false
    );
    expect(buildIndividualJobFromForm({ tabId: 1.2, windowId: 1, targetUrl: 'https://a.com', baseIntervalSec: 1, jitterSec: 0 }, newId).ok).toBe(
      false
    );
  });

  it('rejects invalid URL', () => {
    const r = buildIndividualJobFromForm(
      { tabId: 1, windowId: 1, targetUrl: 'ftp://x', baseIntervalSec: 10, jitterSec: 0 },
      newId
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/url/i);
  });

  it('rejects invalid interval or jitter', () => {
    expect(
      buildIndividualJobFromForm({ tabId: 1, windowId: 1, targetUrl: 'https://a.com', baseIntervalSec: 0, jitterSec: 0 }, newId).ok
    ).toBe(false);
    expect(
      buildIndividualJobFromForm({ tabId: 1, windowId: 1, targetUrl: 'https://a.com', baseIntervalSec: 10, jitterSec: -1 }, newId).ok
    ).toBe(false);
  });

  it('sets liveAwareRefresh when requested', () => {
    const r = buildIndividualJobFromForm(
      {
        tabId: 12,
        windowId: 3,
        targetUrl: 'https://www.twitch.tv/x',
        baseIntervalSec: 60,
        jitterSec: 0,
        liveAwareRefresh: true,
      },
      newId
    );
    expect(r.ok && r.value).toMatchObject({ liveAwareRefresh: true });
  });
});

describe('buildIndividualJobUpdateFromForm (Epic 3.2)', () => {
  const existing: IndividualJob = {
    id: 'keep-id',
    target: { tabId: 5, windowId: 2, targetUrl: 'https://old.com' },
    baseIntervalSec: 60,
    jitterSec: 1,
    enabled: false,
    nextFireAt: 123,
  };

  it('updates validated fields and preserves id, enabled, nextFireAt', () => {
    const r = buildIndividualJobUpdateFromForm(
      { targetUrl: 'https://new.com/', baseIntervalSec: 90, jitterSec: 2 },
      existing
    );
    expect(r).toEqual({
      ok: true,
      value: {
        id: 'keep-id',
        target: { tabId: 5, windowId: 2, targetUrl: 'https://new.com/' },
        baseIntervalSec: 90,
        jitterSec: 2,
        enabled: false,
        nextFireAt: 123,
      },
    });
  });

  it('rejects invalid input like add form', () => {
    expect(
      buildIndividualJobUpdateFromForm({ targetUrl: 'ftp://x', baseIntervalSec: 10, jitterSec: 0 }, existing).ok
    ).toBe(false);
  });

  it('preserves streamLive when live-aware stays enabled', () => {
    const withLive: IndividualJob = {
      ...existing,
      liveAwareRefresh: true,
      streamLive: true,
    };
    const r = buildIndividualJobUpdateFromForm(
      { targetUrl: 'https://new.com/', baseIntervalSec: 90, jitterSec: 2, liveAwareRefresh: true },
      withLive
    );
    expect(r.ok && r.value).toMatchObject({ streamLive: true, liveAwareRefresh: true });
  });

  it('clears live-aware fields when turned off', () => {
    const withLive: IndividualJob = {
      ...existing,
      liveAwareRefresh: true,
      streamLive: true,
    };
    const r = buildIndividualJobUpdateFromForm(
      { targetUrl: 'https://new.com/', baseIntervalSec: 90, jitterSec: 2, liveAwareRefresh: false },
      withLive
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.value).not.toHaveProperty('liveAwareRefresh');
      expect(r.value).not.toHaveProperty('streamLive');
    }
  });
});
