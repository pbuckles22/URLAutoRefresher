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

test('Epic 4.2b: edit global group — add second tab with + and Save', async () => {
  const fixturePage1 = await context.newPage();
  await fixturePage1.goto(`${FIXTURE_ORIGIN}/`);
  const fixturePage2 = await context.newPage();
  await fixturePage2.goto(`${FIXTURE_ORIGIN}/`);

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

  const tabIds = await dash.evaluate(async () => {
    const tabs = await chrome.tabs.query({ url: 'http://127.0.0.1:8765/*' });
    const ids = tabs.map((t) => t.id).filter((x): x is number => x !== undefined);
    ids.sort((a, b) => a - b);
    return ids;
  });
  expect(tabIds.length).toBeGreaterThanOrEqual(2);
  const tabA = tabIds[0]!;
  const tabB = tabIds[1]!;

  await expect(dash.locator(`[data-global-tab-row="${tabA}"]`)).toBeAttached({ timeout: 15_000 });

  await dash.locator('[data-global-group-name]').fill('E2E add member');
  await dash.locator(`[data-global-tab-row="${tabA}"] [data-global-tab-include]`).check();
  await dash.locator(`[data-global-tab-row="${tabA}"] [data-global-target-url]`).fill('https://example.com/e2e-a');
  await dash.locator('[data-global-interval]').fill('60');
  await dash.locator('[data-global-jitter]').fill('0');
  await dash.locator('[data-global-group-form]').locator('[type="submit"]').click();

  await expect(dash.locator('[data-global-form-error]')).toHaveText('');
  await expect(dash.locator('[data-global-section-heading]')).toHaveText('Global (1)');

  const row = dash.locator('[data-global-group-row]').first();
  await row.locator('summary').filter({ hasText: 'Edit' }).click();
  await row.locator('[data-global-edit-add-target]').click();

  const newRow = row.locator('[data-global-edit-new-target]');
  await newRow.locator('[data-global-edit-pick-tab]').selectOption(String(tabB));
  await newRow.locator('[data-global-edit-target-url]').fill('https://example.com/e2e-b');

  await row.getByRole('button', { name: 'Save changes' }).click();
  await expect(row.locator('[data-global-edit-error]')).toHaveText('');

  const stored = await dash.evaluate(
    async (storageKey) => {
      const data = await chrome.storage.local.get(storageKey);
      const raw = data[storageKey as keyof typeof data] as
        | { globalGroups?: { targets?: { tabId: number }[] }[] }
        | undefined;
      return raw?.globalGroups?.[0]?.targets ?? [];
    },
    STORAGE_KEY
  );
  expect(stored).toHaveLength(2);
  const got = stored.map((t) => t.tabId).sort((a, b) => a - b);
  expect(got).toEqual([tabA, tabB].sort((a, b) => a - b));

  await dash.close();
  await fixturePage1.close();
  await fixturePage2.close();
});
