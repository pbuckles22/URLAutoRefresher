import { test, expect } from '@playwright/test';
import { dashboardUrl, sidepanelUrl, launchExtensionContext, FIXTURE_ORIGIN } from './extension-helpers';

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

test('Epic 5.1: dashboard shows Global (N) and Individual (M) counts', async () => {
  const dash = await context.newPage();
  await dash.goto(dashboardUrl(extensionId));
  await expect(dash.locator('[data-global-section-heading]')).toHaveText('Global (0)', {
    timeout: 10_000,
  });
  await expect(dash.locator('[data-individual-section-heading]')).toHaveText('Individual (0)', {
    timeout: 10_000,
  });
  await expect(dash.locator('[data-browse-layout]')).toBeVisible();
  await dash.close();
});

test('Epic 5.2: side panel lists mirror dashboard headings', async () => {
  const panel = await context.newPage();
  await panel.goto(sidepanelUrl(extensionId));
  await expect(panel.locator('[data-global-section-heading]')).toHaveText('Global (0)', {
    timeout: 10_000,
  });
  await expect(panel.locator('[data-individual-section-heading]')).toHaveText('Individual (0)', {
    timeout: 10_000,
  });
  await expect(panel.locator('[data-browse-layout]')).toBeVisible();
  await panel.close();
});

test('Epic 5.3: cross-surface — dashboard offers Open side panel; side panel offers Open in a tab', async () => {
  const dash = await context.newPage();
  await dash.goto(dashboardUrl(extensionId));
  await expect(dash.locator('[data-open-side-panel]')).toBeVisible();
  await expect(dash.locator('[data-open-in-tab]')).toBeHidden();
  await dash.close();

  const panel = await context.newPage();
  await panel.goto(sidepanelUrl(extensionId));
  await expect(panel.locator('[data-open-in-tab]')).toBeVisible();
  await expect(panel.locator('[data-open-side-panel]')).toBeHidden();
  await panel.close();
});

test('Backlog 1: side panel Open in a tab is first in body and opens packaged dashboard', async () => {
  const panel = await context.newPage();
  await panel.goto(sidepanelUrl(extensionId));

  const openBtn = panel.locator('[data-open-in-tab]');
  await expect(openBtn).toBeVisible({ timeout: 10_000 });

  const firstMeaningfulChildIsCta = await panel.evaluate(() => {
    const body = document.body;
    const first = body.firstElementChild;
    return first?.matches('[data-sidepanel-open-dashboard-row]') === true;
  });
  expect(firstMeaningfulChildIsCta).toBe(true);

  await openBtn.click();

  const hasDashboardTab = await panel.evaluate(async () => {
    const tabs = await chrome.tabs.query({});
    return tabs.some((t) => (t.url ?? '').includes('dashboard/dashboard.html'));
  });
  expect(hasDashboardTab).toBe(true);

  await panel.close();
});

test('Epic 5.4: individual job countdown text updates over time (1s dashboard tick)', async () => {
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

  const nextFireAt = Date.now() + 95_000;
  await dash.evaluate(
    async ({ storageKey, tabId, next }) => {
      await chrome.storage.local.set({
        [storageKey]: {
          schemaVersion: 1,
          globalGroups: [],
          individualJobs: [
            {
              id: 'tick-e2e',
              target: {
                tabId,
                windowId: 0,
                targetUrl: 'https://example.com/tick-e2e',
              },
              baseIntervalSec: 60,
              jitterSec: 0,
              enabled: true,
              nextFireAt: next,
            },
          ],
        },
      });
    },
    { storageKey: STORAGE_KEY, tabId: fixtureTabId, next: nextFireAt }
  );

  await dash.reload();

  const loc = dash.locator('[data-individual-job-row="tick-e2e"] [data-job-countdown]');
  await expect(loc).toBeVisible({ timeout: 10_000 });
  const first = await loc.textContent();
  expect(first).toMatch(/^\d+:\d{2}$/);

  await dash.waitForTimeout(2500);

  const second = await loc.textContent();
  expect(second).toMatch(/^\d+:\d{2}$/);
  expect(second).not.toBe(first);

  await dash.close();
  await fixturePage.close();
});
