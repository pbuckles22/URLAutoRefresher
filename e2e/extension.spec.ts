import { test, expect, type Page } from '@playwright/test';
import { dashboardUrl, FIXTURE_ORIGIN, launchExtensionContext } from './extension-helpers';

const STORAGE_KEY = 'urlAutoRefresher_state_v1';

async function expectOverlayCardVisible(fixturePage: Page): Promise<void> {
  await expect
    .poll(
      async () =>
        fixturePage.evaluate(() => {
          const host = document.getElementById('url-auto-refresher-overlay-root');
          return !!(host?.shadowRoot?.querySelector('.card'));
        }),
      { timeout: 30_000 }
    )
    .toBe(true);
}

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
  const fixturePage = await context.newPage();
  await fixturePage.goto(`${FIXTURE_ORIGIN}/`);

  const dash = await context.newPage();
  await dash.goto(dashboardUrl(extensionId));
  await dash.evaluate(
    async (storageKey) => {
      const tabs = await chrome.tabs.query({ url: 'http://127.0.0.1:8765/*' });
      const tab = tabs[0];
      if (!tab?.id) {
        throw new Error(`fixture tab not found, got ${tabs.length} tab(s)`);
      }
      await chrome.storage.local.set({
        [storageKey]: {
          schemaVersion: 1,
          globalGroups: [],
          individualJobs: [
            {
              id: 'e2e-individual',
              target: {
                tabId: tab.id,
                windowId: tab.windowId,
                targetUrl: 'https://example.com/',
              },
              baseIntervalSec: 60,
              jitterSec: 0,
              enabled: true,
              nextFireAt: Date.now() + 120_000,
            },
          ],
        },
      });
    },
    STORAGE_KEY
  );

  // Let the service worker debounce + resync (storage listener) finish before the fixture tab reloads.
  await dash.waitForTimeout(500);

  // Storage updates from another tab may race the content script listener; reload guarantees sync.
  await fixturePage.reload({ waitUntil: 'domcontentloaded' });
  await expectOverlayCardVisible(fixturePage);
  await dash.close();
  await fixturePage.close();
});

test('turning off overlay pref removes overlay from fixture page', async () => {
  const fixturePage = await context.newPage();
  await fixturePage.goto(`${FIXTURE_ORIGIN}/`);

  const dash = await context.newPage();
  await dash.goto(dashboardUrl(extensionId));
  await dash.evaluate(
    async (storageKey) => {
      const tabs = await chrome.tabs.query({ url: 'http://127.0.0.1:8765/*' });
      const tab = tabs[0];
      if (!tab?.id) {
        throw new Error(`fixture tab not found, got ${tabs.length} tab(s)`);
      }
      await chrome.storage.local.set({
        [storageKey]: {
          schemaVersion: 1,
          globalGroups: [],
          individualJobs: [
            {
              id: 'e2e-individual',
              target: {
                tabId: tab.id,
                windowId: tab.windowId,
                targetUrl: 'https://example.com/',
              },
              baseIntervalSec: 60,
              jitterSec: 0,
              enabled: true,
              nextFireAt: Date.now() + 120_000,
            },
          ],
        },
      });
    },
    STORAGE_KEY
  );

  await dash.waitForTimeout(500);

  await fixturePage.reload({ waitUntil: 'domcontentloaded' });
  await expectOverlayCardVisible(fixturePage);

  await dash.locator('[data-pref-overlay]').setChecked(false);
  await expect(fixturePage.locator('#url-auto-refresher-overlay-root')).toHaveCount(0);

  await dash.close();
  await fixturePage.close();
});
