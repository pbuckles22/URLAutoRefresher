import { test, expect } from '@playwright/test';
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

test('Epic 4.1: window/tab browser saves global group with per-tab target URLs', async () => {
  const fixturePage = await context.newPage();
  await fixturePage.goto(`${FIXTURE_ORIGIN}/`);

  const dash = await context.newPage();
  await dash.goto(dashboardUrl(extensionId));

  await dash.evaluate(
    async (storageKey) => {
      await chrome.storage.local.set({
        [storageKey]: { schemaVersion: 1, globalGroups: [], individualJobs: [] },
      });
    },
    STORAGE_KEY
  );

  const fixtureTabId = await dash.evaluate(async () => {
    const tabs = await chrome.tabs.query({ url: 'http://127.0.0.1:8765/*' });
    const id = tabs[0]?.id;
    if (id === undefined) {
      throw new Error('fixture tab not found');
    }
    return id;
  });

  await expect(dash.locator(`[data-global-tab-row="${fixtureTabId}"]`)).toBeAttached({
    timeout: 15_000,
  });

  await dash.locator('[data-global-group-name]').fill('E2E global group');
  await dash.locator(`[data-global-tab-row="${fixtureTabId}"] [data-global-tab-include]`).check();
  await dash
    .locator(`[data-global-tab-row="${fixtureTabId}"] [data-global-target-url]`)
    .fill('https://example.com/e2e-global');
  await dash.locator('[data-global-interval]').fill('55');
  await dash.locator('[data-global-jitter]').fill('4');
  await dash.locator('[data-global-group-form]').locator('[type="submit"]').click();

  await expect(dash.locator('[data-global-form-error]')).toHaveText('');

  const groups = await dash.evaluate(
    async (storageKey) => {
      const data = await chrome.storage.local.get(storageKey);
      const raw = data[storageKey as keyof typeof data] as { globalGroups?: unknown[] } | undefined;
      return raw?.globalGroups ?? [];
    },
    STORAGE_KEY
  );

  expect(groups).toHaveLength(1);
  expect(groups[0]).toMatchObject({
    name: 'E2E global group',
    baseIntervalSec: 55,
    jitterSec: 4,
    enabled: true,
    targets: [
      {
        tabId: fixtureTabId,
        targetUrl: 'https://example.com/e2e-global',
      },
    ],
  });

  await dash.close();
  await fixturePage.close();
});
