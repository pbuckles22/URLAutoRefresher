import { expect, type Page } from '@playwright/test';

export const STORAGE_KEY = 'urlAutoRefresher_state_v1';
export const PREFS_STORAGE_KEY = 'urlAutoRefresher_prefs_v1';

const STUB_HTML = (title: string) =>
  `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title></head><body>${title}</body></html>`;

export function twitchChannelUrl(login: string): string {
  return `https://www.twitch.tv/${login}`;
}

/** Stub document responses for channel-root URLs (one or more logins). */
export async function stubTwitchChannelRoutes(
  page: Page,
  logins: readonly string[]
): Promise<void> {
  const escaped = logins.map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const channelRe = new RegExp(`^https://(www\\.)?twitch\\.tv/(${escaped})/?(\\?.*)?$`, 'i');
  await page.route(channelRe, async (route) => {
    if (route.request().resourceType() === 'document') {
      const url = route.request().url();
      const login = url.match(/twitch\.tv\/([^/?#]+)/i)?.[1] ?? 'stub';
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: STUB_HTML(login),
      });
    } else {
      await route.abort();
    }
  });
}

/** Stub twitch.tv homepage / directory (no single-segment channel). */
export async function stubTwitchBrowseRoute(page: Page): Promise<void> {
  const browseRe = /^https:\/\/(www\.)?twitch\.tv\/?(\?.*)?$/i;
  await page.route(browseRe, async (route) => {
    if (route.request().resourceType() === 'document') {
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: STUB_HTML('twitch-home'),
      });
    } else {
      await route.abort();
    }
  });
}

/** Stub twitch.tv/videos (unrelated path segment — must not match a channel favourite). */
export async function stubTwitchVideosRoute(page: Page): Promise<void> {
  const videosRe = /^https:\/\/(www\.)?twitch\.tv\/videos\/?(\?.*)?$/i;
  await page.route(videosRe, async (route) => {
    if (route.request().resourceType() === 'document') {
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: STUB_HTML('twitch-videos'),
      });
    } else {
      await route.abort();
    }
  });
}

export type SeedTwitchFavsOptions = {
  groupId?: string;
  channelUrls: readonly string[];
  enabled?: boolean;
  memberNextFireAt?: Record<string, number>;
};

/** Seed TwitchFavs + overlay prefs from an extension page (dashboard). */
export async function seedTwitchFavsAndOverlayPrefs(
  extensionPage: Page,
  opts: SeedTwitchFavsOptions
): Promise<void> {
  const groupId = opts.groupId ?? 'e2e-tw-favs';
  const enabled = opts.enabled !== false;
  await extensionPage.evaluate(
    async ({ storageKey, prefsKey, groupId: gid, channelUrls, enabled: en, memberNextFireAt }) => {
      const memberKey = (url: string) => {
        const u = new URL(url);
        const host = u.hostname.replace(/^www\./i, '').toLowerCase();
        const path = u.pathname.replace(/\/$/, '').toLowerCase();
        return `${host}${path}`;
      };
      const nextFire = Date.now() + 120_000;
      const fireAt =
        memberNextFireAt ?? Object.fromEntries(channelUrls.map((u) => [memberKey(u), nextFire]));

      await chrome.storage.local.set({
        [storageKey]: {
          schemaVersion: 3,
          globalGroups: [
            {
              id: gid,
              name: 'TwitchFavs',
              targets: channelUrls.map((targetUrl) => ({ targetUrl })),
              urlPatterns: [...channelUrls],
              baseIntervalSec: 120,
              jitterSec: 0,
              enabled: en,
              memberNextFireAt: fireAt,
            },
          ],
          individualJobs: [],
        },
        [prefsKey]: {
          showPageOverlayTimer: true,
          showOverlaySnapBackDebug: true,
          precisionVolume: { lastTabId: null, lastLinearGain: 1 },
        },
      });
    },
    {
      storageKey: STORAGE_KEY,
      prefsKey: PREFS_STORAGE_KEY,
      groupId,
      channelUrls: opts.channelUrls,
      enabled,
      memberNextFireAt: opts.memberNextFireAt,
    }
  );
  await extensionPage.waitForTimeout(500);
}

/** Reload then poll until overlay shadow card exists (storage may race first inject). */
export async function openTwitchStubAndExpectOverlay(page: Page, login: string): Promise<void> {
  await stubTwitchChannelRoutes(page, [login]);
  await page.goto(twitchChannelUrl(login), {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expectOverlayCardVisible(page);
}

/** Allow service worker debounce (TwitchFavs upsert + sched listeners). */
export async function waitForExtensionDebounce(ms = 900): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

export async function expectOverlayCardVisible(page: Page): Promise<void> {
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const host = document.getElementById('url-auto-refresher-overlay-root');
          return !!host?.shadowRoot?.querySelector('.card');
        }),
      { timeout: 30_000 }
    )
    .toBe(true);
}

/** Overlay sync may start minimized; expand before asserting timer/paused layout. */
export async function expandOverlayIfMinimized(page: Page): Promise<void> {
  await page.evaluate(() => {
    const host = document.getElementById('url-auto-refresher-overlay-root');
    const expand = host?.shadowRoot?.querySelector('[data-overlay-expand]') as HTMLElement | null;
    expand?.click();
  });
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const host = document.getElementById('url-auto-refresher-overlay-root');
          const root = host?.shadowRoot;
          if (!root) {
            return false;
          }
          return !!(
            root.querySelector('[data-overlay-pause]') ||
            root.querySelector('.paused-compact-row') ||
            root.querySelector('.timer-compact-row')
          );
        }),
      { timeout: 10_000 }
    )
    .toBe(true);
}

export async function expectOverlayAbsent(page: Page): Promise<void> {
  await expect
    .poll(
      async () =>
        page.evaluate(() => {
          const host = document.getElementById('url-auto-refresher-overlay-root');
          const card = host?.shadowRoot?.querySelector('.card');
          return !card;
        }),
      { timeout: 15_000 }
    )
    .toBe(true);
}
