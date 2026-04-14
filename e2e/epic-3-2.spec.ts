import { test, expect } from '@playwright/test';
import { dashboardUrl, FIXTURE_ORIGIN, launchExtensionContext } from './extension-helpers';

const STORAGE_KEY = 'urlAutoRefresher_state_v1';

/**
 * Epic 3.2 — Start/Stop, edit, delete, one countdown row per job.
 * Un-skip this describe when the dashboard exposes the hooks below.
 */
test.describe.skip('Epic 3.2: individual job lifecycle on dashboard', () => {
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

  test('Stop disables job in storage; Start re-enables', async () => {
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
                id: 'e2e-job',
                target: {
                  tabId,
                  windowId: 0,
                  targetUrl: 'https://example.com/e2e-32',
                },
                baseIntervalSec: 60,
                jitterSec: 0,
                enabled: true,
              },
            ],
          },
        });
      },
      { storageKey: STORAGE_KEY, tabId: fixtureTabId }
    );

    await dash.reload();

    await dash.locator('[data-individual-job-row="e2e-job"] [data-job-toggle]').click();
    const enabledAfterStop = await dash.evaluate(async (storageKey) => {
      const data = await chrome.storage.local.get(storageKey);
      const raw = data[storageKey as keyof typeof data] as { individualJobs?: { enabled: boolean }[] } | undefined;
      return raw?.individualJobs?.[0]?.enabled;
    }, STORAGE_KEY);
    expect(enabledAfterStop).toBe(false);

    await dash.locator('[data-individual-job-row="e2e-job"] [data-job-toggle]').click();
    const enabledAfterStart = await dash.evaluate(async (storageKey) => {
      const data = await chrome.storage.local.get(storageKey);
      const raw = data[storageKey as keyof typeof data] as { individualJobs?: { enabled: boolean }[] } | undefined;
      return raw?.individualJobs?.[0]?.enabled;
    }, STORAGE_KEY);
    expect(enabledAfterStart).toBe(true);

    await dash.close();
    await fixturePage.close();
  });

  test('Delete removes job from storage', async () => {
    const fixturePage = await context.newPage();
    await fixturePage.goto(`${FIXTURE_ORIGIN}/`);
    const dash = await context.newPage();
    await dash.goto(dashboardUrl(extensionId));

    await dash.evaluate(async (storageKey) => {
      await chrome.storage.local.set({
        [storageKey]: {
          schemaVersion: 1,
          globalGroups: [],
          individualJobs: [
            {
              id: 'del-me',
              target: { tabId: 1, windowId: 0, targetUrl: 'https://example.com/del' },
              baseIntervalSec: 30,
              jitterSec: 0,
              enabled: false,
            },
          ],
        },
      });
    }, STORAGE_KEY);

    await dash.reload();
    await dash.locator('[data-individual-job-row="del-me"] [data-job-delete]').click();

    const jobs = await dash.evaluate(async (storageKey) => {
      const data = await chrome.storage.local.get(storageKey);
      const raw = data[storageKey as keyof typeof data] as { individualJobs?: unknown[] } | undefined;
      return raw?.individualJobs ?? [];
    }, STORAGE_KEY);
    expect(jobs).toHaveLength(0);

    await dash.close();
    await fixturePage.close();
  });

  test('shows one countdown row per job', async () => {
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
                id: 'c1',
                target: { tabId, windowId: 0, targetUrl: 'https://a.com' },
                baseIntervalSec: 60,
                jitterSec: 0,
                enabled: true,
                nextFireAt: Date.now() + 60_000,
              },
              {
                id: 'c2',
                target: { tabId, windowId: 0, targetUrl: 'https://b.com' },
                baseIntervalSec: 120,
                jitterSec: 0,
                enabled: true,
                nextFireAt: Date.now() + 120_000,
              },
            ],
          },
        });
      },
      { storageKey: STORAGE_KEY, tabId: fixtureTabId }
    );

    await dash.reload();

    await expect(dash.locator('[data-individual-job-row] [data-job-countdown]')).toHaveCount(2);

    await dash.close();
    await fixturePage.close();
  });
});
