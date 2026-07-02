import { test, expect } from '@playwright/test';
import { dashboardUrl, launchExtensionContext } from './extension-helpers';
import {
  PREFS_STORAGE_KEY,
  seedTwitchFavsAndOverlayPrefs,
  stubTwitchChannelRoutes,
  twitchChannelUrl,
  waitForExtensionDebounce,
} from './twitch-stub-helpers';

const HOME_LOGIN = 'e2e_channel_points_home';
const HOME_URL = twitchChannelUrl(HOME_LOGIN);

/**
 * Backlog #12 — channel points bonus auto-click (stubbed Twitch).
 */
test.describe('Backlog #12: channel points bonus auto-click (CI stub)', () => {
  test('auto-clicks Claim Bonus on armed home tab when pref enabled', async () => {
    const { context, extensionId } = await launchExtensionContext();
    try {
      const dash = await context.newPage();
      await dash.goto(dashboardUrl(extensionId));
      await seedTwitchFavsAndOverlayPrefs(dash, { channelUrls: [HOME_URL] });
      await dash.evaluate(
        async ({ prefsKey }) => {
          const data = await chrome.storage.local.get(prefsKey);
          const existing = (data[prefsKey as keyof typeof data] ?? {}) as Record<string, unknown>;
          await chrome.storage.local.set({
            [prefsKey]: { ...existing, twitchChannelPointsBonusEnabled: true },
          });
        },
        { prefsKey: PREFS_STORAGE_KEY }
      );

      const tab = await context.newPage();
      await stubTwitchChannelRoutes(tab, [HOME_LOGIN], {
        channelPointsBonusOnLogin: HOME_LOGIN,
      });

      await tab.goto(HOME_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await waitForExtensionDebounce();

      await expect
        .poll(
          async () =>
            tab.evaluate(() => {
              const btn = document.getElementById('urlar-bonus-claim');
              return btn?.dataset.urlarClaimed === '1';
            }),
          { timeout: 15_000 }
        )
        .toBe(true);

      await tab.close();
      await dash.close();
    } finally {
      await context.close();
    }
  });

  test('does not click when pref disabled', async () => {
    const { context, extensionId } = await launchExtensionContext();
    try {
      const dash = await context.newPage();
      await dash.goto(dashboardUrl(extensionId));
      await seedTwitchFavsAndOverlayPrefs(dash, { channelUrls: [HOME_URL] });

      const tab = await context.newPage();
      await stubTwitchChannelRoutes(tab, [HOME_LOGIN], {
        channelPointsBonusOnLogin: HOME_LOGIN,
      });

      await tab.goto(HOME_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await waitForExtensionDebounce();
      await tab.waitForTimeout(3_000);

      const claimed = await tab.evaluate(() => {
        const btn = document.getElementById('urlar-bonus-claim');
        return btn?.dataset.urlarClaimed === '1';
      });
      expect(claimed).toBe(false);

      await tab.close();
      await dash.close();
    } finally {
      await context.close();
    }
  });
});
