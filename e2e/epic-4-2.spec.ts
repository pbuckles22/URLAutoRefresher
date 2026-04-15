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

test('Epic 4.2: Global (N) header, list row countdown, start/stop, edit, delete', async () => {
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

  await expect(dash.locator('[data-global-section-heading]')).toHaveText('Global (0)', {
    timeout: 10_000,
  });

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

  await dash.locator('[data-global-group-name]').fill('E2E global lifecycle');
  await dash.locator(`[data-global-tab-row="${fixtureTabId}"] [data-global-tab-include]`).check();
  await dash
    .locator(`[data-global-tab-row="${fixtureTabId}"] [data-global-target-url]`)
    .fill('https://example.com/e2e-42');
  await dash.locator('[data-global-interval]').fill('50');
  await dash.locator('[data-global-jitter]').fill('2');
  await dash.locator('[data-global-group-form]').locator('[type="submit"]').click();

  await expect(dash.locator('[data-global-form-error]')).toHaveText('');
  await expect(dash.locator('[data-global-section-heading]')).toHaveText('Global (1)');

  const row = dash.locator('[data-global-group-row]').first();
  await expect(row).toContainText('E2E global lifecycle');
  await expect(row.locator('[data-global-group-countdown]')).toBeAttached();

  await row.getByRole('button', { name: 'Stop' }).click();

  let stored = await dash.evaluate(
    async (storageKey) => {
      const data = await chrome.storage.local.get(storageKey);
      const raw = data[storageKey as keyof typeof data] as { globalGroups?: { enabled?: boolean }[] } | undefined;
      return raw?.globalGroups ?? [];
    },
    STORAGE_KEY
  );
  expect(stored).toHaveLength(1);
  expect(stored[0]?.enabled).toBe(false);

  await row.getByRole('button', { name: 'Start' }).click();

  stored = await dash.evaluate(
    async (storageKey) => {
      const data = await chrome.storage.local.get(storageKey);
      const raw = data[storageKey as keyof typeof data] as { globalGroups?: { enabled?: boolean }[] } | undefined;
      return raw?.globalGroups ?? [];
    },
    STORAGE_KEY
  );
  expect(stored[0]?.enabled).toBe(true);

  await row.locator('summary').filter({ hasText: 'Edit' }).click();
  await row.locator('[data-global-edit-name]').fill('Renamed group');
  await row.getByRole('button', { name: 'Save changes' }).click();
  await expect(row.locator('[data-global-edit-error]')).toHaveText('');

  const names = await dash.evaluate(
    async (storageKey) => {
      const data = await chrome.storage.local.get(storageKey);
      const raw = data[storageKey as keyof typeof data] as { globalGroups?: { name?: string }[] } | undefined;
      return raw?.globalGroups?.map((g) => g.name) ?? [];
    },
    STORAGE_KEY
  );
  expect(names).toEqual(['Renamed group']);

  await row.getByRole('button', { name: 'Delete' }).click();

  await expect(dash.locator('[data-global-section-heading]')).toHaveText('Global (0)');
  const afterDel = await dash.evaluate(
    async (storageKey) => {
      const data = await chrome.storage.local.get(storageKey);
      const raw = data[storageKey as keyof typeof data] as { globalGroups?: unknown[] } | undefined;
      return raw?.globalGroups ?? [];
    },
    STORAGE_KEY
  );
  expect(afterDel).toHaveLength(0);

  await dash.close();
  await fixturePage.close();
});
