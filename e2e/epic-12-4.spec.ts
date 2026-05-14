import { test, expect } from '@playwright/test';
import { dashboardUrl, launchExtensionContext } from './extension-helpers';

const STORAGE_KEY = 'urlAutoRefresher_state_v1';

/** Channel login reserved for CI-safe route mock (no real Twitch HTML). */
const MOCK_LOGIN = 'e2e12tw';
const MOCK_CHANNEL_URL = `https://www.twitch.tv/${MOCK_LOGIN}`;

const TWITCH_DOCUMENT_ROUTE = new RegExp(
  `^https://(www\\.)?twitch\\.tv/${MOCK_LOGIN}/?(\\?.*)?$`,
  'i'
);

/**
 * Epic 12.4 — TwitchFavs URL-first upsert from a real `tabs.onUpdated` path without loading Twitch.
 * Playwright serves a minimal document for the channel URL; the extension persists `targets` after debounce.
 */
test.describe('Epic 12.4: TwitchFavs CI-safe channel navigation', () => {
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

  test('stubbed Twitch channel tab adds canonical TwitchFavs target in storage', async () => {
    const dash = await context.newPage();
    await dash.goto(dashboardUrl(extensionId));

    await dash.evaluate(
      async ({ storageKey, channelUrl }) => {
        await chrome.storage.local.set({
          [storageKey]: {
            schemaVersion: 3,
            globalGroups: [
              {
                id: 'e2e-tw-favs',
                name: 'TwitchFavs',
                targets: [],
                urlPatterns: [channelUrl],
                baseIntervalSec: 120,
                jitterSec: 0,
                enabled: true,
              },
            ],
            individualJobs: [],
          },
        });
      },
      { storageKey: STORAGE_KEY, channelUrl: MOCK_CHANNEL_URL }
    );

    const twitchPage = await context.newPage();
    await twitchPage.route(TWITCH_DOCUMENT_ROUTE, async (route) => {
      if (route.request().resourceType() === 'document') {
        await route.fulfill({
          status: 200,
          contentType: 'text/html; charset=utf-8',
          body: '<!DOCTYPE html><html><head><meta charset="utf-8"><title>e2e12</title></head><body>e2e twitch stub</body></html>',
        });
      } else {
        await route.abort();
      }
    });

    await twitchPage.goto(MOCK_CHANNEL_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    await expect
      .poll(
        async () =>
          dash.evaluate(async (storageKey) => {
            const data = await chrome.storage.local.get(storageKey);
            const raw = data[storageKey as keyof typeof data] as
              | { globalGroups?: { targets?: { targetUrl: string }[] }[] }
              | undefined;
            return raw?.globalGroups?.[0]?.targets ?? null;
          }, STORAGE_KEY),
        { timeout: 25_000 }
      )
      .toEqual([{ targetUrl: MOCK_CHANNEL_URL }]);

    await twitchPage.close();
    await dash.close();
  });
});
