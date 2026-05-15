import { test, expect, type Page } from '@playwright/test';
import { dashboardUrl, FIXTURE_ORIGIN, launchExtensionContext } from './extension-helpers';

/** Keep in sync with `src/lib/messages.ts` (e2e not in tsconfig `include`). */
const PRECISION_VOLUME_APPLY = 'urlAutoRefresher:precisionVolumeApply' as const;

async function sendShortcutToFixtureTab(
  dash: Page,
  mode: 'index' | 'media',
  action: 'volume-up' | 'volume-down' | 'panic-mute'
): Promise<void> {
  await dash.evaluate(
    async ({ applyType, mode: m, action: a }) => {
      const tabs = await chrome.tabs.query({});
      const tab = tabs.find((t) => {
        const u = t.url ?? '';
        if (!u.includes('127.0.0.1:8765')) {
          return false;
        }
        if (m === 'media') {
          return u.includes('media.html');
        }
        return !u.includes('media.html');
      });
      if (tab?.id === undefined) {
        throw new Error(`No fixture tab (mode=${m})`);
      }
      await chrome.tabs.sendMessage(tab.id, {
        type: applyType,
        kind: 'shortcut',
        action: a,
      });
    },
    { applyType: PRECISION_VOLUME_APPLY, mode, action }
  );
}

async function readOsdText(fixturePage: Page): Promise<string | null> {
  return fixturePage.evaluate(() => {
    const host = document.querySelector('[data-precision-volume-osd]');
    const pill = host?.shadowRoot?.querySelector('.pill');
    return pill?.textContent?.trim() ?? null;
  });
}

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

test('Epic 11.7: shortcut volume OSD — no media copy', async () => {
  const fixturePage = await context.newPage();
  await fixturePage.goto(`${FIXTURE_ORIGIN}/`, { waitUntil: 'domcontentloaded' });

  const dash = await context.newPage();
  await dash.goto(dashboardUrl(extensionId));

  await sendShortcutToFixtureTab(dash, 'index', 'volume-up');

  await expect
    .poll(async () => readOsdText(fixturePage), { timeout: 15_000 })
    .toBe('No media on this page');

  await dash.close();
  await fixturePage.close();
});

test('Epic 11.7: shortcut volume OSD — level after volume-up on fixture video', async () => {
  const fixturePage = await context.newPage();
  await fixturePage.goto(`${FIXTURE_ORIGIN}/media.html`, { waitUntil: 'domcontentloaded' });

  const dash = await context.newPage();
  await dash.goto(dashboardUrl(extensionId));

  await sendShortcutToFixtureTab(dash, 'media', 'volume-up');

  await expect.poll(async () => readOsdText(fixturePage), { timeout: 15_000 }).toMatch(/[\d.]+%$/);

  await dash.close();
  await fixturePage.close();
});

test('Epic 11.7: shortcut volume OSD — Muted after panic on fixture video', async () => {
  const fixturePage = await context.newPage();
  await fixturePage.goto(`${FIXTURE_ORIGIN}/media.html`, { waitUntil: 'domcontentloaded' });

  const dash = await context.newPage();
  await dash.goto(dashboardUrl(extensionId));

  await sendShortcutToFixtureTab(dash, 'media', 'panic-mute');

  await expect.poll(async () => readOsdText(fixturePage), { timeout: 15_000 }).toBe('Muted');

  await dash.close();
  await fixturePage.close();
});
