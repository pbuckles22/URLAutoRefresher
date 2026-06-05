import { test, expect } from '@playwright/test';
import { dashboardUrl, launchExtensionContext } from './extension-helpers';
import {
  STORAGE_KEY,
  expectOverlayAbsent,
  openTwitchStubAndExpectOverlay,
  seedTwitchFavsAndOverlayPrefs,
  stubTwitchBrowseRoute,
  stubTwitchChannelRoutes,
  twitchChannelUrl,
  waitForExtensionDebounce,
} from './twitch-stub-helpers';

/** CI-safe logins — not real Twitch channels. */
const HOME_LOGIN = 'e2e_snap_home';
const RAID_LOGIN = 'e2e_snap_raid';
const HOME_URL = twitchChannelUrl(HOME_LOGIN);
const RAID_URL = `${twitchChannelUrl(RAID_LOGIN)}?referrer=raid`;

const OVERLAY_A = 'e2e_ov_a';
const OVERLAY_B = 'e2e_ov_b';
const OVERLAY_C = 'e2e_ov_c';

const CLOSE_REOPEN_LOGIN = 'e2e_reopen_ch';
const CLOSE_REOPEN_URL = twitchChannelUrl(CLOSE_REOPEN_LOGIN);

/** Two favourites used to reproduce the fav→fav raid hint-poison sequence. */
const FAV_HOME_LOGIN = 'e2e_fav_home';
const FAV_OTHER_LOGIN = 'e2e_fav_other';
const FAV_HOME_URL = twitchChannelUrl(FAV_HOME_LOGIN);
const FAV_OTHER_URL = twitchChannelUrl(FAV_OTHER_LOGIN);
const FAV_OTHER_RAID_URL = `${FAV_OTHER_URL}?referrer=raid`;

/**
 * Gate 2 — TwitchFavs snap-back / overlay wiring (stubbed Twitch, default CI).
 * Backlog #10 close/reopen; immediate raid snap-back; multi-tab overlay; browse homepage.
 */
test.describe('Epic 12 Gate 2: TwitchFavs snap-back (CI stub)', () => {
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

  test('immediate snap-back restores home after raid detour URL', async () => {
    const dash = await context.newPage();
    await dash.goto(dashboardUrl(extensionId));
    await seedTwitchFavsAndOverlayPrefs(dash, { channelUrls: [HOME_URL] });

    const tab = await context.newPage();
    await stubTwitchChannelRoutes(tab, [HOME_LOGIN, RAID_LOGIN]);

    await tab.goto(HOME_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await waitForExtensionDebounce();

    await tab.goto(RAID_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    await expect
      .poll(async () => tab.url().replace(/\/$/, ''), { timeout: 25_000 })
      .toBe(HOME_URL.replace(/\/$/, ''));

    await tab.close();
    await dash.close();
  });

  test('repeated raid to ANOTHER favourite keeps snapping back home (no hint poison)', async () => {
    // Mirrors the manual UAT sequence: home favourite A, raid to favourite B twice.
    // Before the hint-poison fix the second raid stayed on B (and later navigations
    // could even snap back to B). Both raids must return to home A.
    const dash = await context.newPage();
    await dash.goto(dashboardUrl(extensionId));
    await seedTwitchFavsAndOverlayPrefs(dash, {
      channelUrls: [FAV_HOME_URL, FAV_OTHER_URL],
    });

    const tab = await context.newPage();
    await stubTwitchChannelRoutes(tab, [FAV_HOME_LOGIN, FAV_OTHER_LOGIN]);

    // Establish home on favourite A.
    await tab.goto(FAV_HOME_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await waitForExtensionDebounce();

    // First raid to favourite B → snaps back to A.
    await tab.goto(FAV_OTHER_RAID_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect
      .poll(async () => tab.url().replace(/\/$/, ''), { timeout: 25_000 })
      .toBe(FAV_HOME_URL.replace(/\/$/, ''));
    await waitForExtensionDebounce();

    // Second raid to favourite B → must STILL snap back to A (regression guard).
    await tab.goto(FAV_OTHER_RAID_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await expect
      .poll(async () => tab.url().replace(/\/$/, ''), { timeout: 25_000 })
      .toBe(FAV_HOME_URL.replace(/\/$/, ''));

    // Home must remain A and not flip to B after settling.
    await waitForExtensionDebounce();
    expect(tab.url().replace(/\/$/, '')).toBe(FAV_HOME_URL.replace(/\/$/, ''));

    await tab.close();
    await dash.close();
  });

  test('overlay appears on each of three stubbed fav channel tabs', async () => {
    const dash = await context.newPage();
    await dash.goto(dashboardUrl(extensionId));
    const logins = [OVERLAY_A, OVERLAY_B, OVERLAY_C];
    const urls = logins.map(twitchChannelUrl);
    await seedTwitchFavsAndOverlayPrefs(dash, { channelUrls: urls });

    const pages: Awaited<ReturnType<typeof context.newPage>>[] = [];
    for (const login of logins) {
      const p = await context.newPage();
      await openTwitchStubAndExpectOverlay(p, login);
      pages.push(p);
    }

    for (const p of pages) {
      await p.close();
    }
    await dash.close();
  });

  test('twitch homepage stub does not show overlay', async () => {
    const dash = await context.newPage();
    await dash.goto(dashboardUrl(extensionId));
    await seedTwitchFavsAndOverlayPrefs(dash, { channelUrls: [HOME_URL] });

    const browse = await context.newPage();
    await stubTwitchBrowseRoute(browse);
    await browse.goto('https://www.twitch.tv/', {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await waitForExtensionDebounce();
    await expectOverlayAbsent(browse);

    await browse.close();
    await dash.close();
  });

  test('Backlog #10: close channel tab and reopen — overlay on new tab', async () => {
    const dash = await context.newPage();
    await dash.goto(dashboardUrl(extensionId));
    await seedTwitchFavsAndOverlayPrefs(dash, {
      channelUrls: [CLOSE_REOPEN_URL],
      memberNextFireAt: { [`twitch.tv/${CLOSE_REOPEN_LOGIN}`]: Date.now() + 120_000 },
    });

    const first = await context.newPage();
    await openTwitchStubAndExpectOverlay(first, CLOSE_REOPEN_LOGIN);

    await first.close();

    const second = await context.newPage();
    await openTwitchStubAndExpectOverlay(second, CLOSE_REOPEN_LOGIN);

    await expect
      .poll(
        async () =>
          dash.evaluate(
            async ({ storageKey, targetUrl }: { storageKey: string; targetUrl: string }) => {
              const data = await chrome.storage.local.get(storageKey);
              const raw = data[storageKey as keyof typeof data] as
                | { globalGroups?: { targets?: { targetUrl: string }[] }[] }
                | undefined;
              const targets = raw?.globalGroups?.[0]?.targets ?? [];
              return targets.filter((t) => t.targetUrl === targetUrl).length;
            },
            { storageKey: STORAGE_KEY, targetUrl: CLOSE_REOPEN_URL }
          ),
        { timeout: 15_000 }
      )
      .toBe(1);

    await second.close();
    await dash.close();
  });
});
