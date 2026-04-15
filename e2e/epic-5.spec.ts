import { test, expect } from '@playwright/test';
import { dashboardUrl, sidepanelUrl, launchExtensionContext } from './extension-helpers';

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

test('Epic 5.1: dashboard shows Global (N) and Individual (M) counts', async () => {
  const dash = await context.newPage();
  await dash.goto(dashboardUrl(extensionId));
  await expect(dash.locator('[data-global-section-heading]')).toHaveText('Global (0)', {
    timeout: 10_000,
  });
  await expect(dash.locator('[data-individual-section-heading]')).toHaveText('Individual (0)', {
    timeout: 10_000,
  });
  await expect(dash.locator('[data-browse-layout]')).toBeVisible();
  await dash.close();
});

test('Epic 5.2: side panel lists mirror dashboard headings', async () => {
  const panel = await context.newPage();
  await panel.goto(sidepanelUrl(extensionId));
  await expect(panel.locator('[data-global-section-heading]')).toHaveText('Global (0)', {
    timeout: 10_000,
  });
  await expect(panel.locator('[data-individual-section-heading]')).toHaveText('Individual (0)', {
    timeout: 10_000,
  });
  await expect(panel.locator('[data-browse-layout]')).toBeVisible();
  await panel.close();
});

test('Epic 5.3: cross-surface — dashboard offers Open side panel; side panel offers Open full dashboard', async () => {
  const dash = await context.newPage();
  await dash.goto(dashboardUrl(extensionId));
  await expect(dash.locator('[data-open-side-panel]')).toBeVisible();
  await expect(dash.locator('[data-open-dashboard-tab]')).toBeHidden();
  await dash.close();

  const panel = await context.newPage();
  await panel.goto(sidepanelUrl(extensionId));
  await expect(panel.locator('[data-open-dashboard-tab]')).toBeVisible();
  await expect(panel.locator('[data-open-side-panel]')).toBeHidden();
  await panel.close();
});
