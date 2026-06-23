import { test } from '@playwright/test';
import {
  dashboardUrl,
  ensureServiceWorkerReady,
  launchExtensionContext,
} from './extension-helpers';
import {
  expectWatchLayoutProbeClicked,
  PREFS_STORAGE_KEY,
  stubTwitchWatchLayoutChannelRoute,
  twitchChannelUrl,
  waitForExtensionDebounce,
} from './twitch-stub-helpers';

test.describe.configure({ mode: 'serial' });

const LOGIN = 'e2e_watch_layout';

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

async function setWatchLayoutPrefFromExtensionPage(
  extensionPage: import('@playwright/test').Page,
  enabled: boolean
): Promise<void> {
  await extensionPage.evaluate(
    async ({ prefsKey, enabled: on }: { prefsKey: string; enabled: boolean }) => {
      const existing = (await chrome.storage.local.get(prefsKey))[prefsKey] ?? {};
      await chrome.storage.local.set({
        [prefsKey]: { ...existing, twitchWatchLayoutEnabled: on },
      });
    },
    { prefsKey: PREFS_STORAGE_KEY, enabled }
  );
  await waitForExtensionDebounce();
}

test('watch layout pref off skips theater; storage onChanged re-enable applies layout', async () => {
  await ensureServiceWorkerReady(context, extensionId);

  const dash = await context.newPage();
  await dash.goto(dashboardUrl(extensionId));
  await setWatchLayoutPrefFromExtensionPage(dash, false);

  const channelPage = await context.newPage();
  await stubTwitchWatchLayoutChannelRoute(channelPage, LOGIN, { live: true });
  await channelPage.goto(twitchChannelUrl(LOGIN), { waitUntil: 'domcontentloaded' });
  await channelPage.waitForTimeout(2_500);
  await expectWatchLayoutProbeClicked(channelPage, 'theater', false);

  await setWatchLayoutPrefFromExtensionPage(dash, true);
  await expectWatchLayoutProbeClicked(channelPage, 'theater', true);

  await dash.close();
  await channelPage.close();
});

test('watch layout pref off after reload does not apply theater', async () => {
  await ensureServiceWorkerReady(context, extensionId);

  const dash = await context.newPage();
  await dash.goto(dashboardUrl(extensionId));
  await setWatchLayoutPrefFromExtensionPage(dash, true);

  const channelPage = await context.newPage();
  await stubTwitchWatchLayoutChannelRoute(channelPage, LOGIN, { live: true });
  await channelPage.goto(twitchChannelUrl(LOGIN), { waitUntil: 'domcontentloaded' });
  await expectWatchLayoutProbeClicked(channelPage, 'theater', true);

  await setWatchLayoutPrefFromExtensionPage(dash, false);
  await channelPage.reload({ waitUntil: 'domcontentloaded' });
  await channelPage.waitForTimeout(2_500);
  await expectWatchLayoutProbeClicked(channelPage, 'theater', false);

  await dash.close();
  await channelPage.close();
});
