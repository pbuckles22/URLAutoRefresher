import { test, expect } from '@playwright/test';
import { dashboardUrl, launchExtensionContext } from './extension-helpers';
import {
  seedTwitchFavsAndOverlayPrefs,
  stubTwitchChannelRoutes,
  twitchChannelUrl,
  waitForExtensionDebounce,
} from './twitch-stub-helpers';

const HOME_LOGIN = 'e2e_raid_guard_home';
const HOME_URL = twitchChannelUrl(HOME_LOGIN);

/**
 * Gate 2 — Epic 14 proactive raid guard (stubbed Twitch).
 * When a TwitchFavs tab is on its home channel and a raid banner appears,
 * the extension auto-clicks Leave before navigation completes.
 */
test.describe('Epic 14 Gate 2: proactive raid guard (CI stub)', () => {
  test('auto-clicks Leave on armed home tab when chat raid notice appears', async () => {
    const { context, extensionId } = await launchExtensionContext();
    try {
      const dash = await context.newPage();
      await dash.goto(dashboardUrl(extensionId));
      await seedTwitchFavsAndOverlayPrefs(dash, { channelUrls: [HOME_URL] });

      const tab = await context.newPage();
      await stubTwitchChannelRoutes(tab, [HOME_LOGIN], { raidBannerOnLogin: HOME_LOGIN });

      await tab.goto(HOME_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
      await waitForExtensionDebounce();

      await expect
        .poll(
          async () =>
            tab.evaluate(() => {
              const btn = document.getElementById('urlar-raid-decline');
              return btn?.dataset.urlarDeclined === '1';
            }),
          { timeout: 15_000 }
        )
        .toBe(true);

      expect(tab.url().replace(/\/$/, '')).toBe(HOME_URL.replace(/\/$/, ''));

      await tab.close();
      await dash.close();
    } finally {
      await context.close();
    }
  });
});
