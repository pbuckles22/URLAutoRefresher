import { test, expect } from '@playwright/test';
import {
  dashboardUrl,
  ensureServiceWorkerReady,
  FIXTURE_ORIGIN,
  launchExtensionContext,
} from './extension-helpers';
import {
  expandOverlayIfMinimized,
  expectOverlayCardVisible,
  PREFS_STORAGE_KEY,
  waitForExtensionDebounce,
} from './twitch-stub-helpers';

/** Matches fixture page URL for overlay membership (URL-first jobs). */
const FIXTURE_PAGE_TARGET_URL = `${FIXTURE_ORIGIN}/`;

const STORAGE_KEY = 'urlAutoRefresher_state_v1';

test.describe.configure({ mode: 'serial' });

let extensionId: string;
let context: Awaited<ReturnType<typeof launchExtensionContext>>['context'];

test.beforeAll(async () => {
  const launched = await launchExtensionContext();
  context = launched.context;
  extensionId = launched.extensionId;
});

test.afterAll(async () => {
  if (context) {
    await context.close();
  }
});

test('dashboard page loads with extension name', async () => {
  const page = await context.newPage();
  await page.goto(dashboardUrl(extensionId));
  await expect(page.locator('[data-app-title]')).toContainText('URL Auto Refresher');
  await page.close();
});

test('content script shows overlay when tab has enabled job and pref is on', async () => {
  await ensureServiceWorkerReady(context, extensionId);

  const fixturePage = await context.newPage();
  await fixturePage.goto(`${FIXTURE_ORIGIN}/`);

  const dash = await context.newPage();
  await dash.goto(dashboardUrl(extensionId));
  await dash.evaluate(
    async ({
      storageKey,
      prefsKey,
      targetUrl,
    }: {
      storageKey: string;
      prefsKey: string;
      targetUrl: string;
    }) => {
      await chrome.storage.local.set({
        [storageKey]: {
          schemaVersion: 3,
          globalGroups: [],
          individualJobs: [
            {
              id: 'e2e-individual',
              target: {
                targetUrl,
              },
              baseIntervalSec: 60,
              jitterSec: 0,
              enabled: true,
              nextFireAt: Date.now() + 120_000,
            },
          ],
        },
        [prefsKey]: { showPageOverlayTimer: true },
      });
    },
    { storageKey: STORAGE_KEY, prefsKey: PREFS_STORAGE_KEY, targetUrl: FIXTURE_PAGE_TARGET_URL }
  );

  await waitForExtensionDebounce();

  // Storage updates from another tab may race the content script listener; reload guarantees sync.
  await fixturePage.reload({ waitUntil: 'domcontentloaded' });
  await expectOverlayCardVisible(fixturePage);
  await expandOverlayIfMinimized(fixturePage);

  const compact = await fixturePage.evaluate(() => {
    const host = document.getElementById('url-auto-refresher-overlay-root');
    const root = host?.shadowRoot;
    if (!root) {
      return { ok: false as const, reason: 'no shadow root' };
    }
    const text = root.textContent ?? '';
    if (/\bMin\b/.test(text) || /\bSec\b/.test(text)) {
      return { ok: false as const, reason: 'Min/Sec labels still present' };
    }
    const pause = root.querySelector('[data-overlay-pause]');
    if (!pause || pause.textContent?.trim() !== 'Pause') {
      return { ok: false as const, reason: 'pause control' };
    }
    const row = root.querySelector('.timer-compact-row');
    if (!row?.classList.contains('timer-compact-row--with-pause')) {
      return { ok: false as const, reason: 'compact row + pause modifier' };
    }
    if (!row.querySelector('.timer-readout')) {
      return { ok: false as const, reason: 'timer readout' };
    }
    const digits = root.querySelectorAll('.digit');
    if (digits.length < 4) {
      return { ok: false as const, reason: `expected ≥4 digit tiles, got ${digits.length}` };
    }
    const colon = root.querySelector('.colon');
    if (!colon || colon.textContent !== ':') {
      return { ok: false as const, reason: 'colon' };
    }
    return { ok: true as const };
  });
  expect(compact).toEqual({ ok: true });

  await dash.close();
  await fixturePage.close();
});

test('Backlog 3: paused overlay is compact row — Play beside copy, not stacked', async () => {
  await ensureServiceWorkerReady(context, extensionId);

  const fixturePage = await context.newPage();
  await fixturePage.goto(`${FIXTURE_ORIGIN}/`);

  const dash = await context.newPage();
  await dash.goto(dashboardUrl(extensionId));
  await dash.evaluate(
    async ({
      storageKey,
      prefsKey,
      targetUrl,
    }: {
      storageKey: string;
      prefsKey: string;
      targetUrl: string;
    }) => {
      await chrome.storage.local.set({
        [storageKey]: {
          schemaVersion: 3,
          globalGroups: [],
          individualJobs: [
            {
              id: 'e2e-individual-paused',
              target: {
                targetUrl,
              },
              baseIntervalSec: 60,
              jitterSec: 0,
              enabled: true,
              overlayPaused: true,
              nextFireAt: Date.now() + 120_000,
            },
          ],
        },
        [prefsKey]: { showPageOverlayTimer: true },
      });
    },
    { storageKey: STORAGE_KEY, prefsKey: PREFS_STORAGE_KEY, targetUrl: FIXTURE_PAGE_TARGET_URL }
  );

  await waitForExtensionDebounce();
  await fixturePage.reload({ waitUntil: 'domcontentloaded' });
  await expectOverlayCardVisible(fixturePage);
  await expandOverlayIfMinimized(fixturePage);

  const layout = await fixturePage.evaluate(() => {
    const host = document.getElementById('url-auto-refresher-overlay-root');
    const root = host?.shadowRoot;
    if (!root) {
      return { ok: false as const, reason: 'no shadow root' };
    }
    const card = root.querySelector('.card--paused');
    if (!card) {
      return { ok: false as const, reason: 'expected .card--paused' };
    }
    const row = root.querySelector('.paused-compact-row');
    const label = row?.querySelector('.paused-text');
    const btn = root.querySelector('[data-overlay-resume]');
    if (!row || !label || !btn || btn.textContent?.trim() !== 'Play') {
      return { ok: false as const, reason: 'paused compact row / Play control' };
    }
    if (!label.textContent?.includes('Auto refresh paused')) {
      return { ok: false as const, reason: 'paused copy' };
    }
    const lr = label.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    const yOverlap = Math.min(lr.bottom, br.bottom) - Math.max(lr.top, br.top);
    if (yOverlap <= 0) {
      return { ok: false as const, reason: 'label and Play do not share a row (Y)' };
    }
    if (br.left < lr.right - 2) {
      return { ok: false as const, reason: 'Play should sit to the right of the label' };
    }
    return { ok: true as const };
  });
  expect(layout).toEqual({ ok: true });

  await dash.close();
  await fixturePage.close();
});

test('turning off overlay pref removes overlay from fixture page', async () => {
  await ensureServiceWorkerReady(context, extensionId);

  const fixturePage = await context.newPage();
  await fixturePage.goto(`${FIXTURE_ORIGIN}/`);

  const dash = await context.newPage();
  await dash.goto(dashboardUrl(extensionId));
  await dash.evaluate(
    async ({
      storageKey,
      prefsKey,
      targetUrl,
    }: {
      storageKey: string;
      prefsKey: string;
      targetUrl: string;
    }) => {
      await chrome.storage.local.set({
        [storageKey]: {
          schemaVersion: 3,
          globalGroups: [],
          individualJobs: [
            {
              id: 'e2e-individual',
              target: {
                targetUrl,
              },
              baseIntervalSec: 60,
              jitterSec: 0,
              enabled: true,
              nextFireAt: Date.now() + 120_000,
            },
          ],
        },
        [prefsKey]: { showPageOverlayTimer: true },
      });
    },
    { storageKey: STORAGE_KEY, prefsKey: PREFS_STORAGE_KEY, targetUrl: FIXTURE_PAGE_TARGET_URL }
  );

  await waitForExtensionDebounce();

  await fixturePage.reload({ waitUntil: 'domcontentloaded' });
  await expectOverlayCardVisible(fixturePage);

  await dash.locator('[data-pref-overlay]').setChecked(false);
  await expect(fixturePage.locator('#url-auto-refresher-overlay-root')).toHaveCount(0);

  await dash.close();
  await fixturePage.close();
});

test('Backlog #8: snap overlay left persists after reload', async () => {
  await ensureServiceWorkerReady(context, extensionId);

  const fixturePage = await context.newPage();
  await fixturePage.goto(`${FIXTURE_ORIGIN}/`);

  const dash = await context.newPage();
  await dash.goto(dashboardUrl(extensionId));
  await dash.evaluate(
    async ({
      storageKey,
      prefsKey,
      targetUrl,
    }: {
      storageKey: string;
      prefsKey: string;
      targetUrl: string;
    }) => {
      await chrome.storage.local.set({
        [storageKey]: {
          schemaVersion: 3,
          globalGroups: [],
          individualJobs: [
            {
              id: 'e2e-individual',
              target: { targetUrl },
              baseIntervalSec: 60,
              jitterSec: 0,
              enabled: true,
              nextFireAt: Date.now() + 120_000,
            },
          ],
        },
        [prefsKey]: { showPageOverlayTimer: true },
      });
    },
    { storageKey: STORAGE_KEY, prefsKey: PREFS_STORAGE_KEY, targetUrl: FIXTURE_PAGE_TARGET_URL }
  );

  await waitForExtensionDebounce();
  await fixturePage.reload({ waitUntil: 'domcontentloaded' });
  await expectOverlayCardVisible(fixturePage);
  await expandOverlayIfMinimized(fixturePage);

  const beforeSnap = await fixturePage.evaluate(() => {
    const host = document.getElementById('url-auto-refresher-overlay-root');
    if (!host) {
      return { ok: false as const };
    }
    return { ok: true as const, right: host.style.right, left: host.style.left };
  });
  expect(beforeSnap.ok).toBe(true);
  if (beforeSnap.ok) {
    expect(beforeSnap.right).toBe('12px');
    expect(beforeSnap.left).toBe('auto');
  }

  await fixturePage.evaluate(() => {
    const host = document.getElementById('url-auto-refresher-overlay-root');
    const snap = host?.shadowRoot?.querySelector('[data-overlay-snap]') as HTMLElement | null;
    snap?.click();
  });

  const afterSnap = await fixturePage.evaluate(() => {
    const host = document.getElementById('url-auto-refresher-overlay-root');
    if (!host) {
      return { ok: false as const };
    }
    return {
      ok: true as const,
      right: host.style.right,
      left: host.style.left,
      snapLeft: host.classList.contains('urlar-overlay--snap-left'),
    };
  });
  expect(afterSnap.ok).toBe(true);
  if (afterSnap.ok) {
    expect(afterSnap.left).toBe('12px');
    expect(afterSnap.right).toBe('auto');
    expect(afterSnap.snapLeft).toBe(true);
  }

  await fixturePage.reload({ waitUntil: 'domcontentloaded' });
  await expectOverlayCardVisible(fixturePage);
  await expandOverlayIfMinimized(fixturePage);

  const afterReload = await fixturePage.evaluate(() => {
    const host = document.getElementById('url-auto-refresher-overlay-root');
    if (!host) {
      return { ok: false as const };
    }
    return {
      ok: true as const,
      left: host.style.left,
      snapLeft: host.classList.contains('urlar-overlay--snap-left'),
    };
  });
  expect(afterReload.ok).toBe(true);
  if (afterReload.ok) {
    expect(afterReload.left).toBe('12px');
    expect(afterReload.snapLeft).toBe(true);
  }

  await dash.close();
  await fixturePage.close();
});

test('Backlog #8: drag overlay position persists after reload', async () => {
  await ensureServiceWorkerReady(context, extensionId);

  const fixturePage = await context.newPage();
  await fixturePage.goto(`${FIXTURE_ORIGIN}/`);

  const dash = await context.newPage();
  await dash.goto(dashboardUrl(extensionId));
  await dash.evaluate(
    async ({
      storageKey,
      prefsKey,
      targetUrl,
    }: {
      storageKey: string;
      prefsKey: string;
      targetUrl: string;
    }) => {
      await chrome.storage.local.set({
        [storageKey]: {
          schemaVersion: 3,
          globalGroups: [],
          individualJobs: [
            {
              id: 'e2e-individual',
              target: { targetUrl },
              baseIntervalSec: 60,
              jitterSec: 0,
              enabled: true,
              nextFireAt: Date.now() + 120_000,
            },
          ],
        },
        [prefsKey]: { showPageOverlayTimer: true },
      });
    },
    { storageKey: STORAGE_KEY, prefsKey: PREFS_STORAGE_KEY, targetUrl: FIXTURE_PAGE_TARGET_URL }
  );

  await waitForExtensionDebounce();
  await fixturePage.reload({ waitUntil: 'domcontentloaded' });
  await expectOverlayCardVisible(fixturePage);
  await expandOverlayIfMinimized(fixturePage);

  const afterDrag = await fixturePage.evaluate(async () => {
    const host = document.getElementById('url-auto-refresher-overlay-root');
    const handle = host?.shadowRoot?.querySelector(
      '[data-overlay-drag-handle]'
    ) as HTMLElement | null;
    if (!host || !handle) {
      return { ok: false as const };
    }
    const rect = handle.getBoundingClientRect();
    const startX = rect.left + rect.width / 2;
    const startY = rect.top + rect.height / 2;
    const deltaX = -80;
    const deltaY = 48;
    const pointer = (type: string, x: number, y: number) =>
      new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        button: 0,
        buttons: type === 'pointerup' ? 0 : 1,
        pointerId: 1,
        pointerType: 'mouse',
      });
    handle.dispatchEvent(pointer('pointerdown', startX, startY));
    handle.dispatchEvent(pointer('pointermove', startX + deltaX, startY + deltaY));
    handle.dispatchEvent(pointer('pointerup', startX + deltaX, startY + deltaY));
    await new Promise((r) => setTimeout(r, 80));
    const topNum = Number.parseFloat(host.style.top);
    const leftNum = Number.parseFloat(host.style.left);
    return {
      ok: true as const,
      top: host.style.top,
      left: host.style.left,
      right: host.style.right,
      topNum,
      leftNum,
    };
  });
  expect(afterDrag.ok).toBe(true);
  if (afterDrag.ok) {
    expect(afterDrag.right).toBe('auto');
    expect(afterDrag.topNum).toBeGreaterThan(12);
    expect(afterDrag.leftNum).toBeGreaterThan(4);
  }

  const storedAfterDrag = await dash.evaluate(async (prefsKey: string) => {
    const data = await chrome.storage.local.get(prefsKey);
    const prefs = data[prefsKey] as { overlayPosition?: { dragTop?: number; dragLeft?: number } };
    return prefs?.overlayPosition;
  }, PREFS_STORAGE_KEY);
  expect(storedAfterDrag?.dragTop).toBeCloseTo(afterDrag.ok ? afterDrag.topNum : 0, 1);
  expect(storedAfterDrag?.dragLeft).toBeCloseTo(afterDrag.ok ? afterDrag.leftNum : 0, 1);

  await fixturePage.reload({ waitUntil: 'domcontentloaded' });
  await expectOverlayCardVisible(fixturePage);
  await expandOverlayIfMinimized(fixturePage);

  const afterReload = await fixturePage.evaluate(() => {
    const host = document.getElementById('url-auto-refresher-overlay-root');
    if (!host) {
      return { ok: false as const };
    }
    return {
      ok: true as const,
      topNum: Number.parseFloat(host.style.top),
      leftNum: Number.parseFloat(host.style.left),
      right: host.style.right,
    };
  });
  expect(afterReload.ok).toBe(true);
  if (afterReload.ok && afterDrag.ok) {
    expect(afterReload.right).toBe('auto');
    expect(afterReload.topNum).toBeCloseTo(afterDrag.topNum, 1);
    expect(afterReload.leftNum).toBeCloseTo(afterDrag.leftNum, 1);
  }

  await dash.close();
  await fixturePage.close();
});
