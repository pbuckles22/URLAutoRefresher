import { describe, it, expect } from 'vitest';
import { buildIndividualJobFromForm } from './individual-job-form';

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
});
