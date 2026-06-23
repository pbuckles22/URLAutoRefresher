import { test, expect } from '@playwright/test';
import { dashboardUrl, FIXTURE_ORIGIN, launchExtensionContext } from './extension-helpers';
import { PREFS_STORAGE_KEY } from './twitch-stub-helpers';

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

test('Backlog #9: dashboard volume applies to focused window tab without picker override', async () => {
  const fixturePage = await context.newPage();
  await fixturePage.goto(`${FIXTURE_ORIGIN}/media.html`, { waitUntil: 'domcontentloaded' });

  const dash = await context.newPage();
  await dash.goto(dashboardUrl(extensionId));

  await expect(dash.locator('[data-precision-volume-tab]')).toHaveValue('');

  const numeric = dash.locator('[data-precision-volume-numeric]');
  await numeric.fill('0');
  await numeric.press('Enter');

  await expect
    .poll(
      async () =>
        dash.evaluate(async (prefsKey) => {
          const raw = await chrome.storage.local.get(prefsKey);
          const pv = raw[prefsKey]?.precisionVolume;
          return { lastTabId: pv?.lastTabId ?? null, lastLinearGain: pv?.lastLinearGain };
        }, PREFS_STORAGE_KEY),
      { timeout: 5000 }
    )
    .toEqual({ lastTabId: null, lastLinearGain: 0 });

  const mediaTabReachable = await dash.evaluate(async () => {
    const win = await chrome.windows.getLastFocused({ populate: true });
    const mediaTab = (win.tabs ?? []).find((t) => (t.url ?? '').includes('media.html'));
    if (mediaTab?.id === undefined) {
      return false;
    }
    try {
      const res = await chrome.tabs.sendMessage(mediaTab.id, {
        type: 'urlAutoRefresher:precisionVolumeApply',
        kind: 'set-linear-gain',
        linearGain: 0.25,
      });
      return res?.ok === true;
    } catch {
      return false;
    }
  });
  expect(mediaTabReachable).toBe(true);

  await dash.close();
  await fixturePage.close();
});
