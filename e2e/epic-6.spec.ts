import { test, expect } from '@playwright/test';
import { dashboardUrl, FIXTURE_ORIGIN, launchExtensionContext } from './extension-helpers';

const STORAGE_KEY = 'urlAutoRefresher_state_v1';

/** Epic 6 — toolbar badge reflects nearest nextFireAt after storage sync (service worker + debounced bootstrap). */
test.describe('Epic 6: focus-aware toolbar badge', () => {
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

  test('badge shows m:ss countdown when an enabled job has nextFireAt (not idle ×)', async () => {
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

    const nextFireAt = Date.now() + 125_000;
    await dash.evaluate(
      async ({ storageKey, tabId, next }) => {
        await chrome.storage.local.set({
          [storageKey]: {
            schemaVersion: 1,
            globalGroups: [],
            individualJobs: [
              {
                id: 'badge-e2e',
                target: {
                  tabId,
                  windowId: 0,
                  targetUrl: 'https://example.com/badge-e2e',
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

    await expect
      .poll(
        async () =>
          dash.evaluate(async () => {
            const t = await chrome.action.getBadgeText({});
            return t ?? '';
          }),
        { timeout: 15_000 }
      )
      .toMatch(/^\d+:\d{2}$/);

    await dash.close();
    await fixturePage.close();
  });
});
