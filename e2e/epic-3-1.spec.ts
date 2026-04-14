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

test('Epic 3.1: dashboard form saves individual job to storage', async () => {
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

  await expect(dash.locator(`[data-job-tab] option[value="${fixtureTabId}"]`)).toBeAttached({
    timeout: 15_000,
  });
  await dash.locator('[data-job-tab]').selectOption(String(fixtureTabId));
  await dash.locator('[data-job-target-url]').fill('https://example.com/e2e');
  await dash.locator('[data-job-interval]').fill('45');
  await dash.locator('[data-job-jitter]').fill('2');
  await dash.locator('[data-add-individual-form]').locator('[type="submit"]').click();

  await expect(dash.locator('[data-add-job-error]')).toHaveText('');

  const jobs = await dash.evaluate(
    async (storageKey) => {
      const data = await chrome.storage.local.get(storageKey);
      const raw = data[storageKey as keyof typeof data] as { individualJobs?: unknown[] } | undefined;
      return raw?.individualJobs ?? [];
    },
    STORAGE_KEY
  );

  expect(jobs).toHaveLength(1);
  expect(jobs[0]).toMatchObject({
    target: { tabId: fixtureTabId, targetUrl: 'https://example.com/e2e' },
    baseIntervalSec: 45,
    jitterSec: 2,
    enabled: true,
  });

  await dash.close();
  await fixturePage.close();
});
