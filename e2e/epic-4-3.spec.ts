import { test, expect, type Page } from '@playwright/test';
import { dashboardUrl, FIXTURE_ORIGIN, launchExtensionContext } from './extension-helpers';

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

async function fixtureTabMeta(page: Page): Promise<{ tabId: number; windowId: number }> {
  return page.evaluate(async () => {
    const tabs = await chrome.tabs.query({ url: 'http://127.0.0.1:8765/*' });
    const t = tabs[0];
    if (t?.id === undefined || t.windowId === undefined) {
      throw new Error('fixture tab not found');
    }
    return { tabId: t.id, windowId: t.windowId };
  });
}

test('Epic 4.3: add global form shows mutual exclusion when tab has enabled individual job', async () => {
  const fixturePage = await context.newPage();
  await fixturePage.goto(`${FIXTURE_ORIGIN}/`);

  const dash = await context.newPage();
  await dash.goto(dashboardUrl(extensionId));

  const { tabId, windowId } = await fixtureTabMeta(dash);

  await dash.evaluate(
    async ({ storageKey, tabId: tid, windowId: wid }) => {
      await chrome.storage.local.set({
        [storageKey]: {
          schemaVersion: 1,
          globalGroups: [],
          individualJobs: [
            {
              id: 'e2e-ind',
              target: {
                tabId: tid,
                windowId: wid,
                targetUrl: 'https://example.com/e2e-ind',
              },
              baseIntervalSec: 60,
              jitterSec: 0,
              enabled: true,
            },
          ],
        },
      });
    },
    { storageKey: STORAGE_KEY, tabId, windowId }
  );

  await expect(dash.locator('[data-global-section-heading]')).toHaveText('Global (0)', { timeout: 10_000 });

  await dash.locator('[data-global-refresh-tabs]').click();
  await expect(dash.locator(`[data-global-tab-row="${tabId}"]`)).toBeAttached({ timeout: 15_000 });

  await dash.locator('[data-global-group-name]').fill('E2E conflict');
  await dash.locator(`[data-global-tab-row="${tabId}"] [data-global-tab-include]`).check();
  await dash.locator(`[data-global-tab-row="${tabId}"] [data-global-target-url]`).fill('https://example.com/e2e-g');
  await dash.locator('[data-global-interval]').fill('50');
  await dash.locator('[data-global-jitter]').fill('0');
  await dash.locator('[data-global-group-form]').locator('[type="submit"]').click();

  await expect(dash.locator('[data-global-form-error]')).toContainText(
    'cannot be in an enabled global group and an enabled individual job',
    { timeout: 10_000 }
  );
});

test('Epic 4.3: add individual form shows mutual exclusion when tab is in enabled global group', async () => {
  const fixturePage = await context.newPage();
  await fixturePage.goto(`${FIXTURE_ORIGIN}/`);

  const dash = await context.newPage();
  await dash.goto(dashboardUrl(extensionId));

  const { tabId, windowId } = await fixtureTabMeta(dash);

  await dash.evaluate(
    async ({ storageKey, tabId: tid, windowId: wid }) => {
      await chrome.storage.local.set({
        [storageKey]: {
          schemaVersion: 1,
          globalGroups: [
            {
              id: 'e2e-gg',
              name: 'E2E global',
              targets: [
                {
                  tabId: tid,
                  windowId: wid,
                  targetUrl: 'https://example.com/e2e-g2',
                },
              ],
              baseIntervalSec: 60,
              jitterSec: 0,
              enabled: true,
            },
          ],
          individualJobs: [],
        },
      });
    },
    { storageKey: STORAGE_KEY, tabId, windowId }
  );

  await expect(dash.locator('[data-global-section-heading]')).toHaveText('Global (1)', { timeout: 10_000 });

  await dash.locator('[data-job-tab]').selectOption(String(tabId));
  await dash.locator('[data-job-target-url]').fill('https://example.com/e2e-new-ind');
  await dash.locator('[data-job-interval]').fill('45');
  await dash.locator('[data-job-jitter]').fill('0');
  await dash.locator('[data-add-individual-form]').locator('[type="submit"]').click();

  await expect(dash.locator('[data-add-job-error]')).toContainText(
    'cannot be in an enabled global group and an enabled individual job',
    { timeout: 10_000 }
  );
});

test('Epic 4.3: Start on global row shows error when enabled individual uses the same tab', async () => {
  const fixturePage = await context.newPage();
  await fixturePage.goto(`${FIXTURE_ORIGIN}/`);

  const dash = await context.newPage();
  await dash.goto(dashboardUrl(extensionId));

  const { tabId, windowId } = await fixtureTabMeta(dash);

  await dash.evaluate(
    async ({ storageKey, tabId: tid, windowId: wid }) => {
      await chrome.storage.local.set({
        [storageKey]: {
          schemaVersion: 1,
          globalGroups: [
            {
              id: 'e2e-gg-off',
              name: 'Off group',
              targets: [
                {
                  tabId: tid,
                  windowId: wid,
                  targetUrl: 'https://example.com/e2e-g3',
                },
              ],
              baseIntervalSec: 60,
              jitterSec: 0,
              enabled: false,
            },
          ],
          individualJobs: [
            {
              id: 'e2e-ind-on',
              target: {
                tabId: tid,
                windowId: wid,
                targetUrl: 'https://example.com/e2e-ind2',
              },
              baseIntervalSec: 60,
              jitterSec: 0,
              enabled: true,
            },
          ],
        },
      });
    },
    { storageKey: STORAGE_KEY, tabId, windowId }
  );

  await expect(dash.locator('[data-global-section-heading]')).toHaveText('Global (1)', { timeout: 10_000 });

  const row = dash.locator('[data-global-group-row="e2e-gg-off"]');
  await expect(row.locator('[data-global-group-toggle]')).toHaveText('Start');
  await row.locator('[data-global-group-toggle]').click();

  await expect(row.locator('[data-global-group-row-error]')).toContainText(
    'cannot be in an enabled global group and an enabled individual job',
    { timeout: 10_000 }
  );
});
