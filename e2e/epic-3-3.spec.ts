import { test, expect } from '@playwright/test';
import { dashboardUrl, FIXTURE_ORIGIN, launchExtensionContext } from './extension-helpers';

const STORAGE_KEY = 'urlAutoRefresher_state_v1';

/** Epic 3.3 — shared list row module (`createIndividualJobListRow`); stable `data-*` contract for dashboard and future UI. */
test.describe('Epic 3.3: shared individual job list row', () => {
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

  test('row exposes summary line and action hooks used by Epic 3.2 flows', async () => {
    const fixturePage = await context.newPage();
    await fixturePage.goto(`${FIXTURE_ORIGIN}/`);
    const dash = await context.newPage();
    await dash.goto(dashboardUrl(extensionId));

    const fixtureTabId = await dash.evaluate(async () => {
      const tabs = await chrome.tabs.query({ url: 'http://127.0.0.1:8765/*' });
      const id = tabs[0]?.id;
      if (id === undefined) {
        throw new Error('fixture tab not found');
      }
      return id;
    });

    await dash.evaluate(
      async ({ storageKey, tabId }) => {
        await chrome.storage.local.set({
          [storageKey]: {
            schemaVersion: 1,
            globalGroups: [],
            individualJobs: [
              {
                id: 'row-contract',
                target: {
                  tabId,
                  windowId: 0,
                  targetUrl: 'https://example.com/row-contract',
                },
                baseIntervalSec: 90,
                jitterSec: 2,
                enabled: true,
                nextFireAt: Date.now() + 60_000,
              },
            ],
          },
        });
      },
      { storageKey: STORAGE_KEY, tabId: fixtureTabId }
    );

    await dash.reload();

    const row = dash.locator('[data-individual-job-row="row-contract"]');
    await expect(row).toBeVisible();
    await expect(row.locator('[data-job-countdown]')).toBeVisible();
    await expect(row.locator('[data-job-toggle]')).toBeVisible();
    await expect(row.locator('[data-job-delete]')).toBeVisible();
    await expect(row.locator('[data-job-edit-url]')).toHaveCount(1);

    const summaryText = await row.evaluate((el) => {
      const top = el.querySelector('div');
      const line = top?.querySelector('span:not([data-job-countdown])');
      return line?.textContent ?? '';
    });
    expect(summaryText).toBe(
      `Tab ${fixtureTabId} → https://example.com/row-contract · every 90s ±2s`
    );

    await dash.close();
    await fixturePage.close();
  });
});
