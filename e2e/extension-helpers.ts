import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, type BrowserContext } from '@playwright/test';

/** Must match playwright.config.ts webServer URL (content scripts are http/https only). */
export const FIXTURE_ORIGIN = 'http://127.0.0.1:8765';

const e2eDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(e2eDir, '..');

function parseExtensionIdFromWorkerUrl(workerUrl: string): string | null {
  const match = /chrome-extension:\/\/([^/]+)\//.exec(workerUrl);
  return match ? match[1]! : null;
}

/** Wait until this extension's MV3 service worker registers (unpacked load is the only extension). */
async function waitForExtensionServiceWorker(
  context: BrowserContext,
  timeoutMs: number
): Promise<{ url: string }> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    for (const w of context.serviceWorkers()) {
      const u = w.url();
      if (u.startsWith('chrome-extension://') && parseExtensionIdFromWorkerUrl(u)) {
        return { url: u };
      }
    }
    await new Promise((r) => setTimeout(r, 100));
  }
  throw new Error(
    `No chrome-extension service worker within ${timeoutMs}ms. Known workers: ${context
      .serviceWorkers()
      .map((w) => w.url())
      .join(', ') || '(none)'}`
  );
}

export async function launchExtensionContext(): Promise<{
  context: BrowserContext;
  extensionId: string;
  userDataDir: string;
}> {
  const root = repoRoot;
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'urlar-playwright-'));

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chromium',
    headless: false,
    args: [
      `--disable-extensions-except=${root}`,
      `--load-extension=${root}`,
    ],
  });

  const wake = await context.newPage();
  await wake.goto(`${FIXTURE_ORIGIN}/`, { waitUntil: 'domcontentloaded' });

  const worker = await waitForExtensionServiceWorker(context, 45_000);
  const extensionId = parseExtensionIdFromWorkerUrl(worker.url);
  if (!extensionId) {
    await context.close();
    throw new Error(`Could not parse extension id from: ${worker.url}`);
  }

  await wake.close();

  return { context, extensionId, userDataDir };
}

export function dashboardUrl(extensionId: string): string {
  return `chrome-extension://${extensionId}/dashboard/dashboard.html`;
}

export function sidepanelUrl(extensionId: string): string {
  return `chrome-extension://${extensionId}/sidepanel/sidepanel.html`;
}
